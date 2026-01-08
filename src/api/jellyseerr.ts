import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  JellyseerrUser,
  JellyseerrMediaRequest,
  JellyseerrDiscoverResult,
  JellyseerrSearchResult,
  JellyseerrMovieDetails,
  JellyseerrTvDetails,
  JellyseerrRequestBody,
  JellyseerrAuthResponse,
  JellyseerrRequestsResponse,
} from '@/types/jellyseerr';
import { apiCache } from '@/utils';

// Cache TTLs
const CACHE_TTL = {
  discover: 5 * 60 * 1000,    // 5 minutes for discovery/trending
  details: 10 * 60 * 1000,    // 10 minutes for movie/tv details
  search: 2 * 60 * 1000,      // 2 minutes for search results
  requests: 30 * 1000,        // 30 seconds for requests (changes frequently)
  genres: 30 * 60 * 1000,     // 30 minutes for genres (rarely changes)
};

export type JellyseerrAuthMethod = 'apikey' | 'jellyfin' | 'local';

interface JellyseerrConfig {
  serverUrl: string;
  authMethod: JellyseerrAuthMethod;
  apiKey?: string;
  jellyfinUserId?: string;
  jellyfinAuthToken?: string;
  jellyfinServerUrl?: string;
}

class JellyseerrClient {
  private api: AxiosInstance | null = null;
  private config: JellyseerrConfig | null = null;
  private isAuthenticated = false;

  /**
   * Initialize the client with server URL and optional API key
   */
  initialize(serverUrl: string, apiKey?: string): void {
    const cleanUrl = serverUrl.replace(/\/$/, '');
    this.config = {
      serverUrl: cleanUrl,
      authMethod: apiKey ? 'apikey' : 'local',
      apiKey,
    };

    this.api = axios.create({
      baseURL: `${cleanUrl}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-Api-Key': apiKey }),
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.isAuthenticated = false;
        }
        return Promise.reject(error);
      }
    );

    if (apiKey) {
      this.isAuthenticated = true;
    }
  }

  /**
   * Initialize with Jellyfin credentials for seamless auth
   */
  async initializeWithJellyfin(
    jellyseerrUrl: string,
    jellyfinServerUrl: string,
    jellyfinUsername: string,
    jellyfinAuthToken: string
  ): Promise<JellyseerrAuthResponse> {
    const cleanUrl = jellyseerrUrl.replace(/\/$/, '');
    const cleanJellyfinUrl = jellyfinServerUrl.replace(/\/$/, '');

    this.config = {
      serverUrl: cleanUrl,
      authMethod: 'jellyfin',
      jellyfinUserId: jellyfinUsername,
      jellyfinAuthToken,
      jellyfinServerUrl: cleanJellyfinUrl,
    };

    this.api = axios.create({
      baseURL: `${cleanUrl}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Authenticate with Jellyfin credentials - Jellyseerr expects username, not user ID
    const response = await this.api.post<JellyseerrAuthResponse>('/auth/jellyfin', {
      username: jellyfinUsername,
      password: '',
      hostname: cleanJellyfinUrl,
      authToken: jellyfinAuthToken,
    });

    this.isAuthenticated = true;
    return response.data;
  }

  /**
   * Set API key for authentication
   */
  setApiKey(apiKey: string): void {
    if (this.api && this.config) {
      this.api.defaults.headers['X-Api-Key'] = apiKey;
      this.config.apiKey = apiKey;
      this.config.authMethod = 'apikey';
      this.isAuthenticated = true;
    }
  }

  /**
   * Clear authentication
   */
  clearAuth(): void {
    if (this.api) {
      delete this.api.defaults.headers['X-Api-Key'];
      delete this.api.defaults.headers.Cookie;
    }
    this.isAuthenticated = false;
    this.config = null;
    this.api = null;
  }

  isInitialized(): boolean {
    return this.api !== null;
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  getServerUrl(): string | null {
    return this.config?.serverUrl ?? null;
  }

  /**
   * Get TMDB image URL
   */
  getImageUrl(
    path: string | undefined | null,
    size: 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original' = 'w500'
  ): string | null {
    if (!path) return null;
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  /**
   * Test connection to the server
   */
  async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
    if (!this.api) {
      return { ok: false, error: 'Client not initialized' };
    }
    try {
      const response = await this.api.get('/status');
      return { ok: true, version: response.data?.version };
    } catch (error) {
      const axiosError = error as AxiosError;
      return {
        ok: false,
        error: axiosError.message || 'Connection failed',
      };
    }
  }

  /**
   * Login with email/password
   */
  async login(email: string, password: string): Promise<JellyseerrAuthResponse> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrAuthResponse>('/auth/local', {
      email,
      password,
    });
    this.isAuthenticated = true;
    return response.data;
  }

  /**
   * Get current user info
   */
  async getCurrentUser(): Promise<JellyseerrUser> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrUser>('/auth/me');
    return response.data;
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    try {
      await this.api.post('/auth/logout');
    } finally {
      this.isAuthenticated = false;
    }
  }

  // ==================== Discovery ====================

  async getDiscoverMovies(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:discover:movies:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies', {
      params: { page },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  async getDiscoverTv(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:discover:tv:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/tv', {
      params: { page },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  async getTrending(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:trending:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/trending', {
      params: { page },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  async getPopularMovies(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:popular:movies:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies', {
      params: { page, sortBy: 'popularity.desc' },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  async getPopularTv(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:popular:tv:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/tv', {
      params: { page, sortBy: 'popularity.desc' },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  async getUpcomingMovies(page = 1, skipCache = false): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:upcoming:movies:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies/upcoming', {
      params: { page },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  // ==================== Search ====================

  async search(query: string, page = 1): Promise<JellyseerrSearchResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrSearchResult>('/search', {
      params: { query, page },
    });
    return response.data;
  }

  async searchMovies(query: string, page = 1): Promise<JellyseerrSearchResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrSearchResult>('/search', {
      params: { query, page, type: 'movie' },
    });
    return response.data;
  }

  async searchTv(query: string, page = 1): Promise<JellyseerrSearchResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrSearchResult>('/search', {
      params: { query, page, type: 'tv' },
    });
    return response.data;
  }

  // ==================== Details ====================

  async getMovieDetails(tmdbId: number, skipCache = false): Promise<JellyseerrMovieDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:movie:${tmdbId}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrMovieDetails>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrMovieDetails>(`/movie/${tmdbId}`);
    apiCache.set(cacheKey, response.data, CACHE_TTL.details);
    return response.data;
  }

  async getTvDetails(tmdbId: number, skipCache = false): Promise<JellyseerrTvDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:tv:${tmdbId}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrTvDetails>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrTvDetails>(`/tv/${tmdbId}`);
    apiCache.set(cacheKey, response.data, CACHE_TTL.details);
    return response.data;
  }

  // ==================== Requests ====================

  async getRequests(
    params: {
      take?: number;
      skip?: number;
      filter?: 'all' | 'approved' | 'pending' | 'available' | 'processing' | 'unavailable' | 'failed';
      sort?: 'added' | 'modified';
      requestedBy?: number;
    } = {}
  ): Promise<JellyseerrRequestsResponse> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrRequestsResponse>('/request', {
      params: { take: 20, ...params },
    });
    return response.data;
  }

