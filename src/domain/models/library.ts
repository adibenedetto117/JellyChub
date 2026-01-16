import type { MediaType, MediaProvider } from './media';

export type LibraryType =
  | 'movies'
  | 'tvshows'
  | 'music'
  | 'books'
  | 'audiobooks'
  | 'photos'
  | 'homevideos'
  | 'mixed'
  | 'livetv'
  | 'playlists';

export interface Library {
  id: string;
  name: string;
  type: LibraryType;
  serverId: string;
  provider: MediaProvider;

  imageUrl?: string;
  backdropUrl?: string;

  itemTypes: MediaType[];
  itemCount?: number;

  isVisible: boolean;
  sortOrder?: number;

  paths?: string[];
  refreshStatus?: LibraryRefreshStatus;
}

export interface LibraryRefreshStatus {
  isRefreshing: boolean;
  lastRefreshedAt?: string;
  progress?: number;
  currentItem?: string;
}

export interface LibraryStats {
  libraryId: string;
  movieCount: number;
  seriesCount: number;
  episodeCount: number;
  albumCount: number;
  trackCount: number;
  artistCount: number;
  bookCount: number;
  totalSize?: number;
}

export const LIBRARY_TYPE_CONFIG: Record<LibraryType, {
  label: string;
  icon: string;
  itemTypes: MediaType[];
  cardVariant: 'poster' | 'square' | 'backdrop';
}> = {
  movies: {
    label: 'Movies',
    icon: 'film',
    itemTypes: ['movie'],
    cardVariant: 'poster',
  },
  tvshows: {
    label: 'TV Shows',
    icon: 'tv',
    itemTypes: ['series'],
    cardVariant: 'poster',
  },
  music: {
    label: 'Music',
    icon: 'musical-notes',
    itemTypes: ['album', 'artist', 'track'],
    cardVariant: 'square',
  },
  books: {
    label: 'Books',
    icon: 'book',
    itemTypes: ['book'],
    cardVariant: 'poster',
  },
  audiobooks: {
    label: 'Audiobooks',
    icon: 'headset',
    itemTypes: ['audiobook'],
    cardVariant: 'square',
  },
  photos: {
    label: 'Photos',
    icon: 'images',
    itemTypes: [],
    cardVariant: 'square',
  },
  homevideos: {
    label: 'Home Videos',
    icon: 'videocam',
    itemTypes: [],
    cardVariant: 'backdrop',
  },
  mixed: {
    label: 'Mixed Content',
    icon: 'grid',
    itemTypes: ['movie', 'series'],
    cardVariant: 'poster',
  },
  livetv: {
    label: 'Live TV',
    icon: 'radio',
    itemTypes: ['channel', 'program'],
    cardVariant: 'backdrop',
  },
  playlists: {
    label: 'Playlists',
    icon: 'list',
    itemTypes: ['playlist'],
    cardVariant: 'square',
  },
};
