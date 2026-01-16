export type RequestStatus = 'pending' | 'approved' | 'declined' | 'available' | 'partially_available';

export type MediaRequestType = 'movie' | 'tv';

export interface MediaRequest {
  id: number;
  status: RequestStatus;
  type: MediaRequestType;
  is4k: boolean;
  createdAt: string;
  updatedAt: string;

  media: RequestedMedia;
  requestedBy: RequestUser;
  modifiedBy?: RequestUser;

  seasons?: SeasonRequest[];
}

export interface RequestedMedia {
  id: number;
  tmdbId: number;
  tvdbId?: number;
  imdbId?: string;
  title?: string;
  posterPath?: string;
  backdropPath?: string;
  overview?: string;
  releaseDate?: string;
  status: MediaAvailability;
  status4k: MediaAvailability;
}

export type MediaAvailability = 'unknown' | 'pending' | 'processing' | 'partially_available' | 'available';

export interface RequestUser {
  id: number;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  permissions: number;
}

export interface SeasonRequest {
  id: number;
  seasonNumber: number;
  status: RequestStatus;
}

export interface DiscoverItem {
  id: number;
  type: MediaRequestType;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath?: string;
  backdropPath?: string;
  releaseDate?: string;
  year?: number;
  rating: number;
  voteCount: number;
  genreIds: number[];
  popularity: number;
  mediaInfo?: RequestedMedia;
}

export interface DiscoverResult {
  items: DiscoverItem[];
  page: number;
  totalPages: number;
  totalResults: number;
}

export interface RequestsResult {
  items: MediaRequest[];
  page: number;
  totalPages: number;
  totalResults: number;
}
