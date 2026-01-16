import { openSubtitlesService } from '@/services/openSubtitlesService';
import {
  OpenSubtitlesSearchResponseSchema,
  OpenSubtitlesDownloadResponseSchema,
} from '@/domain/schemas/opensubtitles';
import {
  adaptOpenSubtitlesSearchResponse,
  adaptOpenSubtitlesDownloadResponse,
} from '@/domain/adapters/opensubtitles';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type {
  SubtitleSearchParams,
  SubtitleSearchResponse,
  SubtitleDownloadInfo,
  SubtitleCue,
} from '@/domain/models';

export class OpenSubtitlesService {
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor() {
    this.errorContext = {
      provider: 'opensubtitles',
    };
  }

  isConfigured(): boolean {
    return openSubtitlesService.isConfigured();
  }

  async search(params: SubtitleSearchParams): Promise<SubtitleSearchResponse> {
    try {
      const raw = await openSubtitlesService.searchSubtitles(params);
      const validated = OpenSubtitlesSearchResponseSchema.parse(raw);
      return adaptOpenSubtitlesSearchResponse(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'search',
      });
    }
  }

  async searchByImdb(
    imdbId: string,
    options?: {
      languages?: string[];
      seasonNumber?: number;
      episodeNumber?: number;
    }
  ): Promise<SubtitleSearchResponse> {
    return this.search({
      imdbId,
      type: options?.seasonNumber !== undefined ? 'episode' : 'movie',
      ...options,
    });
  }

  async searchByTmdb(
    tmdbId: number,
    options?: {
      languages?: string[];
      seasonNumber?: number;
      episodeNumber?: number;
    }
  ): Promise<SubtitleSearchResponse> {
    return this.search({
      tmdbId,
      type: options?.seasonNumber !== undefined ? 'episode' : 'movie',
      ...options,
    });
  }

  async getDownloadInfo(fileId: number): Promise<SubtitleDownloadInfo> {
    try {
      const raw = await openSubtitlesService.getDownloadLink(fileId);
      const validated = OpenSubtitlesDownloadResponseSchema.parse(raw);
      return adaptOpenSubtitlesDownloadResponse(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getDownloadInfo',
        itemId: String(fileId),
      });
    }
  }

  async downloadSubtitle(fileId: number): Promise<string> {
    try {
      return await openSubtitlesService.downloadSubtitle(fileId);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'downloadSubtitle',
        itemId: String(fileId),
      });
    }
  }

  async loadSubtitleContent(localPath: string): Promise<string> {
    try {
      return await openSubtitlesService.loadSubtitleContent(localPath);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'loadSubtitleContent',
      });
    }
  }

  parseSubtitleCues(content: string): SubtitleCue[] {
    return openSubtitlesService.parseSubtitleCues(content);
  }

  async downloadAndParse(fileId: number): Promise<SubtitleCue[]> {
    const localPath = await this.downloadSubtitle(fileId);
    const content = await this.loadSubtitleContent(localPath);
    return this.parseSubtitleCues(content);
  }
}

export function createOpenSubtitlesService(): OpenSubtitlesService {
  return new OpenSubtitlesService();
}
