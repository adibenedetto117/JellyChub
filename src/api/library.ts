import { jellyfinClient } from './client';
import type {
  BaseItem,
  Library,
  CollectionType,
  ItemsResponse,
  SearchResult,
  Movie,
  Series,
  Episode,
  MusicAlbum,
  AudioTrack,
} from '@/types/jellyfin';

// Library collection type configuration
export interface LibraryConfig {
  label: string;
  icon: string;
  itemTypes: string[];
  variant?: 'square';
}

// Mapping of collection types to their configuration
export const COLLECTION_TYPE_CONFIG: Record<string, LibraryConfig> = {
  movies: {
    label: 'Movies',
    icon: 'film',
    itemTypes: ['Movie'],
  },
  tvshows: {
    label: 'TV Shows',
    icon: 'tv',
    itemTypes: ['Series'],
  },
  music: {
    label: 'Music',
    icon: 'musical-notes',
    itemTypes: ['MusicAlbum'],
    variant: 'square',
  },
  musicvideos: {
    label: 'Music Videos',
    icon: 'videocam',
    itemTypes: ['MusicVideo'],
  },
  books: {
    label: 'Books',
    icon: 'book',
    itemTypes: ['Book', 'AudioBook'],
  },
  audiobooks: {
    label: 'Audiobooks',
    icon: 'headset',
    itemTypes: ['AudioBook'],
  },
  homevideos: {
    label: 'Home Videos',
    icon: 'home',
    itemTypes: ['Video'],
  },
  boxsets: {
    label: 'Collections',
    icon: 'folder',
    itemTypes: ['BoxSet'],
  },
  playlists: {
    label: 'Playlists',
    icon: 'list',
    itemTypes: ['Playlist'],
  },
};

// Default config for mixed/unknown library types
export const DEFAULT_LIBRARY_CONFIG: LibraryConfig = {
  label: 'Library',
  icon: 'library',
  itemTypes: ['Movie', 'Series', 'MusicAlbum', 'Book', 'AudioBook', 'Video'],
};

/**
 * Get the configuration for a library based on its CollectionType
 */
export function getLibraryConfig(collectionType: CollectionType): LibraryConfig {
  if (!collectionType) {
    return DEFAULT_LIBRARY_CONFIG;
  }
  return COLLECTION_TYPE_CONFIG[collectionType] ?? DEFAULT_LIBRARY_CONFIG;
}

/**
 * Get an appropriate icon name for a library based on its CollectionType
 */
export function getLibraryIcon(collectionType: CollectionType): string {
  const config = getLibraryConfig(collectionType);
  return config.icon;
}

/**
 * Get item types to query for a library based on its CollectionType
 */
export function getLibraryItemTypes(collectionType: CollectionType): string[] {
  const config = getLibraryConfig(collectionType);
  return config.itemTypes;
}

/**
 * Determine if a library should use square poster variants (e.g., music albums)
 */
export function shouldUseSquareVariant(collectionType: CollectionType): boolean {
  const config = getLibraryConfig(collectionType);
  return config.variant === 'square';
}

export interface LibraryQueryParams {
  parentId?: string;
  includeItemTypes?: string[];
  excludeItemTypes?: string[];
  sortBy?: string;
  sortOrder?: 'Ascending' | 'Descending';
  startIndex?: number;
  limit?: number;
  recursive?: boolean;
  searchTerm?: string;
  genres?: string[];
  years?: number[];
  filters?: string[];
  isFavorite?: boolean;
  fields?: string[];
  minCommunityRating?: number;
}

export interface Genre {
  Id: string;
  Name: string;
  Type: 'Genre';
}

const DEFAULT_FIELDS = [
  'Overview',
  'Genres',
  'Tags',
  'Studios',
  'People',
  'MediaSources',
  'UserData',
  'ChildCount',
  'SeriesId',
  'SeriesName',
  'ParentId',
  'ParentIndexNumber',
  'IndexNumber',
  'ParentBackdropImageTags',
  'SeriesPrimaryImageTag',
  'Chapters',
  'BackdropImageTags',
];

