import { useSettingsStore } from '@/stores';
import { apiCache } from '@/utils';

// Cache TTLs
const CACHE_TTL = {
  series: 2 * 60 * 1000,      // 2 minutes for series list
  queue: 30 * 1000,           // 30 seconds for queue
  episodes: 5 * 60 * 1000,    // 5 minutes for episodes
  config: 10 * 60 * 1000,     // 10 minutes for root folders/quality profiles
};

export interface SonarrSeries {
  id: number;
  title: string;
  sortTitle: string;
  status: string;
  ended: boolean;
  overview: string;
  network?: string;
  airTime?: string;
  year: number;
  path?: string;
  qualityProfileId: number;
  seasonFolder: boolean;
  monitored: boolean;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings: {
    votes: number;
    value: number;
  };
  statistics: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
      percentOfEpisodes: number;
    };
  }>;
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  seriesType: 'standard' | 'daily' | 'anime';
}

export interface SonarrQueueItem {
  id: number;
  seriesId: number;
  episodeId: number;
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
  series?: SonarrSeries;
  episode?: {
    id: number;
    seriesId: number;
    tvdbId: number;
    episodeNumber: number;
    seasonNumber: number;
    title: string;
    airDate?: string;
    overview?: string;
  };
}

export interface SonarrQueueResponse {
  page: number;
  pageSize: number;
  sortKey: string;
  sortDirection: string;
  totalRecords: number;
  records: SonarrQueueItem[];
}

export interface SonarrRootFolder {
  id: number;
  path: string;
  accessible: boolean;
  freeSpace: number;
  unmappedFolders: Array<{ name: string; path: string }>;
}

export interface SonarrQualityProfile {
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

export interface SonarrLookupResult {
  title: string;
  sortTitle: string;
  status: string;
  ended: boolean;
  overview: string;
  network?: string;
  airTime?: string;
  year: number;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  genres: string[];
  ratings: {
    votes: number;
    value: number;
  };
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
  }>;
  images: Array<{
    coverType: string;
    url: string;
    remoteUrl?: string;
  }>;
  seriesType: 'standard' | 'daily' | 'anime';
  remotePoster?: string;
}

export interface SonarrAddSeriesOptions {
  tvdbId: number;
  title: string;
  qualityProfileId: number;
  rootFolderPath: string;
  monitored?: boolean;
  seasonFolder?: boolean;
  searchForMissingEpisodes?: boolean;
  seriesType?: 'standard' | 'daily' | 'anime';
  monitorNewItems?: 'all' | 'none';
  seasons?: Array<{ seasonNumber: number; monitored: boolean }>;
}

export interface SonarrEpisode {
  id: number;
  seriesId: number;
  tvdbId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDate?: string;
  airDateUtc?: string;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  absoluteEpisodeNumber?: number;
  sceneAbsoluteEpisodeNumber?: number;
  sceneEpisodeNumber?: number;
  sceneSeasonNumber?: number;
  unverifiedSceneNumbering: boolean;
  episodeFileId?: number;
}

export interface SonarrCalendarEpisode {
  id: number;
  seriesId: number;
  tvdbId: number;
  episodeNumber: number;
  seasonNumber: number;
  title: string;
  airDate: string;
  airDateUtc: string;
  overview?: string;
  hasFile: boolean;
  monitored: boolean;
  grabbed: boolean;
  series: SonarrSeries;
}

export interface SonarrRelease {
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
  seriesId?: number;
  episodeId?: number;
  seasonNumber?: number;
  fullSeason: boolean;
}

class SonarrService {
  private getBaseUrl(): string | null {
    return useSettingsStore.getState().sonarrUrl;
  }

