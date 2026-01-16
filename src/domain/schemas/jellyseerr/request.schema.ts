import { z } from 'zod';

export const JellyseerrUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  username: z.string().optional(),
  displayName: z.string().optional(),
  avatar: z.string().optional(),
  permissions: z.number(),
}).passthrough();

export const JellyseerrMediaSchema = z.object({
  id: z.number(),
  tmdbId: z.number(),
  tvdbId: z.number().optional(),
  imdbId: z.string().optional(),
  status: z.number(),
  status4k: z.number(),
  mediaType: z.enum(['movie', 'tv']),
  title: z.string().optional(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  overview: z.string().optional(),
  releaseDate: z.string().optional(),
  firstAirDate: z.string().optional(),
}).passthrough();

export const JellyseerrSeasonRequestSchema = z.object({
  id: z.number(),
  seasonNumber: z.number(),
  status: z.number(),
}).passthrough();

export const JellyseerrMediaRequestSchema = z.object({
  id: z.number(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  type: z.enum(['movie', 'tv']),
  is4k: z.boolean(),
  media: JellyseerrMediaSchema,
  requestedBy: JellyseerrUserSchema,
  modifiedBy: JellyseerrUserSchema.optional(),
  seasons: z.array(JellyseerrSeasonRequestSchema).optional(),
}).passthrough();

export const JellyseerrDiscoverItemSchema = z.object({
  id: z.number(),
  mediaType: z.enum(['movie', 'tv']),
  popularity: z.number(),
  posterPath: z.string().optional(),
  backdropPath: z.string().optional(),
  voteCount: z.number(),
  voteAverage: z.number(),
  genreIds: z.array(z.number()),
  overview: z.string(),
  originalLanguage: z.string(),
  title: z.string().optional(),
  originalTitle: z.string().optional(),
  releaseDate: z.string().optional(),
  name: z.string().optional(),
  originalName: z.string().optional(),
  firstAirDate: z.string().optional(),
  mediaInfo: JellyseerrMediaSchema.optional(),
}).passthrough();

export const JellyseerrDiscoverResultSchema = z.object({
  page: z.number(),
  totalPages: z.number(),
  totalResults: z.number(),
  results: z.array(JellyseerrDiscoverItemSchema),
});

export const JellyseerrRequestsResponseSchema = z.object({
  pageInfo: z.object({
    pages: z.number(),
    page: z.number(),
    results: z.number(),
  }),
  results: z.array(JellyseerrMediaRequestSchema),
});

export type ValidatedJellyseerrMediaRequest = z.infer<typeof JellyseerrMediaRequestSchema>;
export type ValidatedJellyseerrDiscoverItem = z.infer<typeof JellyseerrDiscoverItemSchema>;
export type ValidatedJellyseerrDiscoverResult = z.infer<typeof JellyseerrDiscoverResultSchema>;
export type ValidatedJellyseerrRequestsResponse = z.infer<typeof JellyseerrRequestsResponseSchema>;
