// Jellyfin API Types

export interface JellyfinServer {
  id: string;
  name: string;
  url: string;
  userId?: string;
  accessToken?: string;
  isDefault: boolean;
}

export interface JellyfinUser {
  Id: string;
  Name: string;
  ServerId: string;
  PrimaryImageTag?: string;
  HasPassword: boolean;
  HasConfiguredPassword: boolean;
  HasConfiguredEasyPassword: boolean;
  EnableAutoLogin: boolean;
}

export interface AuthenticationResult {
  User: JellyfinUser;
  AccessToken: string;
  ServerId: string;
}

export interface QuickConnectResult {
  Secret: string;
  Code: string;
  DateAdded: string;
  Authenticated: boolean;
}

// Media Types
export type MediaType =
  | 'Movie'
  | 'Series'
  | 'Season'
  | 'Episode'
  | 'MusicAlbum'
  | 'MusicArtist'
  | 'Audio'
  | 'Book'
  | 'AudioBook'
  | 'Playlist'
  | 'BoxSet'
  | 'Folder'
  | 'CollectionFolder'
  | 'MusicVideo'
  | 'Video'
  | string;

export interface ChapterInfo {
  StartPositionTicks: number;
  Name?: string;
  ImageTag?: string;
  ImageDateModified?: string;
}

export interface BaseItem {
  Id: string;
  Name: string;
  SortName?: string;
  Type: MediaType;
  ServerId: string;
  Overview?: string;
  ProductionYear?: number;
  CommunityRating?: number;
  OfficialRating?: string;
  RunTimeTicks?: number;
  PremiereDate?: string;
  EndDate?: string;
  ChannelId?: string;
  IsFolder?: boolean;
  ParentId?: string;
  ImageTags?: Record<string, string>;
  BackdropImageTags?: string[];
  UserData?: UserItemData;
  MediaSources?: MediaSource[];
  Genres?: string[];
  Tags?: string[];
  People?: Person[];
  Studios?: Studio[];
  SeriesId?: string;
  SeriesName?: string;
  SeasonId?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  Chapters?: ChapterInfo[];
  Container?: string;
}

export interface Movie extends BaseItem {
  Type: 'Movie';
}

export interface Series extends BaseItem {
  Type: 'Series';
  Status?: string;
  AirDays?: string[];
  AirTime?: string;
}

export interface Episode extends BaseItem {
  Type: 'Episode';
  SeriesId: string;
  SeriesName: string;
  SeasonId: string;
  SeasonName: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  ParentBackdropImageTags?: string[];
  SeriesPrimaryImageTag?: string;
}

export interface MusicAlbum extends BaseItem {
  Type: 'MusicAlbum';
  AlbumArtist?: string;
  AlbumArtists?: ArtistInfo[];
  Artists?: string[];
  ChildCount?: number;
}

export interface AudioTrack extends BaseItem {
  Type: 'Audio';
  AlbumId?: string;
  Album?: string;
  AlbumArtist?: string;
  Artists?: string[];
  IndexNumber?: number;
}

export interface AudioBook extends BaseItem {
  Type: 'AudioBook';
  Album?: string;
  AlbumArtist?: string;
}

export interface Book extends BaseItem {
  Type: 'Book';
}

// Supporting Types
export interface UserItemData {
  PlaybackPositionTicks: number;
  PlayCount: number;
  IsFavorite: boolean;
  Played: boolean;
  LastPlayedDate?: string;
  UnplayedItemCount?: number;
}

export interface MediaSource {
  Id: string;
  Path?: string;
  Protocol: string;
  Type: string;
  Container: string;
  Size?: number;
  Bitrate?: number;
  MediaStreams: MediaStream[];
  SupportsDirectPlay: boolean;
  SupportsDirectStream: boolean;
  SupportsTranscoding: boolean;
  DirectStreamUrl?: string;
}

export interface MediaStream {
  Index: number;
  Type: 'Video' | 'Audio' | 'Subtitle' | 'EmbeddedImage';
  Codec?: string;
  Language?: string;
  Title?: string;
  DisplayTitle?: string;
  IsDefault: boolean;
  IsForced: boolean;
  IsExternal: boolean;
  DeliveryMethod?: 'Encode' | 'Embed' | 'External' | 'Hls' | 'Drop';
  DeliveryUrl?: string;
  Path?: string;
  // Video specific
  Width?: number;
  Height?: number;
  AspectRatio?: string;
  // Audio specific
  Channels?: number;
  SampleRate?: number;
  BitRate?: number;
}

export interface Person {
  Id: string;
  Name: string;
  Role?: string;
  Type: string;
  PrimaryImageTag?: string;
}

export interface Studio {
  Id: string;
  Name: string;
}

export interface ArtistInfo {
  Id: string;
  Name: string;
}

// Library Types
export type CollectionType =
  | 'movies'
  | 'tvshows'
  | 'music'
  | 'musicvideos'
  | 'books'
  | 'audiobooks'
  | 'homevideos'
  | 'boxsets'
  | 'playlists'
  | 'mixed'
  | null
  | undefined;

export interface Library {
  Id: string;
  Name: string;
  CollectionType?: CollectionType;
  ImageTags?: Record<string, string>;
  Type?: string;
  Etag?: string;
}

export interface ItemsResponse<T = BaseItem> {
  Items: T[];
  TotalRecordCount: number;
  StartIndex: number;
}

// Playback Types
export interface PlaybackInfo {
  MediaSources: MediaSource[];
  PlaySessionId: string;
}

export interface PlaybackProgressInfo {
  ItemId: string;
  MediaSourceId: string;
  PositionTicks: number;
  IsPaused: boolean;
  IsMuted: boolean;
  PlaySessionId: string;
  AudioStreamIndex?: number;
  SubtitleStreamIndex?: number;
}

// Search Types
export interface SearchHint {
  Id: string;
  ItemId?: string;
  Name: string;
  Type: MediaType;
  ProductionYear?: number;
  PrimaryImageTag?: string;
  ThumbImageTag?: string;
  ThumbImageItemId?: string;
  BackdropImageTag?: string;
  BackdropImageItemId?: string;
  RunTimeTicks?: number;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  Series?: string;
  SeriesId?: string;
}

export interface SearchResult {
  SearchHints: SearchHint[];
  TotalRecordCount: number;
}

// Image Types
export type ImageType = 'Primary' | 'Art' | 'Backdrop' | 'Banner' | 'Logo' | 'Thumb' | 'Disc' | 'Box' | 'Screenshot' | 'Menu' | 'Chapter' | 'BoxRear' | 'Profile';

export interface ImageOptions {
  type?: ImageType;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  tag?: string;
}
