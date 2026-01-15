import type { DownloadItem } from '@/types';

export type ContentTab = 'movies' | 'tvshows' | 'music' | 'books';

export interface SeriesGroup {
  seriesId: string;
  seriesName: string;
  seasons: SeasonGroup[];
  totalSize: number;
  episodeCount: number;
}

export interface SeasonGroup {
  seasonNumber: number;
  episodes: DownloadItem[];
  totalSize: number;
}

export interface ArtistGroup {
  artistName: string;
  albums: AlbumGroup[];
  totalSize: number;
  trackCount: number;
}

export interface AlbumGroup {
  albumId: string;
  albumName: string;
  tracks: DownloadItem[];
  totalSize: number;
}
