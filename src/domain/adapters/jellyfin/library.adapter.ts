import type { ValidatedBaseItem } from '@/domain/schemas/jellyfin';
import type { Library, LibraryType, MediaType } from '@/domain/models';

export interface LibraryAdapterOptions {
  serverId: string;
  baseUrl?: string;
}

const COLLECTION_TYPE_MAP: Record<string, LibraryType> = {
  movies: 'movies',
  tvshows: 'tvshows',
  music: 'music',
  books: 'books',
  audiobooks: 'audiobooks',
  photos: 'photos',
  homevideos: 'homevideos',
  mixed: 'mixed',
  livetv: 'livetv',
  playlists: 'playlists',
  boxsets: 'mixed',
};

const LIBRARY_ITEM_TYPES: Record<LibraryType, MediaType[]> = {
  movies: ['movie'],
  tvshows: ['series'],
  music: ['album', 'artist', 'track'],
  books: ['book'],
  audiobooks: ['audiobook'],
  photos: [],
  homevideos: [],
  mixed: ['movie', 'series'],
  livetv: ['channel', 'program'],
  playlists: ['playlist'],
};

function mapCollectionType(collectionType?: string): LibraryType {
  if (!collectionType) return 'mixed';
  return COLLECTION_TYPE_MAP[collectionType.toLowerCase()] ?? 'mixed';
}

export function adaptJellyfinLibrary(
  raw: ValidatedBaseItem,
  options: LibraryAdapterOptions
): Library {
  const { baseUrl, serverId } = options;
  const collectionType = (raw as any).CollectionType as string | undefined;
  const libraryType = mapCollectionType(collectionType);

  return {
    id: raw.Id,
    name: raw.Name,
    type: libraryType,
    serverId: serverId,
    provider: 'jellyfin',

    imageUrl: raw.ImageTags?.Primary && baseUrl
      ? `${baseUrl}/Items/${raw.Id}/Images/Primary?tag=${raw.ImageTags.Primary}`
      : undefined,
    backdropUrl: raw.BackdropImageTags?.[0] && baseUrl
      ? `${baseUrl}/Items/${raw.Id}/Images/Backdrop?tag=${raw.BackdropImageTags[0]}`
      : undefined,

    itemTypes: LIBRARY_ITEM_TYPES[libraryType] ?? [],
    itemCount: raw.ChildCount,

    isVisible: true,
  };
}

export function adaptJellyfinLibraries(
  items: ValidatedBaseItem[],
  options: LibraryAdapterOptions
): Library[] {
  return items
    .filter(item => item.Type === 'CollectionFolder' || item.Type === 'Folder')
    .map(item => adaptJellyfinLibrary(item, options));
}
