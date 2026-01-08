import * as FileSystem from 'expo-file-system/legacy';
import { useSettingsStore } from '@/stores';

const API_BASE_URL = 'https://api.opensubtitles.com/api/v1';
const APP_NAME = 'JellyChub';

export interface OpenSubtitlesSearchResult {
  id: string;
  attributes: {
    subtitle_id: string;
    language: string;
    download_count: number;
    hearing_impaired: boolean;
    hd: boolean;
    fps: number;
    votes: number;
    ratings: number;
    from_trusted: boolean;
    foreign_parts_only: boolean;
    upload_date: string;
    ai_translated: boolean;
    machine_translated: boolean;
    release: string;
    comments: string;
    legacy_subtitle_id: number;
    feature_details: {
      feature_id: number;
      feature_type: string;
      year: number;
      title: string;
      movie_name: string;
      imdb_id: number;
      tmdb_id: number;
      season_number?: number;
      episode_number?: number;
      parent_imdb_id?: number;
      parent_title?: string;
      parent_tmdb_id?: number;
      parent_feature_id?: number;
    };
    files: Array<{
      file_id: number;
      cd_number: number;
      file_name: string;
    }>;
  };
}

export interface OpenSubtitlesSearchResponse {
  total_count: number;
  total_pages: number;
  per_page: number;
  page: number;
  data: OpenSubtitlesSearchResult[];
}

export interface OpenSubtitlesDownloadResponse {
  link: string;
  file_name: string;
  requests: number;
  remaining: number;
  message: string;
  reset_time: string;
  reset_time_utc: string;
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

class OpenSubtitlesService {
  private getApiKey(): string | null {
    return useSettingsStore.getState().openSubtitlesApiKey;
  }

  private getHeaders(includeContentType = false): Record<string, string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('OpenSubtitles API key not configured');
    }

    const headers: Record<string, string> = {
      'Api-Key': apiKey,
      'User-Agent': APP_NAME,
      Accept: '*/*',
    };

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  async searchSubtitles(params: SubtitleSearchParams): Promise<OpenSubtitlesSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.query) {
      queryParams.append('query', params.query);
    }
    if (params.imdbId) {
      queryParams.append('imdb_id', params.imdbId);
    }
    if (params.tmdbId) {
      queryParams.append('tmdb_id', params.tmdbId.toString());
    }
    if (params.year) {
      queryParams.append('year', params.year.toString());
    }
    if (params.languages && params.languages.length > 0) {
      queryParams.append('languages', params.languages.join(','));
    }
    if (params.seasonNumber !== undefined) {
      queryParams.append('season_number', params.seasonNumber.toString());
    }
    if (params.episodeNumber !== undefined) {
      queryParams.append('episode_number', params.episodeNumber.toString());
    }
    if (params.type) {
      queryParams.append('type', params.type);
    }
    if (params.hearingImpaired) {
      queryParams.append('hearing_impaired', params.hearingImpaired);
    }
    if (params.machineTranslated) {
      queryParams.append('machine_translated', params.machineTranslated);
    }
    if (params.aiTranslated) {
      queryParams.append('ai_translated', params.aiTranslated);
    }

    queryParams.append('order_by', 'download_count');
    queryParams.append('order_direction', 'desc');

    const response = await fetch(
      `${API_BASE_URL}/subtitles?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenSubtitles API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getDownloadLink(fileId: number): Promise<OpenSubtitlesDownloadResponse> {
    const response = await fetch(`${API_BASE_URL}/download`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: JSON.stringify({ file_id: fileId }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenSubtitles download error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async downloadSubtitle(fileId: number): Promise<string> {
    const downloadInfo = await this.getDownloadLink(fileId);

    const subtitleDir = `${FileSystem.cacheDirectory}subtitles/`;
    await FileSystem.makeDirectoryAsync(subtitleDir, { intermediates: true });

    const localPath = `${subtitleDir}${fileId}_${downloadInfo.file_name}`;

    const existingFile = await FileSystem.getInfoAsync(localPath);
    if (existingFile.exists) {
      return localPath;
    }

    const downloadResult = await FileSystem.downloadAsync(
      downloadInfo.link,
      localPath
    );

    if (downloadResult.status !== 200) {
      throw new Error(`Failed to download subtitle: ${downloadResult.status}`);
    }

    return localPath;
  }

  async loadSubtitleContent(localPath: string): Promise<string> {
    return FileSystem.readAsStringAsync(localPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  parseSubtitleCues(content: string): Array<{ start: number; end: number; text: string }> {
    const cues: Array<{ start: number; end: number; text: string }> = [];

    const parseTime = (t: string): number => {
      const cleaned = t.replace(',', '.').trim();
      const parts = cleaned.split(':');
      if (parts.length === 3) {
        return parseFloat(parts[0]) * 3600000 + parseFloat(parts[1]) * 60000 + parseFloat(parts[2]) * 1000;
      } else if (parts.length === 2) {
        return parseFloat(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
      }
      return 0;
    };

    const isAss = content.includes('[Script Info]') || content.includes('Dialogue:');

    if (isAss) {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.startsWith('Dialogue:')) {
          const parts = line.substring(9).split(',');
          if (parts.length >= 10) {
            const startTime = parseTime(parts[1]);
            const endTime = parseTime(parts[2]);
            const subtitleText = parts.slice(9).join(',')
              .replace(/\{[^}]*\}/g, '')
              .replace(/\\N/g, '\n')
              .replace(/\\n/g, '\n')
              .trim();
            if (subtitleText) {
              cues.push({ start: startTime, end: endTime, text: subtitleText });
            }
          }
        }
      }
    } else {
      const lines = content.split('\n');
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (line.includes('-->')) {
          const [startStr, endStr] = line.split('-->').map(s => s.trim());
          const start = parseTime(startStr);
          const end = parseTime(endStr.split(' ')[0]);
          const textLines: string[] = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '') {
            textLines.push(lines[i].trim());
            i++;
          }
          if (textLines.length > 0) {
            cues.push({ start, end, text: textLines.join('\n').replace(/<[^>]+>/g, '') });
          }
        }
        i++;
      }
    }

    cues.sort((a, b) => a.start - b.start);
    return cues;
  }

  isConfigured(): boolean {
    const apiKey = this.getApiKey();
    return !!apiKey && apiKey.length > 0;
  }
}

export const openSubtitlesService = new OpenSubtitlesService();