function buildQueryParams(params: LibraryQueryParams): URLSearchParams {
  const query = new URLSearchParams();

  if (params.parentId) query.set('ParentId', params.parentId);
  if (params.includeItemTypes?.length) {
    query.set('IncludeItemTypes', params.includeItemTypes.join(','));
  }
  if (params.excludeItemTypes?.length) {
    query.set('ExcludeItemTypes', params.excludeItemTypes.join(','));
  }
  if (params.sortBy) query.set('SortBy', params.sortBy);
  if (params.sortOrder) query.set('SortOrder', params.sortOrder);
  if (params.startIndex !== undefined) {
    query.set('StartIndex', params.startIndex.toString());
  }
  if (params.limit) query.set('Limit', params.limit.toString());
  if (params.recursive !== undefined) {
    query.set('Recursive', params.recursive.toString());
  }
  if (params.searchTerm) query.set('SearchTerm', params.searchTerm);
  if (params.genres?.length) query.set('Genres', params.genres.join('|'));
  if (params.years?.length) query.set('Years', params.years.join(','));
  if (params.filters?.length) query.set('Filters', params.filters.join(','));
  if (params.isFavorite !== undefined) {
    query.set('IsFavorite', params.isFavorite.toString());
  }
  if (params.minCommunityRating !== undefined) {
    query.set('MinCommunityRating', params.minCommunityRating.toString());
  }

  const fields = params.fields ?? DEFAULT_FIELDS;
  query.set('Fields', fields.join(','));

  return query;
}

export async function getLibraries(userId: string): Promise<Library[]> {
  const response = await jellyfinClient.api.get<{ Items: Library[] }>(
    `/Users/${userId}/Views`
  );
  return response.data.Items;
}

export async function getItems<T extends BaseItem = BaseItem>(
  userId: string,
  params: LibraryQueryParams = {}
): Promise<ItemsResponse<T>> {
  const query = buildQueryParams(params);
  const response = await jellyfinClient.api.get<ItemsResponse<T>>(
    `/Users/${userId}/Items?${query.toString()}`
  );
  return response.data;
}

