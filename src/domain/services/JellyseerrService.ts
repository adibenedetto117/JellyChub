import { jellyseerrClient } from '@/api/external/jellyseerr';
import {
  JellyseerrDiscoverResultSchema,
  JellyseerrRequestsResponseSchema,
  JellyseerrMediaRequestSchema,
} from '@/domain/schemas/jellyseerr';
import {
  adaptJellyseerrDiscoverResult,
  adaptJellyseerrRequestsResponse,
  adaptJellyseerrRequest,
} from '@/domain/adapters/jellyseerr';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type { DiscoverResult, MediaRequest, RequestsResult, RequestStatus } from '@/domain/models';

export type RequestFilter = 'all' | 'approved' | 'pending' | 'available' | 'processing' | 'unavailable' | 'failed';

export interface RequestsQueryParams {
  take?: number;
  skip?: number;
  filter?: RequestFilter;
  sort?: 'added' | 'modified';
  requestedBy?: number;
}

export class JellyseerrService {
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor() {
    this.errorContext = {
      provider: 'jellyseerr',
    };
  }

  isConfigured(): boolean {
    return jellyseerrClient.isInitialized() && jellyseerrClient.isLoggedIn();
  }

  async getDiscoverMovies(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getDiscoverMovies(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getDiscoverMovies',
      });
    }
  }

  async getDiscoverTv(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getDiscoverTv(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getDiscoverTv',
      });
    }
  }

  async getTrending(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getTrending(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getTrending',
      });
    }
  }

  async getPopularMovies(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getPopularMovies(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getPopularMovies',
      });
    }
  }

  async getPopularTv(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getPopularTv(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getPopularTv',
      });
    }
  }

  async getUpcomingMovies(page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.getUpcomingMovies(page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getUpcomingMovies',
      });
    }
  }

  async search(query: string, page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.search(query, page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'search',
      });
    }
  }

  async getRequests(params: RequestsQueryParams = {}): Promise<RequestsResult> {
    try {
      const raw = await jellyseerrClient.getRequests(params);
      const validated = JellyseerrRequestsResponseSchema.parse(raw);
      return adaptJellyseerrRequestsResponse(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getRequests',
      });
    }
  }

  async getRequest(requestId: number): Promise<MediaRequest> {
    try {
      const raw = await jellyseerrClient.getRequest(requestId);
      const validated = JellyseerrMediaRequestSchema.parse(raw);
      return adaptJellyseerrRequest(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getRequest',
        itemId: String(requestId),
      });
    }
  }

  async createMovieRequest(tmdbId: number, is4k = false): Promise<MediaRequest> {
    try {
      const raw = await jellyseerrClient.createRequest({
        mediaType: 'movie',
        mediaId: tmdbId,
        is4k,
      });
      const validated = JellyseerrMediaRequestSchema.parse(raw);
      return adaptJellyseerrRequest(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'createMovieRequest',
      });
    }
  }

  async createTvRequest(tmdbId: number, seasons?: number[], is4k = false): Promise<MediaRequest> {
    try {
      const raw = await jellyseerrClient.createRequest({
        mediaType: 'tv',
        mediaId: tmdbId,
        is4k,
        seasons,
      });
      const validated = JellyseerrMediaRequestSchema.parse(raw);
      return adaptJellyseerrRequest(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'createTvRequest',
      });
    }
  }

  async approveRequest(requestId: number): Promise<MediaRequest> {
    try {
      const raw = await jellyseerrClient.approveRequest(requestId);
      const validated = JellyseerrMediaRequestSchema.parse(raw);
      return adaptJellyseerrRequest(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'approveRequest',
        itemId: String(requestId),
      });
    }
  }

  async declineRequest(requestId: number): Promise<void> {
    try {
      await jellyseerrClient.declineRequest(requestId);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'declineRequest',
        itemId: String(requestId),
      });
    }
  }

  async deleteRequest(requestId: number): Promise<void> {
    try {
      await jellyseerrClient.deleteRequest(requestId);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'deleteRequest',
        itemId: String(requestId),
      });
    }
  }

  async discoverByGenre(mediaType: 'movie' | 'tv', genreId: number, page = 1): Promise<DiscoverResult> {
    try {
      const raw = await jellyseerrClient.discoverByGenre(mediaType, genreId, page);
      const validated = JellyseerrDiscoverResultSchema.parse(raw);
      return adaptJellyseerrDiscoverResult(validated);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'discoverByGenre',
      });
    }
  }
}

export function createJellyseerrService(): JellyseerrService {
  return new JellyseerrService();
}
