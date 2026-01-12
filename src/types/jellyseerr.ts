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
  requests?: JellyseerrMediaRequest[];
}

export type MediaStatus = 1 | 2 | 3 | 4 | 5;

export const MEDIA_STATUS = {
  UNKNOWN: 1,
  PENDING: 2,
  PROCESSING: 3,
  PARTIALLY_AVAILABLE: 4,
  AVAILABLE: 5,
} as const;

// TMDB Genre IDs - shared between movies and TV
export const TMDB_GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIENCE_FICTION: 878,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
  // TV-specific genres
  ACTION_ADVENTURE: 10759,
  KIDS: 10762,
  NEWS: 10763,
  REALITY: 10764,
  SCI_FI_FANTASY: 10765,
  SOAP: 10766,
  TALK: 10767,
  WAR_POLITICS: 10768,
} as const;

export const GENRE_LABELS: Record<number, string> = {
  [TMDB_GENRES.ACTION]: 'Action',
  [TMDB_GENRES.ADVENTURE]: 'Adventure',
  [TMDB_GENRES.ANIMATION]: 'Animation',
  [TMDB_GENRES.COMEDY]: 'Comedy',
  [TMDB_GENRES.CRIME]: 'Crime',
  [TMDB_GENRES.DOCUMENTARY]: 'Documentary',
  [TMDB_GENRES.DRAMA]: 'Drama',
  [TMDB_GENRES.FAMILY]: 'Family',
  [TMDB_GENRES.FANTASY]: 'Fantasy',
  [TMDB_GENRES.HISTORY]: 'History',
  [TMDB_GENRES.HORROR]: 'Horror',
  [TMDB_GENRES.MUSIC]: 'Music',
  [TMDB_GENRES.MYSTERY]: 'Mystery',
  [TMDB_GENRES.ROMANCE]: 'Romance',
  [TMDB_GENRES.SCIENCE_FICTION]: 'Sci-Fi',
  [TMDB_GENRES.THRILLER]: 'Thriller',
  [TMDB_GENRES.WAR]: 'War',
  [TMDB_GENRES.WESTERN]: 'Western',
  [TMDB_GENRES.ACTION_ADVENTURE]: 'Action & Adventure',
  [TMDB_GENRES.KIDS]: 'Kids',
  [TMDB_GENRES.NEWS]: 'News',
  [TMDB_GENRES.REALITY]: 'Reality',
  [TMDB_GENRES.SCI_FI_FANTASY]: 'Sci-Fi & Fantasy',
  [TMDB_GENRES.SOAP]: 'Soap',
  [TMDB_GENRES.TALK]: 'Talk',
  [TMDB_GENRES.WAR_POLITICS]: 'War & Politics',
};

// Common genres for filter UI (most popular)
export const COMMON_GENRES = [
  { id: TMDB_GENRES.ACTION, label: 'Action', icon: 'flash' },
  { id: TMDB_GENRES.COMEDY, label: 'Comedy', icon: 'happy' },
  { id: TMDB_GENRES.DRAMA, label: 'Drama', icon: 'heart' },
  { id: TMDB_GENRES.HORROR, label: 'Horror', icon: 'skull' },
  { id: TMDB_GENRES.SCIENCE_FICTION, label: 'Sci-Fi', icon: 'planet' },
  { id: TMDB_GENRES.THRILLER, label: 'Thriller', icon: 'alert-circle' },
  { id: TMDB_GENRES.ROMANCE, label: 'Romance', icon: 'heart-circle' },
  { id: TMDB_GENRES.ANIMATION, label: 'Animation', icon: 'color-palette' },
  { id: TMDB_GENRES.DOCUMENTARY, label: 'Documentary', icon: 'videocam' },
  { id: TMDB_GENRES.FANTASY, label: 'Fantasy', icon: 'sparkles' },
] as const;

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

export interface JellyseerrCastMember {
  id: number;
  castId?: number;
  character: string;
  creditId: string;
  gender?: number;
  name: string;
  order: number;
  profilePath?: string;
}

export interface JellyseerrCrewMember {
  id: number;
  creditId: string;
  department: string;
  gender?: number;
  job: string;
  name: string;
  profilePath?: string;
}

export interface JellyseerrCredits {
  cast: JellyseerrCastMember[];
  crew: JellyseerrCrewMember[];
}

export interface JellyseerrProductionCompany {
  id: number;
  logoPath?: string;
  name: string;
  originCountry?: string;
}

export interface JellyseerrRatings {
  criticsRating?: 'Rotten' | 'Fresh' | 'Certified Fresh';
  criticsScore?: number;
  audienceRating?: 'Spilled' | 'Upright';
  audienceScore?: number;
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
  credits?: JellyseerrCredits;
  productionCompanies?: JellyseerrProductionCompany[];
  ratings?: JellyseerrRatings;
}

