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
    jellyfinUserId: string,
    jellyfinAuthToken: string
  ): Promise<JellyseerrAuthResponse> {
    const cleanUrl = jellyseerrUrl.replace(/\/$/, '');

    this.config = {
      serverUrl: cleanUrl,
      authMethod: 'jellyfin',
      jellyfinUserId,
      jellyfinAuthToken,
      jellyfinServerUrl,
    };

    this.api = axios.create({
      baseURL: `${cleanUrl}/api/v1`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Authenticate with Jellyfin credentials
    const response = await this.api.post<JellyseerrAuthResponse>('/auth/jellyfin', {
      username: jellyfinUserId,
      password: '', // Not needed for token auth
      hostname: jellyfinServerUrl,
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

  async getDiscoverMovies(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies', {
      params: { page },
    });
    return response.data;
  }

  async getDiscoverTv(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/tv', {
      params: { page },
    });
    return response.data;
  }

  async getTrending(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/trending', {
      params: { page },
    });
    return response.data;
  }

  async getPopularMovies(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies', {
      params: { page, sortBy: 'popularity.desc' },
    });
    return response.data;
  }

  async getPopularTv(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/tv', {
      params: { page, sortBy: 'popularity.desc' },
    });
    return response.data;
  }

  async getUpcomingMovies(page = 1): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>('/discover/movies/upcoming', {
      params: { page },
    });
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

  async getMovieDetails(tmdbId: number): Promise<JellyseerrMovieDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrMovieDetails>(`/movie/${tmdbId}`);
    return response.data;
  }

  async getTvDetails(tmdbId: number): Promise<JellyseerrTvDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrTvDetails>(`/tv/${tmdbId}`);
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

  async getMovieGenres(): Promise<{ id: number; name: string }[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<{ id: number; name: string }[]>('/discover/genreslider/movie');
    return response.data;
  }

  async getTvGenres(): Promise<{ id: number; name: string }[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<{ id: number; name: string }[]>('/discover/genreslider/tv');
    return response.data;
  }

  async discoverByGenre(
    mediaType: 'movie' | 'tv',
    genreId: number,
    page = 1
  ): Promise<JellyseerrDiscoverResult> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrDiscoverResult>(`/discover/${mediaType}/genre/${genreId}`, {
      params: { page },
    });
    return response.data;
  }
}

export const jellyseerrClient = new JellyseerrClient();
