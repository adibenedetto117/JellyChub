import { z } from 'zod';

export const RadarrImageSchema = z.object({
  coverType: z.string(),
  url: z.string(),
  remoteUrl: z.string().optional(),
}).passthrough();

export const RadarrRatingsSchema = z.object({
  imdb: z.object({
    value: z.number(),
    votes: z.number(),
  }).optional(),
  tmdb: z.object({
    value: z.number(),
    votes: z.number(),
  }).optional(),
}).passthrough();

export const RadarrMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  originalTitle: z.string(),
  sortTitle: z.string(),
  year: z.number(),
  tmdbId: z.number(),
  imdbId: z.string().optional(),
  overview: z.string(),
  runtime: z.number(),
  hasFile: z.boolean(),
  monitored: z.boolean(),
  isAvailable: z.boolean(),
  folderName: z.string().optional(),
  path: z.string().optional(),
  qualityProfileId: z.number(),
  added: z.string(),
  ratings: RadarrRatingsSchema,
  images: z.array(RadarrImageSchema),
  genres: z.array(z.string()),
  status: z.string(),
  sizeOnDisk: z.number(),
}).passthrough();

export const RadarrQualitySchema = z.object({
  quality: z.object({
    id: z.number(),
    name: z.string(),
  }).passthrough(),
  revision: z.object({
    version: z.number(),
    real: z.number(),
  }).passthrough(),
}).passthrough();

export const RadarrQueueItemSchema = z.object({
  id: z.number(),
  movieId: z.number(),
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
  quality: RadarrQualitySchema,
  size: z.number(),
  sizeleft: z.number(),
  timeleft: z.string().optional(),
  estimatedCompletionTime: z.string().optional(),
  movie: RadarrMovieSchema.optional(),
}).passthrough();

export const RadarrQueueResponseSchema = z.object({
  page: z.number(),
  pageSize: z.number(),
  sortKey: z.string(),
  sortDirection: z.string(),
  totalRecords: z.number(),
  records: z.array(RadarrQueueItemSchema),
});

export const RadarrRootFolderSchema = z.object({
  id: z.number(),
  path: z.string(),
  accessible: z.boolean(),
  freeSpace: z.number(),
}).passthrough();

export const RadarrQualityProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  upgradeAllowed: z.boolean(),
}).passthrough();

export type ValidatedRadarrMovie = z.infer<typeof RadarrMovieSchema>;
export type ValidatedRadarrQueueItem = z.infer<typeof RadarrQueueItemSchema>;
export type ValidatedRadarrQueueResponse = z.infer<typeof RadarrQueueResponseSchema>;
export type ValidatedRadarrRootFolder = z.infer<typeof RadarrRootFolderSchema>;
export type ValidatedRadarrQualityProfile = z.infer<typeof RadarrQualityProfileSchema>;
