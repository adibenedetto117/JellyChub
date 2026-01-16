import type {
  ValidatedSonarrSeries,
  ValidatedSonarrQueueItem,
  ValidatedSonarrQueueResponse,
  ValidatedSonarrRootFolder,
  ValidatedSonarrQualityProfile,
} from '@/domain/schemas/sonarr';
import type {
  ManagedSeries,
  ManagedSeason,
  ManagedMediaImage,
  DownloadQueueItem,
  DownloadQueueResult,
  DownloadStatus,
  RootFolder,
  QualityProfile,
} from '@/domain/models';

function mapSeriesStatus(status: string, ended: boolean): ManagedSeries['status'] {
  if (ended) return 'ended';
  if (status === 'continuing') return 'continuing';
  if (status === 'upcoming') return 'upcoming';
  return 'continuing';
}

function mapImageType(coverType: string): ManagedMediaImage['type'] {
  switch (coverType) {
    case 'poster': return 'poster';
    case 'fanart': return 'fanart';
    case 'banner': return 'banner';
    default: return 'poster';
  }
}

function adaptImages(images: Array<{ coverType: string; url: string; remoteUrl?: string }>): ManagedMediaImage[] {
  return images.map(img => ({
    type: mapImageType(img.coverType),
    url: img.url,
    remoteUrl: img.remoteUrl,
  }));
}

function adaptSeason(season: {
  seasonNumber: number;
  monitored: boolean;
  statistics?: {
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
}): ManagedSeason {
  return {
    seasonNumber: season.seasonNumber,
    monitored: season.monitored,
    episodeCount: season.statistics?.episodeCount ?? 0,
    episodeFileCount: season.statistics?.episodeFileCount ?? 0,
    percentComplete: season.statistics?.percentOfEpisodes ?? 0,
    sizeOnDisk: season.statistics?.sizeOnDisk ?? 0,
  };
}

export function adaptSonarrSeries(raw: ValidatedSonarrSeries): ManagedSeries {
  return {
    id: raw.id,
    title: raw.title,
    sortTitle: raw.sortTitle,
    year: raw.year,
    overview: raw.overview,
    monitored: raw.monitored,
    hasFile: raw.statistics.episodeFileCount > 0,
    sizeOnDisk: raw.statistics.sizeOnDisk,
    path: raw.path,
    qualityProfileId: raw.qualityProfileId,
    images: adaptImages(raw.images),
    genres: raw.genres,
    externalIds: {
      tvdbId: raw.tvdbId,
      imdbId: raw.imdbId,
    },
    source: {
      provider: 'sonarr',
      id: raw.id,
    },
    status: mapSeriesStatus(raw.status, raw.ended),
    network: raw.network,
    airTime: raw.airTime,
    seriesType: raw.seriesType,
    seasonCount: raw.statistics.seasonCount,
    episodeCount: raw.statistics.episodeCount,
    episodeFileCount: raw.statistics.episodeFileCount,
    percentComplete: raw.statistics.percentOfEpisodes,
    seasons: raw.seasons.map(adaptSeason),
  };
}

export function adaptSonarrSeriesList(items: ValidatedSonarrSeries[]): ManagedSeries[] {
  return items.map(adaptSonarrSeries);
}

function mapDownloadStatus(status: string, trackedDownloadState?: string): DownloadStatus {
  if (trackedDownloadState === 'importPending') return 'completed';
  if (trackedDownloadState === 'downloading') return 'downloading';
  if (status === 'warning') return 'warning';
  if (status === 'failed') return 'failed';
  if (status === 'paused') return 'paused';
  if (status === 'completed') return 'completed';
  return 'queued';
}

export function adaptSonarrQueueItem(raw: ValidatedSonarrQueueItem): DownloadQueueItem {
  const progress = raw.size > 0 ? ((raw.size - raw.sizeleft) / raw.size) * 100 : 0;

  return {
    id: raw.id,
    title: raw.title,
    status: mapDownloadStatus(raw.status, raw.trackedDownloadState),
    protocol: raw.protocol === 'usenet' ? 'usenet' : 'torrent',
    size: raw.size,
    sizeRemaining: raw.sizeleft,
    progress,
    timeRemaining: raw.timeleft,
    estimatedCompletionTime: raw.estimatedCompletionTime,
    quality: raw.quality.quality.name,
    indexer: raw.indexer,
    downloadClient: raw.downloadClient,
    errorMessage: raw.errorMessage,
    warnings: raw.statusMessages?.flatMap(m => m.messages),
    mediaInfo: {
      type: 'episode',
      mediaId: raw.episodeId,
      title: raw.episode?.title ?? raw.title,
      seriesId: raw.seriesId,
      seriesTitle: raw.series?.title,
      seasonNumber: raw.episode?.seasonNumber,
      episodeNumber: raw.episode?.episodeNumber,
      tvdbId: raw.series?.tvdbId,
      imdbId: raw.series?.imdbId,
    },
    source: {
      provider: 'sonarr',
      itemId: raw.id,
    },
  };
}

export function adaptSonarrQueueResponse(raw: ValidatedSonarrQueueResponse): DownloadQueueResult {
  return {
    items: raw.records.map(adaptSonarrQueueItem),
    page: raw.page,
    pageSize: raw.pageSize,
    totalRecords: raw.totalRecords,
  };
}

export function adaptSonarrRootFolder(raw: ValidatedSonarrRootFolder): RootFolder {
  return {
    id: raw.id,
    path: raw.path,
    freeSpace: raw.freeSpace,
    accessible: raw.accessible,
  };
}

export function adaptSonarrRootFolders(items: ValidatedSonarrRootFolder[]): RootFolder[] {
  return items.map(adaptSonarrRootFolder);
}

export function adaptSonarrQualityProfile(raw: ValidatedSonarrQualityProfile): QualityProfile {
  return {
    id: raw.id,
    name: raw.name,
    upgradeAllowed: raw.upgradeAllowed,
  };
}

export function adaptSonarrQualityProfiles(items: ValidatedSonarrQualityProfile[]): QualityProfile[] {
  return items.map(adaptSonarrQualityProfile);
}
