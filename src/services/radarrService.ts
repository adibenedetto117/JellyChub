import { useSettingsStore, useAuthStore } from '@/stores';
import { apiCache } from '@/utils';

// Cache TTLs
const CACHE_TTL = {
  movies: 2 * 60 * 1000,       // 2 minutes for movie list
  queue: 30 * 1000,            // 30 seconds for queue
  config: 10 * 60 * 1000,      // 10 minutes for root folders/quality profiles
  calendar: 5 * 60 * 1000,     // 5 minutes for calendar
};

export interface RadarrMovie {
  id: number;
  title: string;
  originalTitle: string;
  sortTitle: string;
  year: number;
  tmdbId: number;
  imdbId?: string;
  overview: string;
  runtime: number;
  hasFile: boolean;
  monitored: boolean;
  isAvailable: boolean;
  folderName?: string;
  path?: string;
  qualityProfileId: number;
  added: string;
  ratings: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
  };
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  genres: string[];
  status: string;
  sizeOnDisk: number;
}

export interface RadarrQueueItem {
  id: number;
  movieId: number;
  title: string;
  status: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  statusMessages?: Array<{ title: string; messages: string[] }>;
  errorMessage?: string;
  downloadId?: string;
  protocol: string;
  downloadClient?: string;
  indexer?: string;
  outputPath?: string;
  quality: {
    quality: {
      id: number;
      name: string;
    };
    revision: { version: number; real: number };
  };
  size: number;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  movie?: RadarrMovie;
}

export interface RadarrQueueResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: RadarrQueueItem[];
}

export interface RadarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{ name: string; path: string }>;
}

export interface RadarrQualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
  cutoff: number;
  items: Array<{
    id: number;
    name: string;
    quality?: { id: number; name: string };
    items?: any[];
    allowed: boolean;
  }>;
}

export interface RadarrLookupResult {
  title: string;
  originalTitle: string;
  sortTitle: string;
  year: number;
  tmdbId: number;
  imdbId?: string;
  overview: string;
  runtime: number;
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  ratings: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
  };
  genres: string[];
  status: string;
  studio?: string;
  remotePoster?: string;
}

export interface RadarrAddMovieOptions {
  tmdbId: number;
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored?: boolean;
  searchForMovie?: boolean;
  minimumAvailability?: 'announced' | 'inCinemas' | 'released' | 'tba';
}

export interface RadarrRelease {
  guid: string;
  quality: {
    quality: {
      id: number;
      name: string;
    };
    revision: { version: number; real: number };
  };
  title: string;
  size: number;
  indexer: string;
  indexerId: number;
  seeders?: number;
  leechers?: number;
  protocol: string;
  age: number;
  ageHours: number;
  ageMinutes: number;
  publishDate: string;
  downloadUrl?: string;
  rejected: boolean;
  rejections?: string[];
}

export interface RadarrCalendarMovie {
  id: number;
  title: string;
  sortTitle: string;
  year: number;
  tmdbId: number;
  imdbId?: string;
  overview: string;
  runtime: number;
  hasFile: boolean;
  monitored: boolean;
  physicalRelease?: string;
  digitalRelease?: string;
  inCinemas?: string;
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  genres: string[];
  ratings: {
    imdb?: { value: number; votes: number };
    tmdb?: { value: number; votes: number };
  };
  status: string;
  grabbed?: boolean;
}

class RadarrService {
  private getBaseUrl(): string | null {
    return useSettingsStore.getState().radarrUrl;
  }

