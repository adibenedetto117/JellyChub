import { z } from 'zod';

export const OpenSubtitlesFileSchema = z.object({
  file_id: z.number(),
  cd_number: z.number(),
  file_name: z.string(),
}).passthrough();

export const OpenSubtitlesFeatureDetailsSchema = z.object({
  feature_id: z.number(),
  feature_type: z.string(),
  year: z.number(),
  title: z.string(),
  movie_name: z.string(),
  imdb_id: z.number().optional(),
  tmdb_id: z.number().optional(),
  season_number: z.number().optional(),
  episode_number: z.number().optional(),
  parent_imdb_id: z.number().optional(),
  parent_title: z.string().optional(),
  parent_tmdb_id: z.number().optional(),
  parent_feature_id: z.number().optional(),
}).passthrough();

export const OpenSubtitlesAttributesSchema = z.object({
  subtitle_id: z.string(),
  language: z.string(),
  download_count: z.number(),
  hearing_impaired: z.boolean(),
  hd: z.boolean(),
  fps: z.number(),
  votes: z.number(),
  ratings: z.number(),
  from_trusted: z.boolean(),
  foreign_parts_only: z.boolean(),
  upload_date: z.string(),
  ai_translated: z.boolean(),
  machine_translated: z.boolean(),
  release: z.string(),
  comments: z.string(),
  legacy_subtitle_id: z.number(),
  feature_details: OpenSubtitlesFeatureDetailsSchema,
  files: z.array(OpenSubtitlesFileSchema),
}).passthrough();

export const OpenSubtitlesSearchResultSchema = z.object({
  id: z.string(),
  attributes: OpenSubtitlesAttributesSchema,
}).passthrough();

export const OpenSubtitlesSearchResponseSchema = z.object({
  total_count: z.number(),
  total_pages: z.number(),
  per_page: z.number(),
  page: z.number(),
  data: z.array(OpenSubtitlesSearchResultSchema),
});

export const OpenSubtitlesDownloadResponseSchema = z.object({
  link: z.string(),
  file_name: z.string(),
  requests: z.number(),
  remaining: z.number(),
  message: z.string(),
  reset_time: z.string(),
  reset_time_utc: z.string(),
});

export type ValidatedOpenSubtitlesSearchResult = z.infer<typeof OpenSubtitlesSearchResultSchema>;
export type ValidatedOpenSubtitlesSearchResponse = z.infer<typeof OpenSubtitlesSearchResponseSchema>;
export type ValidatedOpenSubtitlesDownloadResponse = z.infer<typeof OpenSubtitlesDownloadResponseSchema>;
