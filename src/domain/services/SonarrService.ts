import { sonarrService } from '@/api/external/sonarr';
import {
  SonarrSeriesSchema,
  SonarrQueueResponseSchema,
  SonarrRootFolderSchema,
  SonarrQualityProfileSchema,
} from '@/domain/schemas/sonarr';
import {
  adaptSonarrSeries,
  adaptSonarrSeriesList,
  adaptSonarrQueueResponse,
  adaptSonarrRootFolders,
  adaptSonarrQualityProfiles,
} from '@/domain/adapters/sonarr';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type { ManagedSeries, DownloadQueueResult, RootFolder, QualityProfile } from '@/domain/models';

export class SonarrService {
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor() {
    this.errorContext = {
      provider: 'sonarr',
    };
  }

  isConfigured(): boolean {
    return sonarrService.isConfigured();
  }

  async getSeries(): Promise<ManagedSeries[]> {
    try {
      const raw = await sonarrService.getSeries();
      const validated = raw.map((item: unknown) => SonarrSeriesSchema.parse(item));
      return adaptSonarrSeriesList(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getSeries',
      });
    }
  }

  async getSeriesByTvdbId(tvdbId: number): Promise<ManagedSeries | null> {
    try {
      const raw = await sonarrService.getSeriesByTvdbId(tvdbId);
      if (!raw) return null;
      const validated = SonarrSeriesSchema.parse(raw);
      return adaptSonarrSeries(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getSeriesByTvdbId',
      });
    }
  }

  async getSeriesDetails(seriesId: number): Promise<ManagedSeries> {
    try {
      const raw = await sonarrService.getSeriesDetails(seriesId);
      const validated = SonarrSeriesSchema.parse(raw);
      return adaptSonarrSeries(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getSeriesDetails',
        itemId: String(seriesId),
      });
    }
  }

  async getQueue(page = 1, pageSize = 20): Promise<DownloadQueueResult> {
    try {
      const raw = await sonarrService.getQueue(page, pageSize);
      const validated = SonarrQueueResponseSchema.parse(raw);
      return adaptSonarrQueueResponse(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getQueue',
      });
    }
  }

  async getRootFolders(): Promise<RootFolder[]> {
    try {
      const raw = await sonarrService.getRootFolders();
      const validated = raw.map((item: unknown) => SonarrRootFolderSchema.parse(item));
      return adaptSonarrRootFolders(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getRootFolders',
      });
    }
  }

  async getQualityProfiles(): Promise<QualityProfile[]> {
    try {
      const raw = await sonarrService.getQualityProfiles();
      const validated = raw.map((item: unknown) => SonarrQualityProfileSchema.parse(item));
      return adaptSonarrQualityProfiles(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getQualityProfiles',
      });
    }
  }

  async addSeries(options: {
    tvdbId: number;
    title: string;
    qualityProfileId: number;
    rootFolderPath: string;
    monitored?: boolean;
    searchForMissingEpisodes?: boolean;
  }): Promise<ManagedSeries> {
    try {
      const raw = await sonarrService.addSeries(options);
      const validated = SonarrSeriesSchema.parse(raw);
      return adaptSonarrSeries(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'addSeries',
      });
    }
  }

  async toggleMonitored(seriesId: number, monitored: boolean): Promise<ManagedSeries> {
    try {
      const raw = await sonarrService.toggleSeriesMonitored(seriesId, monitored);
      const validated = SonarrSeriesSchema.parse(raw);
      return adaptSonarrSeries(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'toggleMonitored',
        itemId: String(seriesId),
      });
    }
  }

  async deleteSeries(seriesId: number, deleteFiles = false): Promise<void> {
    try {
      await sonarrService.deleteSeries(seriesId, deleteFiles);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'deleteSeries',
        itemId: String(seriesId),
      });
    }
  }

  async triggerSearch(seriesId: number): Promise<void> {
    try {
      await sonarrService.triggerSeriesSearch(seriesId);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'triggerSearch',
        itemId: String(seriesId),
      });
    }
  }

  async removeFromQueue(id: number, removeFromClient = true, blocklist = false): Promise<void> {
    try {
      await sonarrService.removeFromQueue(id, removeFromClient, blocklist);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'removeFromQueue',
        itemId: String(id),
      });
    }
  }
}

export function createSonarrService(): SonarrService {
  return new SonarrService();
}