export async function getItem<T extends BaseItem = BaseItem>(
  userId: string,
  itemId: string
): Promise<T> {
  const response = await jellyfinClient.api.get<T>(
    `/Users/${userId}/Items/${itemId}?Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getResumeItems(
  userId: string,
  limit: number = 12
): Promise<ItemsResponse<BaseItem>> {
  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Users/${userId}/Items/Resume?Limit=${limit}&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getLatestMedia(
  userId: string,
  parentId?: string,
  limit: number = 16
): Promise<BaseItem[]> {
  const params = new URLSearchParams();
  params.set('Limit', limit.toString());
  params.set('Fields', DEFAULT_FIELDS.join(','));
  if (parentId) params.set('ParentId', parentId);

  const response = await jellyfinClient.api.get<BaseItem[]>(
    `/Users/${userId}/Items/Latest?${params.toString()}`
  );
  return response.data;
}

export async function getNextUp(
  userId: string,
  seriesId?: string,
  limit: number = 12
): Promise<ItemsResponse<Episode>> {
  const params = new URLSearchParams();
  params.set('Limit', limit.toString());
  params.set('Fields', DEFAULT_FIELDS.join(','));
  if (seriesId) params.set('SeriesId', seriesId);

  const response = await jellyfinClient.api.get<ItemsResponse<Episode>>(
    `/Shows/NextUp?UserId=${userId}&${params.toString()}`
  );
  return response.data;
}

export async function getSimilarItems(
  itemId: string,
  userId: string,
  limit: number = 12
): Promise<ItemsResponse<BaseItem>> {
  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Items/${itemId}/Similar?UserId=${userId}&Limit=${limit}&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getSeasons(
  seriesId: string,
  userId: string
): Promise<ItemsResponse<BaseItem>> {
  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Shows/${seriesId}/Seasons?UserId=${userId}&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getEpisodes(
  seriesId: string,
  userId: string,
  seasonId?: string
): Promise<ItemsResponse<Episode>> {
  const params = new URLSearchParams();
  params.set('UserId', userId);
  params.set('Fields', DEFAULT_FIELDS.join(','));
  if (seasonId) params.set('SeasonId', seasonId);

  const response = await jellyfinClient.api.get<ItemsResponse<Episode>>(
    `/Shows/${seriesId}/Episodes?${params.toString()}`
  );
  return response.data;
}

export async function getAlbumTracks(
  albumId: string,
  userId: string
): Promise<ItemsResponse<AudioTrack>> {
  const response = await jellyfinClient.api.get<ItemsResponse<AudioTrack>>(
    `/Users/${userId}/Items?ParentId=${albumId}&SortBy=IndexNumber&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getArtistAlbums(
  artistId: string,
  userId: string
): Promise<ItemsResponse<MusicAlbum>> {
  const response = await jellyfinClient.api.get<ItemsResponse<MusicAlbum>>(
    `/Users/${userId}/Items?ArtistIds=${artistId}&IncludeItemTypes=MusicAlbum&Recursive=true&SortBy=ProductionYear,SortName&SortOrder=Descending&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getArtists(
  userId: string,
  parentId?: string,
  options: {
    startIndex?: number;
    limit?: number;
    searchTerm?: string;
  } = {}
): Promise<ItemsResponse<BaseItem>> {
  const params = new URLSearchParams();
  params.set('UserId', userId);
  params.set('SortBy', 'SortName');
  params.set('SortOrder', 'Ascending');
  params.set('Fields', 'PrimaryImageAspectRatio,SortName,Overview');
  params.set('Recursive', 'true');

  if (parentId) params.set('ParentId', parentId);
  if (options.startIndex !== undefined) params.set('StartIndex', options.startIndex.toString());
  if (options.limit !== undefined) params.set('Limit', options.limit.toString());
  if (options.searchTerm) params.set('SearchTerm', options.searchTerm);

  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Artists/AlbumArtists?${params.toString()}`
  );
  return response.data;
}

function getSearchRelevance(name: string, term: string): number {
  const lowerName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lowerTerm = term.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (lowerName === lowerTerm) return 100;
  if (lowerName.startsWith(lowerTerm)) return 80;
  if (lowerName.includes(lowerTerm)) return 60;

  const nameWords = name.toLowerCase().split(/\s+/);
  for (const word of nameWords) {
    const cleanWord = word.replace(/[^a-z0-9]/g, '');
    if (cleanWord === lowerTerm) return 70;
    if (cleanWord.startsWith(lowerTerm)) return 50;
  }

  return 10;
}

export async function search(
  userId: string,
  searchTerm: string,
  limit: number = 50
): Promise<SearchResult> {
  const response = await jellyfinClient.api.get<SearchResult>(
    `/Search/Hints?UserId=${userId}&SearchTerm=${encodeURIComponent(searchTerm)}&Limit=${limit}`
  );

  if (response.data.SearchHints) {
    response.data.SearchHints.sort((a, b) => {
      const scoreA = getSearchRelevance(a.Name || '', searchTerm);
      const scoreB = getSearchRelevance(b.Name || '', searchTerm);
      return scoreB - scoreA;
    });
  }

  return response.data;
}

export async function markAsFavorite(
  userId: string,
  itemId: string,
  isFavorite: boolean
): Promise<void> {
  if (isFavorite) {
    await jellyfinClient.api.post(`/Users/${userId}/FavoriteItems/${itemId}`);
  } else {
    await jellyfinClient.api.delete(`/Users/${userId}/FavoriteItems/${itemId}`);
  }
}

export async function markAsPlayed(
  userId: string,
  itemId: string,
  played: boolean
): Promise<void> {
  if (played) {
    await jellyfinClient.api.post(`/Users/${userId}/PlayedItems/${itemId}`);
  } else {
    await jellyfinClient.api.delete(`/Users/${userId}/PlayedItems/${itemId}`);
  }
}

export async function getGenres(
  userId: string,
  parentId?: string,
  includeItemTypes?: string[]
): Promise<Genre[]> {
  const params = new URLSearchParams();
  params.set('UserId', userId);
  if (parentId) params.set('ParentId', parentId);
  if (includeItemTypes?.length) {
    params.set('IncludeItemTypes', includeItemTypes.join(','));
  }
  params.set('SortBy', 'SortName');
  params.set('SortOrder', 'Ascending');

  const response = await jellyfinClient.api.get<ItemsResponse<Genre>>(
    `/Genres?${params.toString()}`
  );
  return response.data.Items;
}

export interface CreatePlaylistResult {
  Id: string;
}

export async function createPlaylist(
  userId: string,
  name: string,
  itemIds?: string[]
): Promise<CreatePlaylistResult> {
  const params = new URLSearchParams();
  params.set('Name', name);
  params.set('UserId', userId);
  params.set('MediaType', 'Audio');
  if (itemIds?.length) {
    params.set('Ids', itemIds.join(','));
  }

  const response = await jellyfinClient.api.post<CreatePlaylistResult>(
    `/Playlists?${params.toString()}`
  );
  return response.data;
}

export async function addToPlaylist(
  playlistId: string,
  itemIds: string[],
  userId: string
): Promise<void> {
  const params = new URLSearchParams();
  params.set('Ids', itemIds.join(','));
  params.set('UserId', userId);

  await jellyfinClient.api.post(`/Playlists/${playlistId}/Items?${params.toString()}`);
}

export async function removeFromPlaylist(
  playlistId: string,
  entryIds: string[]
): Promise<void> {
  const params = new URLSearchParams();
  params.set('EntryIds', entryIds.join(','));

  await jellyfinClient.api.delete(`/Playlists/${playlistId}/Items?${params.toString()}`);
}

export async function getPlaylists(
  userId: string
): Promise<ItemsResponse<BaseItem>> {
  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Users/${userId}/Items?IncludeItemTypes=Playlist&Recursive=true&SortBy=SortName&SortOrder=Ascending&Fields=${DEFAULT_FIELDS.join(',')}`
  );
  return response.data;
}

export async function getPlaylistItems(
  playlistId: string,
  userId: string
): Promise<ItemsResponse<AudioTrack>> {
  const fields = [
    ...DEFAULT_FIELDS,
    'Artists',
    'AlbumArtist',
    'Album',
    'AlbumId',
    'AlbumPrimaryImageTag',
    'ParentId',
    'PrimaryImageAspectRatio',
  ];

  const response = await jellyfinClient.api.get<ItemsResponse<AudioTrack>>(
    `/Playlists/${playlistId}/Items?UserId=${userId}&Fields=${fields.join(',')}`
  );
  return response.data;
}

// Person/Cast API
export interface PersonDetails {
  Id: string;
  Name: string;
  Overview?: string;
  PremiereDate?: string;
  ProductionYear?: number;
  EndDate?: string;
  ImageTags?: { Primary?: string };
  BackdropImageTags?: string[];
  Type: string;
}

export async function getPerson(personId: string, userId: string): Promise<PersonDetails> {
  const response = await jellyfinClient.api.get<PersonDetails>(
    `/Users/${userId}/Items/${personId}`
  );
  return response.data;
}

export async function getPersonItems(
  personId: string,
  userId: string,
  options: {
    includeItemTypes?: string[];
    limit?: number;
  } = {}
): Promise<ItemsResponse<BaseItem>> {
  const params = new URLSearchParams();
  params.set('PersonIds', personId);
  params.set('UserId', userId);
  params.set('Recursive', 'true');
  params.set('SortBy', 'PremiereDate,SortName');
  params.set('SortOrder', 'Descending');
  params.set('Fields', DEFAULT_FIELDS.join(','));

  if (options.includeItemTypes?.length) {
    params.set('IncludeItemTypes', options.includeItemTypes.join(','));
  } else {
    params.set('IncludeItemTypes', 'Movie,Series');
  }
  if (options.limit) {
    params.set('Limit', options.limit.toString());
  }

  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Users/${userId}/Items?${params.toString()}`
  );
  return response.data;
}

export async function getSuggestions(
  userId: string,
  limit: number = 12,
  itemTypes: string[] = ['Movie']
): Promise<BaseItem[]> {
  const params = new URLSearchParams();
  // Request more items so we have enough after filtering
  params.set('Limit', (limit * 3).toString());
  params.set('Fields', DEFAULT_FIELDS.join(','));
  if (itemTypes.length > 0) {
    params.set('IncludeItemTypes', itemTypes.join(','));
  }

  const response = await jellyfinClient.api.get<{ Items: BaseItem[] }>(
    `/Users/${userId}/Suggestions?${params.toString()}`
  );

  // Filter client-side in case API doesn't respect IncludeItemTypes
  const items = response.data.Items ?? [];
  const filtered = itemTypes.length > 0
    ? items.filter(item => itemTypes.includes(item.Type ?? ''))
    : items;

  return filtered.slice(0, limit);
}

export async function getFavorites(
  userId: string,
  itemTypes: string[],
  limit: number = 12
): Promise<ItemsResponse<BaseItem>> {
  const params = new URLSearchParams();
  params.set('IncludeItemTypes', itemTypes.join(','));
  params.set('Filters', 'IsFavorite');
  params.set('SortBy', 'DateCreated');
  params.set('SortOrder', 'Descending');
  params.set('Recursive', 'true');
  params.set('Limit', limit.toString());
  params.set('Fields', DEFAULT_FIELDS.join(','));

  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Users/${userId}/Items?${params.toString()}`
  );
  return response.data;
}

export async function getFavoriteSongs(
  userId: string
): Promise<ItemsResponse<BaseItem>> {
  const libraries = await getLibraries(userId);
  const musicLib = libraries.find(lib => lib.CollectionType === 'music');

  if (!musicLib) {
    return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
  }

  const fields = [
    'Artists',
    'AlbumArtist',
    'Album',
    'AlbumId',
    'AlbumPrimaryImageTag',
    'UserData',
    'RunTimeTicks',
  ];

  const response = await jellyfinClient.api.get<ItemsResponse<BaseItem>>(
    `/Users/${userId}/Items?ParentId=${musicLib.Id}&IncludeItemTypes=Audio&Filters=IsFavorite&Recursive=true&SortBy=DateCreated&SortOrder=Descending&Limit=100&Fields=${fields.join(',')}`
  );

  return response.data;
}

export interface GroupedLibraries {
  collectionType: CollectionType;
  libraries: Library[];
  label: string;
  icon: string;
}

export function groupLibrariesByType(libraries: Library[]): GroupedLibraries[] {
  const groups: Record<string, Library[]> = {};

  for (const library of libraries) {
    const type = library.CollectionType ?? 'mixed';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(library);
  }

  return Object.entries(groups).map(([type, libs]) => {
    const config = COLLECTION_TYPE_CONFIG[type] ?? DEFAULT_LIBRARY_CONFIG;
    return {
      collectionType: type as CollectionType,
      libraries: libs,
      label: config.label,
      icon: config.icon,
    };
  });
}

export function getLibrariesByType(libraries: Library[], collectionType: CollectionType): Library[] {
  return libraries.filter(lib => lib.CollectionType === collectionType);
}

export function getLibraryIdsByType(libraries: Library[], collectionType: CollectionType): string[] {
  return getLibrariesByType(libraries, collectionType).map(lib => lib.Id);
}

export async function getLatestMediaFromMultipleLibraries(
  userId: string,
  parentIds: string[],
  limit: number = 16
): Promise<BaseItem[]> {
  if (parentIds.length === 0) return [];

  const results = await Promise.all(
    parentIds.map(parentId => getLatestMedia(userId, parentId, limit))
  );

  const allItems = results.flat();

  allItems.sort((a, b) => {
    const dateA = (a as any).DateCreated ?? '';
    const dateB = (b as any).DateCreated ?? '';
    return dateB.localeCompare(dateA);
  });

  return allItems.slice(0, limit);
}

export async function getItemsFromMultipleLibraries<T extends BaseItem = BaseItem>(
  userId: string,
  parentIds: string[],
  params: Omit<LibraryQueryParams, 'parentId'> = {}
): Promise<ItemsResponse<T>> {
  if (parentIds.length === 0) {
    return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
  }

  if (parentIds.length === 1) {
    return getItems<T>(userId, { ...params, parentId: parentIds[0] });
  }

  const results = await Promise.all(
    parentIds.map(parentId => getItems<T>(userId, { ...params, parentId }))
  );

  const allItems = results.flatMap(r => r.Items);
  const totalCount = results.reduce((sum, r) => sum + r.TotalRecordCount, 0);

  if (params.sortBy === 'SortName') {
    allItems.sort((a, b) => {
      const nameA = a.SortName ?? a.Name ?? '';
      const nameB = b.SortName ?? b.Name ?? '';
      return params.sortOrder === 'Descending'
        ? nameB.localeCompare(nameA)
        : nameA.localeCompare(nameB);
    });
  } else if (params.sortBy === 'DateCreated') {
    allItems.sort((a, b) => {
      const dateA = (a as any).DateCreated ?? '';
      const dateB = (b as any).DateCreated ?? '';
      return params.sortOrder === 'Descending'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });
  } else if (params.sortBy === 'PremiereDate') {
    allItems.sort((a, b) => {
      const yearA = a.ProductionYear ?? 0;
      const yearB = b.ProductionYear ?? 0;
      return params.sortOrder === 'Descending' ? yearB - yearA : yearA - yearB;
    });
  } else if (params.sortBy === 'CommunityRating') {
    allItems.sort((a, b) => {
      const ratingA = a.CommunityRating ?? 0;
      const ratingB = b.CommunityRating ?? 0;
      return params.sortOrder === 'Descending' ? ratingB - ratingA : ratingA - ratingB;
    });
  }

  const startIndex = params.startIndex ?? 0;
  const limit = params.limit ?? allItems.length;
  const paginatedItems = allItems.slice(startIndex, startIndex + limit);

  return {
    Items: paginatedItems,
    TotalRecordCount: totalCount,
    StartIndex: startIndex,
  };
}
