export interface JellyseerrUser {
  id: number;
  email: string;
  username?: string;
  displayName?: string;
  plexToken?: string;
  jellyfinUserId?: string;
  jellyfinUsername?: string;
  permissions: number;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  requestCount: number;
}

export interface JellyseerrMediaRequest {
  id: number;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  type: 'movie' | 'tv';
  is4k: boolean;
  serverId?: number;
  profileId?: number;
  rootFolder?: string;
  languageProfileId?: number;
  tags?: number[];
  media: JellyseerrMedia;
  requestedBy: JellyseerrUser;
  modifiedBy?: JellyseerrUser;
  seasons?: JellyseerrSeasonRequest[];
}

export type RequestStatus = 1 | 2 | 3 | 4 | 5;

export const REQUEST_STATUS = {
  PENDING: 1,
  APPROVED: 2,
  DECLINED: 3,
  AVAILABLE: 4,
  PARTIALLY_AVAILABLE: 5,
} as const;

export interface JellyseerrMedia {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  imdbId?: string;
  status: MediaStatus;
  status4k: MediaStatus;
  mediaType: 'movie' | 'tv';
  externalServiceId?: number;
  externalServiceSlug?: string;
  ratingKey?: string;
  title?: string;
  originalTitle?: string;
  overview?: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  firstAirDate?: string;
  voteAverage?: number;
  voteCount?: number;
}

export type MediaStatus = 1 | 2 | 3 | 4 | 5;

export const MEDIA_STATUS = {
  UNKNOWN: 1,
  PENDING: 2,
  PROCESSING: 3,
  PARTIALLY_AVAILABLE: 4,
  AVAILABLE: 5,
} as const;

export interface JellyseerrSeasonRequest {
  id: number;
  seasonNumber: number;
  status: RequestStatus;
}

export interface JellyseerrDiscoverResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: JellyseerrDiscoverItem[];
}

export interface JellyseerrDiscoverItem {
  id: number;
  mediaType: 'movie' | 'tv';
  popularity: number;
  posterPath?: string;
  backdropPath?: string;
  voteCount: number;
  voteAverage: number;
  genreIds: number[];
  overview: string;
  originalLanguage: string;
  title?: string;
  originalTitle?: string;
  releaseDate?: string;
  name?: string;
  originalName?: string;
  firstAirDate?: string;
  mediaInfo?: JellyseerrMedia;
}

export interface JellyseerrSearchResult {
  page: number;
  totalPages: number;
  totalResults: number;
  results: JellyseerrDiscoverItem[];
}

export interface JellyseerrMovieDetails {
  id: number;
  imdbId?: string;
  adult: boolean;
  backdropPath?: string;
  posterPath?: string;
  budget: number;
  genres: { id: number; name: string }[];
  homepage?: string;
  originalLanguage: string;
  originalTitle: string;
  overview?: string;
  popularity: number;
  releaseDate?: string;
  revenue: number;
  runtime?: number;
  status: string;
  tagline?: string;
  title: string;
  video: boolean;
  voteAverage: number;
  voteCount: number;
  mediaInfo?: JellyseerrMedia;
}

export interface JellyseerrTvDetails {
  id: number;
  backdropPath?: string;
  posterPath?: string;
  createdBy: { id: number; name: string }[];
  episodeRunTime: number[];
  firstAirDate?: string;
  genres: { id: number; name: string }[];
  homepage?: string;
  inProduction: boolean;
  languages: string[];
  lastAirDate?: string;
  name: string;
  numberOfEpisodes: number;
  numberOfSeasons: number;
  originCountry: string[];
  originalLanguage: string;
  originalName: string;
  overview?: string;
  popularity: number;
  status: string;
  tagline?: string;
  type: string;
  voteAverage: number;
  voteCount: number;
  seasons: JellyseerrSeason[];
  mediaInfo?: JellyseerrMedia;
}

export interface JellyseerrSeason {
  id: number;
  airDate?: string;
  episodeCount: number;
  name: string;
  overview?: string;
  posterPath?: string;
  seasonNumber: number;
}

export interface JellyseerrAuthResponse {
  id: number;
  email: string;
  username: string;
  permissions: number;
  avatar?: string;
  sessionCookie?: string; // Session cookie for Jellyfin auth (added by client)
}

export interface JellyseerrRequestBody {
  mediaType: 'movie' | 'tv';
  mediaId: number;
  is4k?: boolean;
  serverId?: number;
  profileId?: number;
  rootFolder?: string;
  languageProfileId?: number;
  seasons?: number[];
}

export interface JellyseerrRequestsResponse {
  pageInfo: {
    pages: number;
    page: number;
    results: number;
  };
  results: JellyseerrMediaRequest[];
}

export const JELLYSEERR_PERMISSIONS = {
  NONE: 0,
  ADMIN: 2,
  MANAGE_SETTINGS: 4,
  MANAGE_USERS: 8,
  MANAGE_REQUESTS: 16,
  REQUEST: 32,
  VOTE: 64,
  AUTO_APPROVE: 128,
  AUTO_APPROVE_MOVIE: 256,
  AUTO_APPROVE_TV: 512,
  REQUEST_4K: 1024,
  REQUEST_4K_MOVIE: 2048,
  REQUEST_4K_TV: 4096,
  REQUEST_ADVANCED: 8192,
  REQUEST_VIEW: 16384,
  AUTO_APPROVE_4K: 32768,
  AUTO_APPROVE_4K_MOVIE: 65536,
  AUTO_APPROVE_4K_TV: 131072,
  REQUEST_MOVIE: 262144,
  REQUEST_TV: 524288,
  MANAGE_ISSUES: 1048576,
  VIEW_ISSUES: 2097152,
  CREATE_ISSUES: 4194304,
  AUTO_REQUEST: 8388608,
  AUTO_REQUEST_MOVIE: 16777216,
  AUTO_REQUEST_TV: 33554432,
  RECENT_VIEW: 67108864,
  WATCHLIST_VIEW: 134217728,
} as const;

export function hasPermission(userPermissions: number, permission: number): boolean {
  return (
    (userPermissions & permission) === permission ||
    (userPermissions & JELLYSEERR_PERMISSIONS.ADMIN) === JELLYSEERR_PERMISSIONS.ADMIN
  );
}

export function getRequestStatusLabel(status: RequestStatus): string {
  switch (status) {
    case REQUEST_STATUS.PENDING:
      return 'Pending';
    case REQUEST_STATUS.APPROVED:
      return 'Approved';
    case REQUEST_STATUS.DECLINED:
      return 'Declined';
    case REQUEST_STATUS.AVAILABLE:
      return 'Available';
    case REQUEST_STATUS.PARTIALLY_AVAILABLE:
      return 'Partially Available';
    default:
      return 'Unknown';
  }
}

export function getMediaStatusLabel(status: MediaStatus): string {
  switch (status) {
    case MEDIA_STATUS.UNKNOWN:
      return 'Not Available';
    case MEDIA_STATUS.PENDING:
      return 'Pending';
    case MEDIA_STATUS.PROCESSING:
      return 'Processing';
    case MEDIA_STATUS.PARTIALLY_AVAILABLE:
      return 'Partially Available';
    case MEDIA_STATUS.AVAILABLE:
      return 'Available';
    default:
      return 'Unknown';
  }
}