  async getRequest(requestId: number): Promise<JellyseerrMediaRequest> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrMediaRequest>(`/request/${requestId}`);
    return response.data;
  }

  async createRequest(body: JellyseerrRequestBody): Promise<JellyseerrMediaRequest> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrMediaRequest>('/request', body);
    return response.data;
  }

  async approveRequest(requestId: number): Promise<JellyseerrMediaRequest> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrMediaRequest>(`/request/${requestId}/approve`);
    return response.data;
  }

  async declineRequest(requestId: number): Promise<void> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    await this.api.post(`/request/${requestId}/decline`);
  }

  async deleteRequest(requestId: number): Promise<void> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    await this.api.delete(`/request/${requestId}`);
  }

  // ==================== Genres ====================

  async getMovieGenres(skipCache = false): Promise<{ id: number; name: string }[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = 'jellyseerr:genres:movie';
    if (!skipCache) {
      const cached = apiCache.get<{ id: number; name: string }[]>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<{ id: number; name: string }[]>('/discover/genreslider/movie');
    apiCache.set(cacheKey, response.data, CACHE_TTL.genres);
    return response.data;
  }

  async getTvGenres(skipCache = false): Promise<{ id: number; name: string }[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = 'jellyseerr:genres:tv';
    if (!skipCache) {
      const cached = apiCache.get<{ id: number; name: string }[]>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<{ id: number; name: string }[]>('/discover/genreslider/tv');
    apiCache.set(cacheKey, response.data, CACHE_TTL.genres);
    return response.data;
  }

  async discoverByGenre(
    mediaType: 'movie' | 'tv',
    genreId: number,
    page = 1,
    skipCache = false
  ): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:genre:${mediaType}:${genreId}:${page}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrDiscoverResult>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrDiscoverResult>(`/discover/${mediaType}/genre/${genreId}`, {
      params: { page },
    });
    apiCache.set(cacheKey, response.data, CACHE_TTL.discover);
    return response.data;
  }

  invalidateCache(): void {
    apiCache.invalidatePattern('^jellyseerr:');
  }
}

export const jellyseerrClient = new JellyseerrClient();
