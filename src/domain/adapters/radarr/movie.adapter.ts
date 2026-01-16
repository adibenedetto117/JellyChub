import type {
  ValidatedRadarrMovie,
  ValidatedRadarrQueueItem,
  ValidatedRadarrQueueResponse,
  ValidatedRadarrRootFolder,
  ValidatedRadarrQualityProfile,
} from '@/domain/schemas/radarr';
import type {
  ManagedMovie,
  ManagedMediaImage,
  DownloadQueueItem,
  DownloadQueueResult,
  DownloadStatus,
  RootFolder,
  QualityProfile,
} from '@/domain/models';

function mapMovieStatus(status: string): ManagedMovie['status'] {
  switch (status) {
    case 'announced': return 'announced';
    case 'inCinemas': return 'inCinemas';
    case 'released': return 'released';
    case 'deleted': return 'deleted';
    default: return 'released';
  }
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

export function adaptRadarrMovie(raw: ValidatedRadarrMovie): ManagedMovie {
  return {
    id: raw.id,
    title: raw.title,
    sortTitle: raw.sortTitle,
    year: raw.year,
    overview: raw.overview,
    monitored: raw.monitored,
    hasFile: raw.hasFile,
    sizeOnDisk: raw.sizeOnDisk,
    path: raw.path,
    qualityProfileId: raw.qualityProfileId,
    images: adaptImages(raw.images),
    genres: raw.genres,
    externalIds: {
      tmdbId: raw.tmdbId,
      imdbId: raw.imdbId,
    },
    source: {
      provider: 'radarr',
      id: raw.id,
    },
    runtime: raw.runtime,
    status: mapMovieStatus(raw.status),
    isAvailable: raw.isAvailable,
  };
}

export function adaptRadarrMovieList(items: ValidatedRadarrMovie[]): ManagedMovie[] {
  return items.map(adaptRadarrMovie);
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

export function adaptRadarrQueueItem(raw: ValidatedRadarrQueueItem): DownloadQueueItem {
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
      type: 'movie',
      mediaId: raw.movieId,
      title: raw.movie?.title ?? raw.title,
      tmdbId: raw.movie?.tmdbId,
      imdbId: raw.movie?.imdbId,
    },
    source: {
      provider: 'radarr',
      itemId: raw.id,
    },
  };
}

export function adaptRadarrQueueResponse(raw: ValidatedRadarrQueueResponse): DownloadQueueResult {
  return {
    items: raw.records.map(adaptRadarrQueueItem),
    page: raw.page,
    pageSize: raw.pageSize,
    totalRecords: raw.totalRecords,
  };
}

export function adaptRadarrRootFolder(raw: ValidatedRadarrRootFolder): RootFolder {
  return {
    id: raw.id,
    path: raw.path,
    freeSpace: raw.freeSpace,
    accessible: raw.accessible,
  };
}

export function adaptRadarrRootFolders(items: ValidatedRadarrRootFolder[]): RootFolder[] {
  return items.map(adaptRadarrRootFolder);
}

export function adaptRadarrQualityProfile(raw: ValidatedRadarrQualityProfile): QualityProfile {
  return {
    id: raw.id,
    name: raw.name,
    upgradeAllowed: raw.upgradeAllowed,
  };
}

export function adaptRadarrQualityProfiles(items: ValidatedRadarrQualityProfile[]): QualityProfile[] {
  return items.map(adaptRadarrQualityProfile);
}
