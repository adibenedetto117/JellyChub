import { getLibraries, getGenres } from '@/api';
import { BaseItemSchema, ItemsResponseSchema } from '@/domain/schemas/jellyfin';
import {
  adaptJellyfinLibraries,
  type LibraryAdapterOptions,
} from '@/domain/adapters/jellyfin';
import { handleApiError, type ErrorContext } from '@/domain/errors';
import type { Library, LibraryType } from '@/domain/models';

export interface LibraryServiceOptions {
  userId: string;
  serverId: string;
  baseUrl: string;
}

export class LibraryService {
  private adapterOptions: LibraryAdapterOptions;
  private errorContext: Omit<ErrorContext, 'operation'>;

  constructor(private options: LibraryServiceOptions) {
    this.adapterOptions = {
      serverId: options.serverId,
      baseUrl: options.baseUrl,
    };
    this.errorContext = {
      provider: 'jellyfin',
    };
  }

  async getLibraries(): Promise<Library[]> {
    try {
      const raw = await getLibraries(this.options.userId);
      const validated = raw.map((item: unknown) => BaseItemSchema.parse(item));
      return adaptJellyfinLibraries(validated, this.adapterOptions);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getLibraries',
      });
    }
  }

  async getLibrariesByType(type: LibraryType): Promise<Library[]> {
    const libraries = await this.getLibraries();
    return libraries.filter(lib => lib.type === type);
  }

  async getLibrary(libraryId: string): Promise<Library | undefined> {
    const libraries = await this.getLibraries();
    return libraries.find(lib => lib.id === libraryId);
  }

  async getGenres(parentId?: string): Promise<string[]> {
    try {
      const raw = await getGenres(this.options.userId, parentId);
      const validated = ItemsResponseSchema.parse(raw);
      return validated.Items.map(item => item.Name);
    } catch (error) {
      throw handleApiError(error, {
        ...this.errorContext,
        operation: 'getGenres',
      });
    }
  }
}

export function createLibraryService(options: LibraryServiceOptions): LibraryService {
  return new LibraryService(options);
}
