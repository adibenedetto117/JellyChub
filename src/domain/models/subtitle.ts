export interface SubtitleSearchResult {
  id: string;
  subtitleId: string;
  language: string;
  downloadCount: number;
  rating: number;
  votes: number;

  release: string;
  fileName: string;
  fileId: number;

  isHearingImpaired: boolean;
  isHD: boolean;
  isTrusted: boolean;
  isAiTranslated: boolean;
  isMachineTranslated: boolean;
  isForeignPartsOnly: boolean;

  uploadDate: string;
  comments?: string;

  media: SubtitleMediaInfo;
}

export interface SubtitleMediaInfo {
  type: 'movie' | 'episode';
  title: string;
  year: number;
  tmdbId?: number;
  imdbId?: string;

  seasonNumber?: number;
  episodeNumber?: number;
  seriesTitle?: string;
  seriesTmdbId?: number;
  seriesImdbId?: string;
}

export interface SubtitleSearchParams {
  query?: string;
  imdbId?: string;
  tmdbId?: number;
  year?: number;
  languages?: string[];
  seasonNumber?: number;
  episodeNumber?: number;
  type?: 'movie' | 'episode';
  hearingImpaired?: 'include' | 'exclude' | 'only';
  machineTranslated?: 'include' | 'exclude';
  aiTranslated?: 'include' | 'exclude';
}

export interface SubtitleSearchResponse {
  results: SubtitleSearchResult[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

export interface SubtitleDownloadInfo {
  downloadUrl: string;
  fileName: string;
  remainingDownloads: number;
  resetTime: string;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}
