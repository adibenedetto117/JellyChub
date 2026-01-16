import { z } from 'zod';

export const SonarrImageSchema = z.object({
  coverType: z.string(),
  url: z.string(),
  remoteUrl: z.string().optional(),
}).passthrough();

export const SonarrSeasonStatisticsSchema = z.object({
  episodeFileCount: z.number(),
  episodeCount: z.number(),
  totalEpisodeCount: z.number(),
  sizeOnDisk: z.number(),
  percentOfEpisodes: z.number(),
}).passthrough();

export const SonarrSeasonSchema = z.object({
  seasonNumber: z.number(),
  monitored: z.boolean(),
  statistics: SonarrSeasonStatisticsSchema.optional(),
}).passthrough();

export const SonarrStatisticsSchema = z.object({
  seasonCount: z.number(),
  episodeFileCount: z.number(),
  episodeCount: z.number(),
  totalEpisodeCount: z.number(),
  sizeOnDisk: z.number(),
  percentOfEpisodes: z.number(),
}).passthrough();

export const SonarrSeriesSchema = z.object({
  id: z.number(),
  title: z.string(),
  sortTitle: z.string(),
  status: z.string(),
  ended: z.boolean(),
  overview: z.string(),
  network: z.string().optional(),
  airTime: z.string().optional(),
  year: z.number(),
  path: z.string().optional(),
  qualityProfileId: z.number(),
  seasonFolder: z.boolean(),
  monitored: z.boolean(),
  tvdbId: z.number(),
  tvRageId: z.number().optional(),
  tvMazeId: z.number().optional(),
  imdbId: z.string().optional(),
  genres: z.array(z.string()),
  tags: z.array(z.number()),
  added: z.string(),
  ratings: z.object({
    votes: z.number(),
    value: z.number(),
  }).passthrough(),
  statistics: SonarrStatisticsSchema,
  seasons: z.array(SonarrSeasonSchema),
  images: z.array(SonarrImageSchema),
  seriesType: z.enum(['standard', 'daily', 'anime']),
}).passthrough();

export const SonarrQualitySchema = z.object({
  quality: z.object({
    id: z.number(),
    name: z.string(),
  }).passthrough(),
  revision: z.object({
    version: z.number(),
    real: z.number(),
  }).passthrough(),
}).passthrough();

export const SonarrQueueItemSchema = z.object({
  id: z.number(),
  seriesId: z.number(),
  episodeId: z.number(),
  title: z.string(),
  status: z.string(),
  trackedDownloadStatus: z.string().optional(),
  trackedDownloadState: z.string().optional(),
  statusMessages: z.array(z.object({
    title: z.string(),
    messages: z.array(z.string()),
  })).optional(),
  errorMessage: z.string().optional(),
  downloadId: z.string().optional(),
  protocol: z.string(),
  downloadClient: z.string().optional(),
  indexer: z.string().optional(),
  outputPath: z.string().optional(),
  quality: SonarrQualitySchema,
  size: z.number(),
  sizeleft: z.number(),
  timeleft: z.string().optional(),
  estimatedCompletionTime: z.string().optional(),
  series: SonarrSeriesSchema.optional(),
  episode: z.object({
    id: z.number(),
    seriesId: z.number(),
    tvdbId: z.number(),
    episodeNumber: z.number(),
    seasonNumber: z.number(),
    title: z.string(),
    airDate: z.string().optional(),
    overview: z.string().optional(),
  }).passthrough().optional(),
}).passthrough();

export const SonarrQueueResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  sortKey: z.string(),
  sortDirection: z.string(),
  totalRecords: z.number(),
  records: z.array(SonarrQueueItemSchema),
});

export const SonarrRootFolderSchema = z.object({
  id: z.number(),
  path: z.string(),
  accessible: z.boolean(),
  freeSpace: z.number(),
}).passthrough();

export const SonarrQualityProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  upgradeAllowed: z.boolean(),
}).passthrough();

export type ValidatedSonarrSeries = z.infer<typeof SonarrSeriesSchema>;
export type ValidatedSonarrQueueItem = z.infer<typeof SonarrQueueItemSchema>;
export type ValidatedSonarrQueueResponse = z.infer<typeof SonarrQueueResponseSchema>;
export type ValidatedSonarrRootFolder = z.infer<typeof SonarrRootFolderSchema>;
export type ValidatedSonarrQualityProfile = z.infer<typeof SonarrQualityProfileSchema>;
