export type MediaType =
  | 'movie'
  | 'series'
  | 'season'
  | 'episode'
  | 'album'
  | 'track'
  | 'artist'
  | 'book'
  | 'audiobook'
  | 'playlist'
  | 'collection'
  | 'channel'
  | 'program';

export type MediaProvider = 'jellyfin' | 'jellyseerr' | 'sonarr' | 'radarr';

export interface MediaImages {
  primary?: string;
  backdrop?: string;
  thumb?: string;
  logo?: string;
  banner?: string;
}

export interface UserMediaStatus {
  isFavorite: boolean;
  isPlayed: boolean;
  playCount: number;
  playbackPositionMs: number;
  playbackPercent: number;
  lastPlayedAt?: string;
  unplayedCount?: number;
}

export interface ExternalIds {
  jellyfin?: string;
  tmdb?: string;
  imdb?: string;
  tvdb?: string;
  jellyseerr?: number;
  sonarr?: number;
  radarr?: number;
}

export interface MediaSource {
  provider: MediaProvider;
  serverId: string;
  originalId: string;
}

export interface Person {
  id: string;
  name: string;
  role?: string;
  type: 'actor' | 'director' | 'writer' | 'producer' | 'composer' | 'other';
  imageUrl?: string;
}

export interface SeriesInfo {
  seriesId: string;
  seriesName: string;
  seasonCount?: number;
  episodeCount?: number;
  status?: 'continuing' | 'ended' | 'upcoming';
  airDays?: string[];
  airTime?: string;
  network?: string;
}

export interface SeasonInfo {
  seriesId: string;
  seriesName: string;
  seasonNumber: number;
  episodeCount?: number;
}

export interface EpisodeInfo {
  seriesId: string;
  seriesName: string;
  seasonId: string;
  seasonNumber: number;
  episodeNumber: number;
  absoluteNumber?: number;
  airDate?: string;
}

export interface MusicInfo {
  albumId?: string;
  albumName?: string;
  artistIds: string[];
  artistNames: string[];
  trackNumber?: number;
  discNumber?: number;
}

export interface ChapterInfo {
  name?: string;
  startMs: number;
  imageUrl?: string;
}

export interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  sortTitle?: string;
  originalTitle?: string;
  overview?: string;
  tagline?: string;
  year?: number;
  rating?: number;
  criticRating?: number;
  officialRating?: string;
  durationMs?: number;
  premiereDate?: string;
  endDate?: string;

  images: MediaImages;
  userStatus: UserMediaStatus;

  seriesInfo?: SeriesInfo;
  seasonInfo?: SeasonInfo;
  episodeInfo?: EpisodeInfo;
  musicInfo?: MusicInfo;

  genres: string[];
  tags: string[];
  people: Person[];
  studios: string[];
  chapters: ChapterInfo[];

  externalIds: ExternalIds;
  source: MediaSource;

  parentId?: string;
  childCount?: number;
  recursiveChildCount?: number;

  container?: string;
  videoCodec?: string;
  audioCodec?: string;
  resolution?: string;
}

export interface MediaItemsResult {
  items: MediaItem[];
  total: number;
  startIndex: number;
}

export const DEFAULT_USER_STATUS: UserMediaStatus = {
  isFavorite: false,
  isPlayed: false,
  playCount: 0,
  playbackPositionMs: 0,
  playbackPercent: 0,
};

export const DEFAULT_IMAGES: MediaImages = {};

export const DEFAULT_EXTERNAL_IDS: ExternalIds = {};
