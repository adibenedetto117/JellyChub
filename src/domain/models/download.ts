export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed' | 'warning';

export interface DownloadQueueItem {
  id: number;
  title: string;
  status: DownloadStatus;
  protocol: 'usenet' | 'torrent';

  size: number;
  sizeRemaining: number;
  progress: number;

  timeRemaining?: string;
  estimatedCompletionTime?: string;

  quality: string;
  indexer?: string;
  downloadClient?: string;

  errorMessage?: string;
  warnings?: string[];

  mediaInfo: DownloadMediaInfo;
  source: DownloadSource;
}

export interface DownloadMediaInfo {
  type: 'movie' | 'episode';
  mediaId: number;
  title: string;

  seriesId?: number;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;

  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
}

export interface DownloadSource {
  provider: 'sonarr' | 'radarr';
  itemId: number;
}

export interface DownloadQueueResult {
  items: DownloadQueueItem[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export interface ManagedMedia {
  id: number;
  title: string;
  sortTitle: string;
  year: number;
  overview: string;

  monitored: boolean;
  hasFile: boolean;
  sizeOnDisk: number;

  path?: string;
  qualityProfileId: number;

  images: ManagedMediaImage[];
  genres: string[];

  externalIds: ManagedMediaExternalIds;
  source: ManagedMediaSource;
}

export interface ManagedMediaImage {
  type: 'poster' | 'fanart' | 'banner';
  url: string;
  remoteUrl?: string;
}

export interface ManagedMediaExternalIds {
  tmdbId?: number;
  tvdbId?: number;
  imdbId?: string;
}

export interface ManagedMediaSource {
  provider: 'sonarr' | 'radarr';
  id: number;
}

export interface ManagedSeries extends ManagedMedia {
  status: 'continuing' | 'ended' | 'upcoming';
  network?: string;
  airTime?: string;
  seriesType: 'standard' | 'daily' | 'anime';

  seasonCount: number;
  episodeCount: number;
  episodeFileCount: number;
  percentComplete: number;

  seasons: ManagedSeason[];
}

export interface ManagedSeason {
  seasonNumber: number;
  monitored: boolean;
  episodeCount: number;
  episodeFileCount: number;
  percentComplete: number;
  sizeOnDisk: number;
}

export interface ManagedMovie extends ManagedMedia {
  runtime: number;
  status: 'announced' | 'inCinemas' | 'released' | 'deleted';
  isAvailable: boolean;
}

export interface RootFolder {
  id: number;
  path: string;
  freeSpace: number;
  accessible: boolean;
}

export interface QualityProfile {
  id: number;
  name: string;
  upgradeAllowed: boolean;
}
