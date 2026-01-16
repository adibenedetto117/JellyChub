import { radarrService } from '@/api/external/radarr';
import {
  RadarrMovieSchema,
  RadarrQueueResponseSchema,
  RadarrRootFolderSchema,
  RadarrQualityProfileSchema,
} from '@/domain/schemas/radarr';
import {
  adaptRadarrMovie,
  adaptRadarrMovieList,
  adaptRadarrQueueResponse,
  adaptRadarrRootFolders,
  adaptRadarrQualityProfiles,
} from '@/domain/adapters/radarr';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type { ManagedMovie, DownloadQueueResult, RootFolder, QualityProfile } from '@/domain/models';

export class RadarrService {
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor() {
    this.errorContext = {
      provider: 'radarr',
    };
  }

  isConfigured(): boolean {
    return radarrService.isConfigured();
  }

  async getMovies(): Promise<ManagedMovie[]> {
    try {
      const raw = await radarrService.getMovies();
      const validated = raw.map((item: unknown) => RadarrMovieSchema.parse(item));
      return adaptRadarrMovieList(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getMovies',
      });
    }
  }

  async getMovieByTmdbId(tmdbId: number): Promise<ManagedMovie | null> {
    try {
      const raw = await radarrService.getMovieByTmdbId(tmdbId);
      if (!raw) return null;
      const validated = RadarrMovieSchema.parse(raw);
      return adaptRadarrMovie(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getMovieByTmdbId',
      });
    }
  }

  async getMovieDetails(movieId: number): Promise<ManagedMovie> {
    try {
      const raw = await radarrService.getMovieDetails(movieId);
      const validated = RadarrMovieSchema.parse(raw);
      return adaptRadarrMovie(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getMovieDetails',
        itemId: String(movieId),
      });
    }
  }

  async getQueue(page = 1, pageSize = 20): Promise<DownloadQueueResult> {
    try {
      const raw = await radarrService.getQueue(page, pageSize);
      const validated = RadarrQueueResponseSchema.parse(raw);
      return adaptRadarrQueueResponse(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getQueue',
      });
    }
  }

  async getRootFolders(): Promise<RootFolder[]> {
    try {
      const raw = await radarrService.getRootFolders();
      const validated = raw.map((item: unknown) => RadarrRootFolderSchema.parse(item));
      return adaptRadarrRootFolders(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getRootFolders',
      });
    }
  }

  async getQualityProfiles(): Promise<QualityProfile[]> {
    try {
      const raw = await radarrService.getQualityProfiles();
      const validated = raw.map((item: unknown) => RadarrQualityProfileSchema.parse(item));
      return adaptRadarrQualityProfiles(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getQualityProfiles',
      });
    }
  }

  async addMovie(options: {
    tmdbId: number;
    title: string;
    qualityProfileId: number;
    rootFolderPath: string;
    monitored?: boolean;
    searchForMovie?: boolean;
  }): Promise<ManagedMovie> {
    try {
      const raw = await radarrService.addMovie(options);
      const validated = RadarrMovieSchema.parse(raw);
      return adaptRadarrMovie(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'addMovie',
      });
    }
  }

  async toggleMonitored(movieId: number, monitored: boolean): Promise<ManagedMovie> {
    try {
      const raw = await radarrService.toggleMonitored(movieId, monitored);
      const validated = RadarrMovieSchema.parse(raw);
      return adaptRadarrMovie(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'toggleMonitored',
        itemId: String(movieId),
      });
    }
  }

  async deleteMovie(movieId: number, deleteFiles = false): Promise<void> {
    try {
      await radarrService.deleteMovie(movieId, deleteFiles);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'deleteMovie',
        itemId: String(movieId),
      });
    }
  }

  async triggerSearch(movieId: number): Promise<void> {
    try {
      await radarrService.triggerMovieSearch(movieId);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'triggerSearch',
        itemId: String(movieId),
      });
    }
  }

  async removeFromQueue(id: number, removeFromClient = true, blocklist = false): Promise<void> {
    try {
      await radarrService.removeFromQueue(id, removeFromClient, blocklist);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'removeFromQueue',
        itemId: String(id),
      });
    }
  }
}

export function createRadarrService(): RadarrService {
  return new RadarrService();
}
