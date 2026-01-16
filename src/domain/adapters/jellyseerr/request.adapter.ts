import type {
  ValidatedJellyseerrMediaRequest,
  ValidatedJellyseerrDiscoverItem,
  ValidatedJellyseerrDiscoverResult,
  ValidatedJellyseerrRequestsResponse,
} from '@/domain/schemas/jellyseerr';
import type {
  MediaRequest,
  RequestStatus,
  RequestedMedia,
  RequestUser,
  MediaAvailability,
  SeasonRequest,
  DiscoverItem,
  DiscoverResult,
  RequestsResult,
  MediaRequestType,
} from '@/domain/models';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

function mapRequestStatus(status: number): RequestStatus {
  switch (status) {
    case 1: return 'pending';
    case 2: return 'approved';
    case 3: return 'declined';
    case 4: return 'available';
    case 5: return 'partially_available';
    default: return 'pending';
  }
}

function mapMediaAvailability(status: number): MediaAvailability {
  switch (status) {
    case 1: return 'unknown';
    case 2: return 'pending';
    case 3: return 'processing';
    case 4: return 'partially_available';
    case 5: return 'available';
    default: return 'unknown';
  }
}

function adaptRequestUser(raw: {
  id: number;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  permissions: number;
}): RequestUser {
  return {
    id: raw.id,
    email: raw.email,
    username: raw.username,
    displayName: raw.displayName,
    avatar: raw.avatar,
    permissions: raw.permissions,
  };
}

function adaptRequestedMedia(raw: {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  imdbId?: string;
  status: number;
  status4k: number;
  title?: string;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
  releaseDate?: string;
  firstAirDate?: string;
}): RequestedMedia {
  return {
    id: raw.id,
    tmdbId: raw.tmdbId,
    tvdbId: raw.tvdbId,
    imdbId: raw.imdbId,
    title: raw.title,
    posterPath: raw.posterPath ? `${TMDB_IMAGE_BASE}/w500${raw.posterPath}` : undefined,
    backdropPath: raw.backdropPath ? `${TMDB_IMAGE_BASE}/w1280${raw.backdropPath}` : undefined,
    overview: raw.overview,
    releaseDate: raw.releaseDate ?? raw.firstAirDate,
    status: mapMediaAvailability(raw.status),
    status4k: mapMediaAvailability(raw.status4k),
  };
}

function adaptSeasonRequest(raw: { id: number; seasonNumber: number; status: number }): SeasonRequest {
  return {
    id: raw.id,
    seasonNumber: raw.seasonNumber,
    status: mapRequestStatus(raw.status),
  };
}

export function adaptJellyseerrRequest(raw: ValidatedJellyseerrMediaRequest): MediaRequest {
  return {
    id: raw.id,
    status: mapRequestStatus(raw.status),
    type: raw.type,
    is4k: raw.is4k,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    media: adaptRequestedMedia(raw.media),
    requestedBy: adaptRequestUser(raw.requestedBy),
    modifiedBy: raw.modifiedBy ? adaptRequestUser(raw.modifiedBy) : undefined,
    seasons: raw.seasons?.map(adaptSeasonRequest),
  };
}

export function adaptJellyseerrRequests(items: ValidatedJellyseerrMediaRequest[]): MediaRequest[] {
  return items.map(adaptJellyseerrRequest);
}

export function adaptJellyseerrRequestsResponse(raw: ValidatedJellyseerrRequestsResponse): RequestsResult {
  return {
    items: adaptJellyseerrRequests(raw.results),
    page: raw.pageInfo.page,
    totalPages: raw.pageInfo.pages,
    totalResults: raw.pageInfo.results,
  };
}

export function adaptJellyseerrDiscoverItem(raw: ValidatedJellyseerrDiscoverItem): DiscoverItem {
  const isTV = raw.mediaType === 'tv';
  const title = isTV ? (raw.name ?? raw.originalName ?? '') : (raw.title ?? raw.originalTitle ?? '');
  const releaseDate = isTV ? raw.firstAirDate : raw.releaseDate;

  return {
    id: raw.id,
    type: raw.mediaType as MediaRequestType,
    title,
    originalTitle: isTV ? raw.originalName : raw.originalTitle,
    overview: raw.overview,
    posterPath: raw.posterPath ? `${TMDB_IMAGE_BASE}/w500${raw.posterPath}` : undefined,
    backdropPath: raw.backdropPath ? `${TMDB_IMAGE_BASE}/w1280${raw.backdropPath}` : undefined,
    releaseDate,
    year: releaseDate ? parseInt(releaseDate.split('-')[0], 10) : undefined,
    rating: raw.voteAverage,
    voteCount: raw.voteCount,
    genreIds: raw.genreIds,
    popularity: raw.popularity,
    mediaInfo: raw.mediaInfo ? adaptRequestedMedia(raw.mediaInfo) : undefined,
  };
}

export function adaptJellyseerrDiscoverItems(items: ValidatedJellyseerrDiscoverItem[]): DiscoverItem[] {
  return items.map(adaptJellyseerrDiscoverItem);
}

export function adaptJellyseerrDiscoverResult(raw: ValidatedJellyseerrDiscoverResult): DiscoverResult {
  return {
    items: adaptJellyseerrDiscoverItems(raw.results),
    page: raw.page,
    totalPages: raw.totalPages,
    totalResults: raw.totalResults,
  };
}