  private getApiKey(): string | null {
    return useSettingsStore.getState().radarrApiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl || !apiKey) {
      throw new Error('Radarr not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/v3${endpoint}`;
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add custom headers from Jellyfin if enabled
    const useCustomHeaders = useSettingsStore.getState().radarrUseCustomHeaders;
    if (useCustomHeaders) {
      const authState = useAuthStore.getState();
      const server = authState.servers.find((s) => s.id === authState.activeServerId);
      if (server?.customHeaders) {
        Object.entries(server.customHeaders).forEach(([name, value]) => {
          if (name && value) headers[name] = value;
        });
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Radarr API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async testConnection(): Promise<{ ok: boolean; version?: string; error?: string }> {
    try {
      const status = await this.request<{ version: string }>('/system/status');
      return { ok: true, version: status.version };
    } catch (error: any) {
      return { ok: false, error: error?.message || 'Connection failed' };
    }
  }

  async getMovies(skipCache = false): Promise<RadarrMovie[]> {
    const cacheKey = 'radarr:movies';
    if (!skipCache) {
      const cached = apiCache.get<RadarrMovie[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<RadarrMovie[]>('/movie');
    apiCache.set(cacheKey, data, CACHE_TTL.movies);
    return data;
  }

  invalidateMoviesCache(): void {
    apiCache.invalidatePattern('^radarr:');
  }

  async getMovieByTmdbId(tmdbId: number): Promise<RadarrMovie | null> {
    const movies = await this.request<RadarrMovie[]>(`/movie?tmdbId=${tmdbId}`);
    return movies.length > 0 ? movies[0] : null;
  }

  async searchMovies(term: string): Promise<RadarrLookupResult[]> {
    return this.request<RadarrLookupResult[]>(`/movie/lookup?term=${encodeURIComponent(term)}`);
  }

  async lookupByTmdbId(tmdbId: number): Promise<RadarrLookupResult | null> {
    const results = await this.request<RadarrLookupResult[]>(`/movie/lookup/tmdb?tmdbId=${tmdbId}`);
    return results.length > 0 ? results[0] : null;
  }

  async getRootFolders(skipCache = false): Promise<RadarrRootFolder[]> {
    const cacheKey = 'radarr:rootfolders';
    if (!skipCache) {
      const cached = apiCache.get<RadarrRootFolder[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<RadarrRootFolder[]>('/rootfolder');
    apiCache.set(cacheKey, data, CACHE_TTL.config);
    return data;
  }

  async getQualityProfiles(skipCache = false): Promise<RadarrQualityProfile[]> {
    const cacheKey = 'radarr:qualityprofiles';
    if (!skipCache) {
      const cached = apiCache.get<RadarrQualityProfile[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<RadarrQualityProfile[]>('/qualityprofile');
    apiCache.set(cacheKey, data, CACHE_TTL.config);
    return data;
  }

  async addMovie(options: RadarrAddMovieOptions): Promise<RadarrMovie> {
    const lookup = await this.lookupByTmdbId(options.tmdbId);
    if (!lookup) {
      throw new Error('Movie not found in lookup');
    }

    const movieData = {
      ...lookup,
      qualityProfileId: options.qualityProfileId,
      rootFolderPath: options.rootFolderPath,
      monitored: options.monitored ?? true,
      minimumAvailability: options.minimumAvailability ?? 'released',
      addOptions: {
        searchForMovie: options.searchForMovie ?? true,
      },
    };

    return this.request<RadarrMovie>('/movie', {
      method: 'POST',
      body: JSON.stringify(movieData),
    });
  }

  async getQueue(page = 1, pageSize = 20, skipCache = false): Promise<RadarrQueueResponse> {
    const cacheKey = `radarr:queue:${page}:${pageSize}`;
    if (!skipCache) {
      const cached = apiCache.get<RadarrQueueResponse>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<RadarrQueueResponse>(
      `/queue?page=${page}&pageSize=${pageSize}&includeMovie=true`
    );
    apiCache.set(cacheKey, data, CACHE_TTL.queue);
    return data;
  }

  async removeFromQueue(id: number, removeFromClient = true, blocklist = false): Promise<void> {
    await this.request(`/queue/${id}?removeFromClient=${removeFromClient}&blocklist=${blocklist}`, {
      method: 'DELETE',
    });
  }

  async triggerMovieSearch(movieId: number): Promise<void> {
    await this.request('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'MoviesSearch',
        movieIds: [movieId],
      }),
    });
  }

  async getMovieDetails(movieId: number): Promise<RadarrMovie> {
    return this.request<RadarrMovie>(`/movie/${movieId}`);
  }

  async toggleMonitored(movieId: number, monitored: boolean): Promise<RadarrMovie> {
    const movie = await this.getMovieDetails(movieId);
    return this.request<RadarrMovie>(`/movie/${movieId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...movie, monitored }),
    });
  }

  async deleteMovie(movieId: number, deleteFiles = false): Promise<void> {
    await this.request(`/movie/${movieId}?deleteFiles=${deleteFiles}`, {
      method: 'DELETE',
    });
  }

  async refreshMovie(movieId: number): Promise<void> {
    await this.request('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshMovie',
        movieIds: [movieId],
      }),
    });
  }

  async manualSearchMovie(movieId: number): Promise<RadarrRelease[]> {
    return this.request<RadarrRelease[]>(`/release?movieId=${movieId}`);
  }

  async downloadRelease(guid: string, indexerId: number): Promise<void> {
    await this.request('/release', {
      method: 'POST',
      body: JSON.stringify({ guid, indexerId }),
    });
  }

  async getCalendar(startDate: string, endDate: string, skipCache = false): Promise<RadarrCalendarMovie[]> {
    const cacheKey = `radarr:calendar:${startDate}:${endDate}`;
    if (!skipCache) {
      const cached = apiCache.get<RadarrCalendarMovie[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<RadarrCalendarMovie[]>(
      `/calendar?start=${startDate}&end=${endDate}&unmonitored=false`
    );
    apiCache.set(cacheKey, data, CACHE_TTL.calendar);
    return data;
  }

  isConfigured(): boolean {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();
    return !!baseUrl && !!apiKey;
  }
}

export const radarrService = new RadarrService();
