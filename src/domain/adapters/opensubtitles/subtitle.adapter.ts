import type {
  ValidatedOpenSubtitlesSearchResult,
  ValidatedOpenSubtitlesSearchResponse,
  ValidatedOpenSubtitlesDownloadResponse,
} from '@/domain/schemas/opensubtitles';
import type {
  SubtitleSearchResult,
  SubtitleSearchResponse,
  SubtitleMediaInfo,
  SubtitleDownloadInfo,
} from '@/domain/models';

function adaptMediaInfo(
  featureDetails: {
    feature_type: string;
    title: string;
    movie_name: string;
    year: number;
    tmdb_id?: number;
    imdb_id?: number;
    season_number?: number;
    episode_number?: number;
    parent_title?: string;
    parent_tmdb_id?: number;
    parent_imdb_id?: number;
  }
): SubtitleMediaInfo {
  const isEpisode = featureDetails.feature_type === 'Episode';

  return {
    type: isEpisode ? 'episode' : 'movie',
    title: featureDetails.title || featureDetails.movie_name,
    year: featureDetails.year,
    tmdbId: featureDetails.tmdb_id,
    imdbId: featureDetails.imdb_id ? `tt${featureDetails.imdb_id}` : undefined,
    seasonNumber: featureDetails.season_number,
    episodeNumber: featureDetails.episode_number,
    seriesTitle: featureDetails.parent_title,
    seriesTmdbId: featureDetails.parent_tmdb_id,
    seriesImdbId: featureDetails.parent_imdb_id ? `tt${featureDetails.parent_imdb_id}` : undefined,
  };
}

export function adaptOpenSubtitlesResult(raw: ValidatedOpenSubtitlesSearchResult): SubtitleSearchResult {
  const attrs = raw.attributes;
  const firstFile = attrs.files[0];

  return {
    id: raw.id,
    subtitleId: attrs.subtitle_id,
    language: attrs.language,
    downloadCount: attrs.download_count,
    rating: attrs.ratings,
    votes: attrs.votes,

    release: attrs.release,
    fileName: firstFile?.file_name ?? '',
    fileId: firstFile?.file_id ?? 0,

    isHearingImpaired: attrs.hearing_impaired,
    isHD: attrs.hd,
    isTrusted: attrs.from_trusted,
    isAiTranslated: attrs.ai_translated,
    isMachineTranslated: attrs.machine_translated,
    isForeignPartsOnly: attrs.foreign_parts_only,

    uploadDate: attrs.upload_date,
    comments: attrs.comments || undefined,

    media: adaptMediaInfo(attrs.feature_details),
  };
}

export function adaptOpenSubtitlesResults(items: ValidatedOpenSubtitlesSearchResult[]): SubtitleSearchResult[] {
  return items.map(adaptOpenSubtitlesResult);
}

export function adaptOpenSubtitlesSearchResponse(raw: ValidatedOpenSubtitlesSearchResponse): SubtitleSearchResponse {
  return {
    results: adaptOpenSubtitlesResults(raw.data),
    page: raw.page,
    totalPages: raw.total_pages,
    totalCount: raw.total_count,
    perPage: raw.per_page,
  };
}

export function adaptOpenSubtitlesDownloadResponse(raw: ValidatedOpenSubtitlesDownloadResponse): SubtitleDownloadInfo {
  return {
    downloadUrl: raw.link,
    fileName: raw.file_name,
    remainingDownloads: raw.remaining,
    resetTime: raw.reset_time_utc,
  };
}