  private getApiKey(): string | null {
    return useSettingsStore.getState().sonarrApiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    if (!baseUrl || !apiKey) {
      throw new Error('Sonarr not configured');
    }

    const url = `${baseUrl.replace(/\/$/, '')}/api/v3${endpoint}`;
    const headers: Record<string, string> = {
      'X-Api-Key': apiKey,
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Sonarr API error: ${response.status} - ${error}`);
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

  async getSeries(skipCache = false): Promise<SonarrSeries[]> {
    const cacheKey = 'sonarr:series';
    if (!skipCache) {
      const cached = apiCache.get<SonarrSeries[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrSeries[]>('/series');
    apiCache.set(cacheKey, data, CACHE_TTL.series);
    return data;
  }

  invalidateSeriesCache(): void {
    apiCache.invalidatePattern('^sonarr:');
  }

  async getSeriesByTvdbId(tvdbId: number): Promise<SonarrSeries | null> {
    const series = await this.request<SonarrSeries[]>(`/series?tvdbId=${tvdbId}`);
    return series.length > 0 ? series[0] : null;
  }

  async searchSeries(term: string): Promise<SonarrLookupResult[]> {
    return this.request<SonarrLookupResult[]>(`/series/lookup?term=${encodeURIComponent(term)}`);
  }

  async lookupByTvdbId(tvdbId: number): Promise<SonarrLookupResult | null> {
    const results = await this.request<SonarrLookupResult[]>(`/series/lookup?term=tvdb:${tvdbId}`);
    return results.length > 0 ? results[0] : null;
  }

  async getRootFolders(skipCache = false): Promise<SonarrRootFolder[]> {
    const cacheKey = 'sonarr:rootfolders';
    if (!skipCache) {
      const cached = apiCache.get<SonarrRootFolder[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrRootFolder[]>('/rootfolder');
    apiCache.set(cacheKey, data, CACHE_TTL.config);
    return data;
  }

  async getQualityProfiles(skipCache = false): Promise<SonarrQualityProfile[]> {
    const cacheKey = 'sonarr:qualityprofiles';
    if (!skipCache) {
      const cached = apiCache.get<SonarrQualityProfile[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrQualityProfile[]>('/qualityprofile');
    apiCache.set(cacheKey, data, CACHE_TTL.config);
    return data;
  }

  async addSeries(options: SonarrAddSeriesOptions): Promise<SonarrSeries> {
    const lookup = await this.lookupByTvdbId(options.tvdbId);
    if (!lookup) {
      throw new Error('Series not found in lookup');
    }

    const seasons = options.seasons || lookup.seasons.map((s) => ({
      seasonNumber: s.seasonNumber,
      monitored: options.monitored ?? true,
    }));

    const seriesData = {
      ...lookup,
      qualityProfileId: options.qualityProfileId,
      rootFolderPath: options.rootFolderPath,
      monitored: options.monitored ?? true,
      seasonFolder: options.seasonFolder ?? true,
      seriesType: options.seriesType ?? lookup.seriesType ?? 'standard',
      monitorNewItems: options.monitorNewItems ?? 'all',
      seasons,
      addOptions: {
        searchForMissingEpisodes: options.searchForMissingEpisodes ?? true,
      },
    };

    return this.request<SonarrSeries>('/series', {
      method: 'POST',
      body: JSON.stringify(seriesData),
    });
  }

  async getQueue(page = 1, pageSize = 20, skipCache = false): Promise<SonarrQueueResponse> {
    const cacheKey = `sonarr:queue:${page}:${pageSize}`;
    if (!skipCache) {
      const cached = apiCache.get<SonarrQueueResponse>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrQueueResponse>(
      `/queue?page=${page}&pageSize=${pageSize}&includeSeries=true&includeEpisode=true`
    );
    apiCache.set(cacheKey, data, CACHE_TTL.queue);
    return data;
  }

  async removeFromQueue(id: number, removeFromClient = true, blocklist = false): Promise<void> {
    await this.request(`/queue/${id}?removeFromClient=${removeFromClient}&blocklist=${blocklist}`, {
      method: 'DELETE',
    });
  }

  async triggerSeriesSearch(seriesId: number): Promise<void> {
    await this.request('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'SeriesSearch',
        seriesId: seriesId,
      }),
    });
  }

  async getSeriesDetails(seriesId: number): Promise<SonarrSeries> {
    return this.request<SonarrSeries>(`/series/${seriesId}`);
  }

  async toggleSeriesMonitored(seriesId: number, monitored: boolean): Promise<SonarrSeries> {
    const series = await this.getSeriesDetails(seriesId);
    return this.request<SonarrSeries>(`/series/${seriesId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...series, monitored }),
    });
  }

  async toggleSeasonMonitored(seriesId: number, seasonNumber: number, monitored: boolean): Promise<SonarrSeries> {
    const series = await this.getSeriesDetails(seriesId);
    const updatedSeasons = series.seasons.map((season) =>
      season.seasonNumber === seasonNumber ? { ...season, monitored } : season
    );
    return this.request<SonarrSeries>(`/series/${seriesId}`, {
      method: 'PUT',
      body: JSON.stringify({ ...series, seasons: updatedSeasons }),
    });
  }

  async deleteSeries(seriesId: number, deleteFiles = false): Promise<void> {
    await this.request(`/series/${seriesId}?deleteFiles=${deleteFiles}`, {
      method: 'DELETE',
    });
  }

  async refreshSeries(seriesId: number): Promise<void> {
    await this.request('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'RefreshSeries',
        seriesId,
      }),
    });
  }

  async getEpisodes(seriesId: number, skipCache = false): Promise<SonarrEpisode[]> {
    const cacheKey = `sonarr:episodes:${seriesId}`;
    if (!skipCache) {
      const cached = apiCache.get<SonarrEpisode[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrEpisode[]>(`/episode?seriesId=${seriesId}`);
    apiCache.set(cacheKey, data, CACHE_TTL.episodes);
    return data;
  }

  async getCalendar(startDate: string, endDate: string, skipCache = false): Promise<SonarrCalendarEpisode[]> {
    const cacheKey = `sonarr:calendar:${startDate}:${endDate}`;
    if (!skipCache) {
      const cached = apiCache.get<SonarrCalendarEpisode[]>(cacheKey);
      if (cached) return cached;
    }
    const data = await this.request<SonarrCalendarEpisode[]>(
      `/calendar?start=${startDate}&end=${endDate}&includeSeries=true&includeEpisodeFile=true`
    );
    apiCache.set(cacheKey, data, CACHE_TTL.episodes);
    return data;
  }

  async searchEpisode(episodeId: number): Promise<void> {
    await this.request('/command', {
      method: 'POST',
      body: JSON.stringify({
        name: 'EpisodeSearch',
        episodeIds: [episodeId],
      }),
    });
  }

  async manualSearchSeries(seriesId: number): Promise<SonarrRelease[]> {
    return this.request<SonarrRelease[]>(`/release?seriesId=${seriesId}`);
  }

  async manualSearchSeason(seriesId: number, seasonNumber: number): Promise<SonarrRelease[]> {
    return this.request<SonarrRelease[]>(`/release?seriesId=${seriesId}&seasonNumber=${seasonNumber}`);
  }

  async downloadRelease(guid: string, indexerId: number): Promise<void> {
    await this.request('/release', {
      method: 'POST',
      body: JSON.stringify({ guid, indexerId }),
    });
  }

  isConfigured(): boolean {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();
    return !!baseUrl && !!apiKey;
  }
}

export const sonarrService = new SonarrService();