export interface JellyseerrNetwork {
  id: number;
  logoPath?: string;
  name: string;
  originCountry?: string;
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
  credits?: JellyseerrCredits;
  networks?: JellyseerrNetwork[];
  productionCompanies?: JellyseerrProductionCompany[];
  ratings?: JellyseerrRatings;
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

export interface JellyseerrEpisode {
  id: number;
  name: string;
  airDate?: string;
  episodeNumber: number;
  overview?: string;
  productionCode?: string;
  seasonNumber: number;
  showId: number;
  stillPath?: string;
  voteAverage?: number;
  voteCount?: number;
}

export interface JellyseerrSeasonDetails {
  id: number;
  airDate?: string;
  episodeCount: number;
  name: string;
  overview?: string;
  posterPath?: string;
  seasonNumber: number;
  episodes: JellyseerrEpisode[];
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

export interface JellyseerrUserDetails extends JellyseerrUser {
  userType: number;
  movieQuotaLimit?: number;
  movieQuotaDays?: number;
  tvQuotaLimit?: number;
  tvQuotaDays?: number;
  requests?: JellyseerrMediaRequest[];
}

export interface JellyseerrUsersResponse {
  pageInfo: {
    pages: number;
    page: number;
    results: number;
  };
  results: JellyseerrUserDetails[];
}

export interface JellyseerrCreateUserBody {
  email: string;
  username?: string;
  permissions?: number;
}

export interface JellyseerrUpdateUserBody {
  displayName?: string;
  email?: string;
  permissions?: number;
  movieQuotaLimit?: number;
  movieQuotaDays?: number;
  tvQuotaLimit?: number;
  tvQuotaDays?: number;
}

export interface JellyseerrJellyfinUser {
  id: string;
  name: string;
  Name?: string;
  username?: string;
  displayName?: string;
}

export const USER_TYPE = {
  PLEX: 1,
  LOCAL: 2,
  JELLYFIN: 3,
  EMBY: 4,
} as const;

export function getUserTypeLabel(userType: number): string {
  switch (userType) {
    case USER_TYPE.PLEX:
      return 'Plex';
    case USER_TYPE.LOCAL:
      return 'Local';
    case USER_TYPE.JELLYFIN:
      return 'Jellyfin';
    case USER_TYPE.EMBY:
      return 'Emby';
    default:
      return 'Unknown';
  }
}

export function getPermissionsList(permissions: number): string[] {
  const list: string[] = [];
  if (permissions & JELLYSEERR_PERMISSIONS.ADMIN) list.push('Admin');
  if (permissions & JELLYSEERR_PERMISSIONS.MANAGE_USERS) list.push('Manage Users');
  if (permissions & JELLYSEERR_PERMISSIONS.MANAGE_REQUESTS) list.push('Manage Requests');
  if (permissions & JELLYSEERR_PERMISSIONS.MANAGE_SETTINGS) list.push('Manage Settings');
  if (permissions & JELLYSEERR_PERMISSIONS.REQUEST) list.push('Request');
  if (permissions & JELLYSEERR_PERMISSIONS.REQUEST_4K) list.push('Request 4K');
  if (permissions & JELLYSEERR_PERMISSIONS.AUTO_APPROVE) list.push('Auto Approve');
  if (permissions & JELLYSEERR_PERMISSIONS.AUTO_APPROVE_4K) list.push('Auto Approve 4K');
  if (permissions & JELLYSEERR_PERMISSIONS.MANAGE_ISSUES) list.push('Manage Issues');
  if (permissions & JELLYSEERR_PERMISSIONS.VIEW_ISSUES) list.push('View Issues');
  if (permissions & JELLYSEERR_PERMISSIONS.CREATE_ISSUES) list.push('Create Issues');
  return list;
}

export interface JellyseerrServerStatus {
  version: string;
  commitTag: string;
  updateAvailable: boolean;
  commitsBehind: number;
}

export interface JellyseerrAboutInfo {
  version: string;
  totalRequests: number;
  totalMediaItems: number;
  tz?: string;
  appDataPath?: string;
}

export interface JellyseerrMainSettings {
  apiKey: string;
  applicationTitle: string;
  applicationUrl: string;
  csrfProtection: boolean;
  cacheImages: boolean;
  defaultPermissions: number;
  defaultQuotas: {
    movie: {
      quotaLimit: number | null;
      quotaDays: number | null;
    };
    tv: {
      quotaLimit: number | null;
      quotaDays: number | null;
    };
  };
  hideAvailable: boolean;
  localLogin: boolean;
  newPlexLogin: boolean;
  region: string;
  originalLanguage: string;
  trustProxy: boolean;
  partialRequestsEnabled: boolean;
  locale: string;
}

export interface JellyseerrCacheStats {
  apiCacheHits: number;
  apiCacheMisses: number;
  imageCache: {
    tmdb: {
      total: number;
      size: number;
    };
  };
}

export interface JellyseerrJob {
  id: string;
  type: 'process' | 'command';
  interval: 'seconds' | 'minutes' | 'hours' | 'fixed';
  cronSchedule: string;
  name: string;
  nextExecutionTime: string;
  running: boolean;
}

export interface JellyseerrLibrary {
  id: string;
  name: string;
  enabled: boolean;
  type: 'movie' | 'show';
  lastScan?: string;
}

export interface JellyseerrJellyfinSettings {
  name: string;
  hostname: string;
  serverId?: string;
  externalHostname?: string;
  libraries: JellyseerrLibrary[];
}

export interface JellyseerrSyncStatus {
  running: boolean;
  progress: number;
  total: number;
  currentLibrary?: JellyseerrLibrary;
}
