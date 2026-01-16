import { z } from 'zod';

export const UserItemDataSchema = z.object({
  PlaybackPositionTicks: z.number().optional(),
  PlayCount: z.number().optional(),
  IsFavorite: z.boolean().optional(),
  Played: z.boolean().optional(),
  LastPlayedDate: z.string().optional(),
  UnplayedItemCount: z.number().optional(),
  PlayedPercentage: z.number().optional(),
}).passthrough();

export const PersonSchema = z.object({
  Id: z.string().optional(),
  Name: z.string(),
  Role: z.string().optional(),
  Type: z.string().optional(),
  PrimaryImageTag: z.string().optional(),
}).passthrough();

export const StudioSchema = z.object({
  Id: z.string().optional(),
  Name: z.string(),
}).passthrough();

export const ChapterInfoSchema = z.object({
  StartPositionTicks: z.number(),
  Name: z.string().optional(),
  ImageTag: z.string().optional(),
}).passthrough();

export const MediaStreamSchema = z.object({
  Type: z.string(),
  Index: z.number(),
  Codec: z.string().optional(),
  Language: z.string().optional(),
  DisplayTitle: z.string().optional(),
  IsDefault: z.boolean().optional(),
  IsForced: z.boolean().optional(),
  IsExternal: z.boolean().optional(),
  Height: z.number().optional(),
  Width: z.number().optional(),
  Channels: z.number().optional(),
  BitRate: z.number().optional(),
}).passthrough();

export const MediaSourceSchema = z.object({
  Id: z.string(),
  Name: z.string().optional(),
  Container: z.string().optional(),
  Size: z.number().optional(),
  Bitrate: z.number().optional(),
  MediaStreams: z.array(MediaStreamSchema).optional(),
  SupportsDirectPlay: z.boolean().optional(),
  SupportsDirectStream: z.boolean().optional(),
  SupportsTranscoding: z.boolean().optional(),
  DefaultAudioStreamIndex: z.number().optional(),
  DefaultSubtitleStreamIndex: z.number().optional(),
}).passthrough();

export const ProviderIdsSchema = z.object({
  Tmdb: z.string().optional(),
  Imdb: z.string().optional(),
  Tvdb: z.string().optional(),
}).passthrough();

export const BaseItemSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  Type: z.string(),
  ServerId: z.string(),
}).extend({
  SortName: z.string().optional(),
  OriginalTitle: z.string().optional(),
  Overview: z.string().optional(),
  Taglines: z.array(z.string()).optional(),
  ProductionYear: z.number().optional(),
  CommunityRating: z.number().optional(),
  CriticRating: z.number().optional(),
  OfficialRating: z.string().optional(),
  RunTimeTicks: z.number().optional(),
  PremiereDate: z.string().optional(),
  EndDate: z.string().optional(),
  ChannelId: z.string().optional(),
  IsFolder: z.boolean().optional(),
  ParentId: z.string().optional(),
  ImageTags: z.record(z.string(), z.string()).optional(),
  BackdropImageTags: z.array(z.string()).optional(),
  UserData: UserItemDataSchema.optional(),
  MediaSources: z.array(MediaSourceSchema).optional(),
  Genres: z.array(z.string()).optional(),
  Tags: z.array(z.string()).optional(),
  People: z.array(PersonSchema).optional(),
  Studios: z.array(StudioSchema).optional(),
  SeriesId: z.string().optional(),
  SeriesName: z.string().optional(),
  SeasonId: z.string().optional(),
  SeasonName: z.string().optional(),
  IndexNumber: z.number().optional(),
  ParentIndexNumber: z.number().optional(),
  AirsBeforeSeasonNumber: z.number().optional(),
  AirsBeforeEpisodeNumber: z.number().optional(),
  Chapters: z.array(ChapterInfoSchema).optional(),
  Container: z.string().optional(),
  ProviderIds: ProviderIdsSchema.optional(),
  AlbumId: z.string().optional(),
  AlbumArtist: z.string().optional(),
  AlbumArtists: z.array(z.object({ Id: z.string(), Name: z.string() }).passthrough()).optional(),
  Artists: z.array(z.string()).optional(),
  ArtistItems: z.array(z.object({ Id: z.string(), Name: z.string() }).passthrough()).optional(),
  ChildCount: z.number().optional(),
  RecursiveItemCount: z.number().optional(),
  Status: z.string().optional(),
  AirDays: z.array(z.string()).optional(),
  AirTime: z.string().optional(),
}).passthrough();

export const ItemsResponseSchema = z.object({
  Items: z.array(BaseItemSchema),
  TotalRecordCount: z.number(),
  StartIndex: z.number(),
});

export type ValidatedBaseItem = z.infer<typeof BaseItemSchema>;
export type ValidatedItemsResponse = z.infer<typeof ItemsResponseSchema>;
export type ValidatedUserItemData = z.infer<typeof UserItemDataSchema>;
export type ValidatedMediaSource = z.infer<typeof MediaSourceSchema>;
