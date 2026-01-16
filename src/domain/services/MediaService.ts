import {
  getItem,
  getItems,
  getResumeItems,
  getLatestMedia,
  getNextUp,
  getSimilarItems,
  getSeasons,
  getEpisodes,
  search,
  getFavorites,
  type LibraryQueryParams,
} from '@/api';
import {
  BaseItemSchema,
  ItemsResponseSchema,
} from '@/domain/schemas/jellyfin';
import {
  adaptJellyfinItem,
  adaptJellyfinItems,
  adaptItemsResponse,
  adaptSearchHints,
  type AdapterOptions,
} from '@/domain/adapters/jellyfin';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type { MediaItem, MediaItemsResult, MediaType } from '@/domain/models';

export interface MediaServiceOptions {
  userId: string;
  serverId: string;
  baseUrl: string;
}

export class MediaService {
  private adapterOptions: AdapterOptions;
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor(private options: MediaServiceOptions) {
    this.adapterOptions = {
      serverId: options.serverId,
      baseUrl: options.baseUrl,
    };
    this.errorContext = {
      provider: 'jellyfin',
    };
  }

  async getItem(itemId: string): Promise<MediaItem> {
    try {
      const raw = await getItem(this.options.userId, itemId);
      const validated = BaseItemSchema.parse(raw);
      return adaptJellyfinItem(validated, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getItem',
        itemId,
      });
    }
  }

  async getItems(params: LibraryQueryParams): Promise<MediaItemsResult> {
    try {
      const raw = await getItems(this.options.userId, params);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptItemsResponse(validated, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getItems',
      });
    }
  }

  async getResumeItems(limit = 20): Promise<MediaItem[]> {
    try {
      const raw = await getResumeItems(this.options.userId, limit);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getResumeItems',
      });
    }
  }

  async getLatestMedia(parentId?: string, limit = 20): Promise<MediaItem[]> {
    try {
      const raw = await getLatestMedia(this.options.userId, parentId, limit);
      return adaptJellyfinItems(
        raw.map((item: unknown) => BaseItemSchema.parse(item)),
        this.adapterOptions
      );
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getLatestMedia',
      });
    }
  }

  async getNextUp(limit = 20): Promise<MediaItem[]> {
    try {
      const raw = await getNextUp(this.options.userId, undefined, limit);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getNextUp',
      });
    }
  }

  async getSimilar(itemId: string, limit = 12): Promise<MediaItem[]> {
    try {
      const raw = await getSimilarItems(itemId, this.options.userId, limit);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getSimilar',
        itemId,
      });
    }
  }

  async getSeasons(seriesId: string): Promise<MediaItem[]> {
    try {
      const raw = await getSeasons(seriesId, this.options.userId);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getSeasons',
        itemId: seriesId,
      });
    }
  }

  async getEpisodes(seriesId: string, seasonId?: string): Promise<MediaItem[]> {
    try {
      const raw = await getEpisodes(seriesId, this.options.userId, seasonId);
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getEpisodes',
        itemId: seriesId,
      });
    }
  }

  async search(
    query: string,
    options?: {
      limit?: number;
      includeItemTypes?: MediaType[];
    }
  ): Promise<MediaItem[]> {
    try {
      const jellyfinTypes = options?.includeItemTypes?.map(t =>
        this.mapToJellyfinType(t)
      ) as import('@/api').SearchMediaType[] | undefined;
      const raw = await search(this.options.userId, query, {
        limit: options?.limit,
        includeItemTypes: jellyfinTypes,
      });
      return adaptSearchHints(raw.SearchHints ?? [], this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'search',
      });
    }
  }

  async getFavorites(mediaType?: MediaType, limit = 50): Promise<MediaItem[]> {
    try {
      const jellyfinType = mediaType ? this.mapToJellyfinType(mediaType) : undefined;
      const itemTypes = jellyfinType ? [jellyfinType] : ['Movie', 'Series', 'MusicAlbum', 'Audio'];
      const raw = await getFavorites(
        this.options.userId,
        itemTypes,
        limit
      );
      const validated = ItemsResponseSchema.parse(raw);
      return adaptJellyfinItems(validated.Items, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getFavorites',
      });
    }
  }

  private mapToJellyfinType(type: MediaType): string {
    const typeMap: Record<MediaType, string> = {
      movie: 'Movie',
      series: 'Series',
      season: 'Season',
      episode: 'Episode',
      album: 'MusicAlbum',
      track: 'Audio',
      artist: 'MusicArtist',
      book: 'Book',
      audiobook: 'AudioBook',
      playlist: 'Playlist',
      collection: 'BoxSet',
      channel: 'TvChannel',
      program: 'Program',
    };
    return typeMap[type] ?? type;
  }
}

export function createMediaService(options: MediaServiceOptions): MediaService {
  return new MediaService(options);
}
