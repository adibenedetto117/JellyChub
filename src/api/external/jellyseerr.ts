import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
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
  JellyseerrRatings,
  JellyseerrUsersResponse,
  JellyseerrUserDetails,
  JellyseerrCreateUserBody,
  JellyseerrUpdateUserBody,
  JellyseerrJellyfinUser,
  JellyseerrSeasonDetails,
  JellyseerrServerStatus,
  JellyseerrAboutInfo,
  JellyseerrMainSettings,
  JellyseerrCacheStats,
  JellyseerrJob,
  JellyseerrJellyfinSettings,
  JellyseerrSyncStatus,
} from '@/types/jellyseerr';
import { apiCache } from '@/utils';
import { useSettingsStore, useAuthStore } from '@/stores';

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
  jellyfinServerUrl?: string;
  sessionCookie?: string;
}

class JellyseerrClient {
  private api: AxiosInstance | null = null;
  private config: JellyseerrConfig | null = null;
  private isAuthenticated = false;

  /** Add custom headers interceptor to the axios instance */
  private addCustomHeadersInterceptor(): void {
    if (!this.api) return;
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const useCustomHeaders = useSettingsStore.getState().jellyseerrUseCustomHeaders;
      if (useCustomHeaders) {
        const authState = useAuthStore.getState();
        const server = authState.servers.find((s) => s.id === authState.activeServerId);
        if (server?.customHeaders) {
          Object.entries(server.customHeaders).forEach(([name, value]) => {
            if (name && value && config.headers) {
              config.headers[name] = value;
            }
          });
        }
      }
      return config;
    });
  }

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
      withCredentials: true, // Enable cookie persistence for session auth
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

    // Add request interceptor for custom headers
    this.addCustomHeadersInterceptor();

    if (apiKey) {
      this.isAuthenticated = true;
    }
  }

  /**
   * Initialize with Jellyfin credentials for auth
   * Note: Jellyseerr requires username + password for Jellyfin auth.
   * It does NOT support token-based auth like Plex does.
   *
   * IMPORTANT: Jellyseerr has two modes for /auth/jellyfin:
   * 1. Initial setup: hostname is required to link the Jellyfin server
   * 2. Authentication on already-configured server: hostname must NOT be sent
   *    (sending hostname when server is already configured causes
   *    "Jellyfin hostname already configured" error)
   *
   * This method tries authentication without hostname first, and if that fails
   * with "No hostname provided", it retries with hostname for initial setup.
   */
  async initializeWithJellyfin(
    jellyseerrUrl: string,
    jellyfinServerUrl: string,
    jellyfinUsername: string,
    jellyfinPassword: string
  ): Promise<JellyseerrAuthResponse> {
    const cleanUrl = jellyseerrUrl.replace(/\/$/, '');
    const cleanJellyfinUrl = jellyfinServerUrl.replace(/\/$/, '');

    // Comprehensive debug logging
    console.log('='.repeat(60));
    console.log('[Jellyseerr] JELLYFIN AUTH ATTEMPT - DEBUG INFO');
    console.log('='.repeat(60));
    console.log('[Jellyseerr] Jellyseerr URL:', cleanUrl);
    console.log('[Jellyseerr] Jellyfin server URL (hostname param):', cleanJellyfinUrl);
    console.log('[Jellyseerr] Username:', jellyfinUsername);
    console.log('[Jellyseerr] Password provided:', jellyfinPassword ? `yes (${jellyfinPassword.length} chars)` : 'NO PASSWORD');

    this.config = {
      serverUrl: cleanUrl,
      authMethod: 'jellyfin',
      jellyfinUserId: jellyfinUsername,
      jellyfinServerUrl: cleanJellyfinUrl,
    };

    const fullEndpoint = `${cleanUrl}/api/v1/auth/jellyfin`;

    // Helper function to make the auth request
    const makeAuthRequest = async (includeHostname: boolean): Promise<{ response: Response; responseText: string }> => {
      // Build request payload - only include hostname if needed for initial setup
      const requestPayload: { username: string; password: string; hostname?: string } = {
        username: jellyfinUsername,
        password: jellyfinPassword,
      };

      if (includeHostname) {
        requestPayload.hostname = cleanJellyfinUrl;
      }

      console.log('[Jellyseerr] Full endpoint URL:', fullEndpoint);
      console.log('[Jellyseerr] Request payload:', JSON.stringify({
        username: requestPayload.username,
        password: '***REDACTED***',
        ...(includeHostname ? { hostname: requestPayload.hostname } : {}),
      }, null, 2));
      console.log('[Jellyseerr] Making fetch request (includeHostname:', includeHostname, ')...');

      const response = await fetch(fullEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestPayload),
        credentials: 'include', // Include cookies
      });

      console.log('[Jellyseerr] Response status:', response.status, response.statusText);
      const responseText = await response.text();
      console.log('[Jellyseerr] Raw response body:', responseText);

      return { response, responseText };
    };

    let response: Response;
    let responseData: any;

    try {
      // First try WITHOUT hostname - this works when Jellyfin is already configured in Jellyseerr
      let result = await makeAuthRequest(false);
      response = result.response;
      let responseText = result.responseText;

      // Check if we got "No hostname provided" error - this means server isn't configured yet
      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = JSON.parse(responseText);
        } catch {
          // Not JSON
        }

        const errorMessage = errorData?.message || responseText || '';

        // If server isn't configured, retry WITH hostname for initial setup
        if (errorMessage.toLowerCase().includes('no hostname provided')) {
          console.log('[Jellyseerr] Server not configured yet, retrying with hostname for initial setup...');
          result = await makeAuthRequest(true);
          response = result.response;
          responseText = result.responseText;
        }
      }

      console.log('[Jellyseerr] Response headers:');
      response.headers.forEach((value, key) => {
        console.log(`[Jellyseerr]   ${key}: ${value}`);
      });

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.log('[Jellyseerr] Parsed error:', errorData);
        } catch {
          // Response wasn't JSON
          errorMessage = responseText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      try {
        responseData = JSON.parse(responseText);
        console.log('[Jellyseerr] Parsed response data:', JSON.stringify(responseData, null, 2));
      } catch (parseError) {
        console.error('[Jellyseerr] Failed to parse response as JSON:', parseError);
        throw new Error('Invalid JSON response from server');
      }
    } catch (fetchError: any) {
      console.error('[Jellyseerr] Fetch error:', fetchError);
      console.error('[Jellyseerr] Error name:', fetchError?.name);
      console.error('[Jellyseerr] Error message:', fetchError?.message);
      console.error('[Jellyseerr] Error stack:', fetchError?.stack);
      throw fetchError;
    }

    // Now set up axios for subsequent API calls
    this.api = axios.create({
      baseURL: `${cleanUrl}/api/v1`,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.api.interceptors.response.use(
      (r) => r,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.isAuthenticated = false;
        }
        return Promise.reject(error);
      }
    );

    // Add request interceptor for custom headers
    this.addCustomHeadersInterceptor();

    // Try to extract session cookie from response
    const setCookie = response.headers.get('set-cookie');
    console.log('[Jellyseerr] set-cookie header:', setCookie);

    if (setCookie) {
      // Handle cookie - look for connect.sid
      const cookies = setCookie.split(',').map(c => c.trim());
      console.log('[Jellyseerr] Parsed cookies:', cookies);
      const sessionCookie = cookies.find((c: string) => c.includes('connect.sid'));
      if (sessionCookie) {
        const cookieValue = sessionCookie.split(';')[0];
        console.log('[Jellyseerr] Found session cookie:', cookieValue);
        this.api.defaults.headers.Cookie = cookieValue;
        if (this.config) {
          this.config.sessionCookie = cookieValue;
        }
      } else {
        console.log('[Jellyseerr] No connect.sid cookie found in response');
      }
    } else {
      console.log('[Jellyseerr] No set-cookie header - cookies may be handled by native HTTP stack');
    }

    // Verify authentication worked by checking current user
    console.log('[Jellyseerr] Verifying auth with /auth/me...');
    try {
      const userCheck = await this.api.get<JellyseerrAuthResponse>('/auth/me');
      console.log('[Jellyseerr] /auth/me success:', JSON.stringify(userCheck.data, null, 2));
    } catch (verifyError: any) {
      console.error('[Jellyseerr] /auth/me verification failed:', verifyError?.message);
      console.error('[Jellyseerr] This may be normal if cookies are handled differently');
    }

    this.isAuthenticated = true;
    console.log('[Jellyseerr] Authentication successful!');
    console.log('='.repeat(60));

    // Return the response data along with session cookie for storage
    const result: JellyseerrAuthResponse = {
      ...responseData,
      sessionCookie: this.config?.sessionCookie,
    };
    return result;
  }

  /**
   * Initialize with a stored session cookie (for restoring previous session)
   */
  initializeWithSession(serverUrl: string, sessionCookie: string): void {
    const cleanUrl = serverUrl.replace(/\/$/, '');

    console.log('[Jellyseerr] Restoring session with cookie');

    this.config = {
      serverUrl: cleanUrl,
      authMethod: 'jellyfin',
      sessionCookie,
    };

    this.api = axios.create({
      baseURL: `${cleanUrl}/api/v1`,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
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

    // Add request interceptor for custom headers
    this.addCustomHeadersInterceptor();

    this.isAuthenticated = true;
  }

  /**
   * Get the current session cookie (for storage)
   */
  getSessionCookie(): string | undefined {
    return this.config?.sessionCookie;
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

    // Store the auth cookie from response if available
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const sessionCookie = setCookie.find((c: string) => c.startsWith('connect.sid'));
      if (sessionCookie) {
        const cookieValue = sessionCookie.split(';')[0];
        this.api.defaults.headers.Cookie = cookieValue;
      }
    }

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

  async getMovieRatings(tmdbId: number): Promise<JellyseerrRatings | null> {
    if (!this.api) return null;
    try {
      const response = await this.api.get<JellyseerrRatings>(`/movie/${tmdbId}/ratings`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getTvRatings(tmdbId: number): Promise<JellyseerrRatings | null> {
    if (!this.api) return null;
    try {
      const response = await this.api.get<JellyseerrRatings>(`/tv/${tmdbId}/ratings`);
      return response.data;
    } catch {
      return null;
    }
  }

  async getMovieDetails(tmdbId: number, skipCache = false): Promise<JellyseerrMovieDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:movie:${tmdbId}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrMovieDetails>(cacheKey);
      if (cached) return cached;
    }
    const [detailsResponse, ratings] = await Promise.all([
      this.api.get<JellyseerrMovieDetails>(`/movie/${tmdbId}`),
      this.getMovieRatings(tmdbId),
    ]);
    const result: JellyseerrMovieDetails = {
      ...detailsResponse.data,
      ratings: detailsResponse.data.ratings ?? ratings ?? undefined,
    };
    apiCache.set(cacheKey, result, CACHE_TTL.details);
    return result;
  }

  async getTvDetails(tmdbId: number, skipCache = false): Promise<JellyseerrTvDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:tv:${tmdbId}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrTvDetails>(cacheKey);
      if (cached) return cached;
    }
    const [detailsResponse, ratings] = await Promise.all([
      this.api.get<JellyseerrTvDetails>(`/tv/${tmdbId}`),
      this.getTvRatings(tmdbId),
    ]);
    const result: JellyseerrTvDetails = {
      ...detailsResponse.data,
      ratings: detailsResponse.data.ratings ?? ratings ?? undefined,
    };
    apiCache.set(cacheKey, result, CACHE_TTL.details);
    return result;
  }

  async getSeasonDetails(tmdbId: number, seasonNumber: number, skipCache = false): Promise<JellyseerrSeasonDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const cacheKey = `jellyseerr:tv:${tmdbId}:season:${seasonNumber}`;
    if (!skipCache) {
      const cached = apiCache.get<JellyseerrSeasonDetails>(cacheKey);
      if (cached) return cached;
    }
    const response = await this.api.get<JellyseerrSeasonDetails>(`/tv/${tmdbId}/season/${seasonNumber}`);
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

  async getUsers(
    params: {
      take?: number;
      skip?: number;
      sort?: 'created' | 'updated' | 'requests' | 'displayname';
    } = {}
  ): Promise<JellyseerrUsersResponse> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrUsersResponse>('/user', {
      params: { take: 50, ...params },
    });
    return response.data;
  }

  async getUser(userId: number): Promise<JellyseerrUserDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrUserDetails>(`/user/${userId}`);
    return response.data;
  }

  async createUser(body: JellyseerrCreateUserBody): Promise<JellyseerrUserDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrUserDetails>('/user', body);
    return response.data;
  }

  async updateUser(userId: number, body: JellyseerrUpdateUserBody): Promise<JellyseerrUserDetails> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.put<JellyseerrUserDetails>(`/user/${userId}`, body);
    return response.data;
  }

  async deleteUser(userId: number): Promise<void> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    await this.api.delete(`/user/${userId}`);
  }

  async getJellyfinUsers(): Promise<JellyseerrJellyfinUser[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrJellyfinUser[]>('/settings/jellyfin/users');
    return response.data;
  }

  async importUsersFromJellyfin(jellyfinUserIds: string[]): Promise<JellyseerrUserDetails[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrUserDetails[]>('/user/import-from-jellyfin', {
      jellyfinUserIds,
    });
    return response.data;
  }

  async getServerStatus(): Promise<JellyseerrServerStatus> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrServerStatus>('/status');
    return response.data;
  }

  async getAboutInfo(): Promise<JellyseerrAboutInfo> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrAboutInfo>('/settings/about');
    return response.data;
  }

  async getMainSettings(): Promise<JellyseerrMainSettings> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrMainSettings>('/settings/main');
    return response.data;
  }

  async getCacheStats(): Promise<JellyseerrCacheStats> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrCacheStats>('/settings/cache');
    return response.data;
  }

  async flushCache(cacheId: string): Promise<void> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    await this.api.post(`/settings/cache/${cacheId}/flush`);
  }

  async getJobs(): Promise<JellyseerrJob[]> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrJob[]>('/settings/jobs');
    return response.data;
  }

  async runJob(jobId: string): Promise<JellyseerrJob> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrJob>(`/settings/jobs/${jobId}/run`);
    return response.data;
  }

  async cancelJob(jobId: string): Promise<JellyseerrJob> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrJob>(`/settings/jobs/${jobId}/cancel`);
    return response.data;
  }

  async getJellyfinSettings(): Promise<JellyseerrJellyfinSettings> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrJellyfinSettings>('/settings/jellyfin');
    return response.data;
  }

  async getJellyfinSyncStatus(): Promise<JellyseerrSyncStatus> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.get<JellyseerrSyncStatus>('/settings/jellyfin/sync');
    return response.data;
  }

  async startJellyfinSync(): Promise<JellyseerrSyncStatus> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrSyncStatus>('/settings/jellyfin/sync');
    return response.data;
  }

  async cancelJellyfinSync(): Promise<JellyseerrSyncStatus> {
    if (!this.api) throw new Error('Jellyseerr client not initialized');
    const response = await this.api.post<JellyseerrSyncStatus>('/settings/jellyfin/sync', { cancel: true });
    return response.data;
  }
}

export const jellyseerrClient = new JellyseerrClient();
