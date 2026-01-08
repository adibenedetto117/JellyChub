import type { BaseItem, Episode } from '@/types/jellyfin';

const PLACEHOLDER_MOVIES = [
  'The Adventure',
  'Space Journey',
  'Comedy Night',
  'Action Hero',
  'Midnight Mystery',
  'Summer Romance',
  'The Last Stand',
  'Ocean Dreams',
  'City Lights',
  'Mountain Peak',
  'Desert Storm',
  'Forest Tales',
];

const PLACEHOLDER_TV_SHOWS = [
  'The Series',
  'Drama Chronicles',
  'Sitcom Family',
  'Mystery Files',
  'Medical Center',
  'Law & Order',
  'Sci-Fi Station',
  'Comedy Hour',
  'Crime Stories',
  'Fantasy Realm',
  'Teen Drama',
  'Reality Show',
];

const PLACEHOLDER_MUSIC_ALBUMS = [
  'Greatest Hits',
  'Summer Album',
  'Rock Collection',
  'Jazz Sessions',
  'Classical Works',
  'Pop Anthems',
  'Indie Sounds',
  'Electronic Beats',
  'Country Roads',
  'Blues Masters',
  'Hip Hop Essentials',
  'World Music',
];

const PLACEHOLDER_BOOKS = [
  'Novel Title',
  'Mystery Book',
  'Fantasy Epic',
  'Science Fiction',
  'Romance Story',
  'Thriller Novel',
  'Biography',
  'History Volume',
  'Self Help Guide',
  'Cookbook',
  'Travel Guide',
  'Poetry Collection',
];

const PLACEHOLDER_EPISODES = [
  'Pilot',
  'The Beginning',
  'New Horizons',
  'Turning Point',
  'The Return',
  'Secrets Revealed',
  'The Journey',
  'Final Chapter',
  'Reunion',
  'Discovery',
  'The Challenge',
  'Resolution',
];

const PLACEHOLDER_SERIES_NAMES = [
  'The Show',
  'Chronicles',
  'Adventures',
  'Stories',
  'Tales',
  'Files',
  'Mysteries',
  'Drama',
];

const PLACEHOLDER_ARTISTS = [
  'Artist Name',
  'The Band',
  'Solo Artist',
  'Music Group',
  'Ensemble',
  'Orchestra',
];

function getPlaceholderByType(itemType: string | undefined, index: number): string {
  const safeIndex = Math.abs(index);

  switch (itemType?.toLowerCase()) {
    case 'movie':
      return PLACEHOLDER_MOVIES[safeIndex % PLACEHOLDER_MOVIES.length];
    case 'series':
      return PLACEHOLDER_TV_SHOWS[safeIndex % PLACEHOLDER_TV_SHOWS.length];
    case 'musicalbum':
      return PLACEHOLDER_MUSIC_ALBUMS[safeIndex % PLACEHOLDER_MUSIC_ALBUMS.length];
    case 'book':
    case 'audiobook':
      return PLACEHOLDER_BOOKS[safeIndex % PLACEHOLDER_BOOKS.length];
    case 'episode':
      return PLACEHOLDER_EPISODES[safeIndex % PLACEHOLDER_EPISODES.length];
    case 'audio':
      return `Track ${(safeIndex % 12) + 1}`;
    case 'musicartist':
    case 'artist':
      return PLACEHOLDER_ARTISTS[safeIndex % PLACEHOLDER_ARTISTS.length];
    default:
      return PLACEHOLDER_MOVIES[safeIndex % PLACEHOLDER_MOVIES.length];
  }
}

function getPlaceholderSeriesName(index: number): string {
  return PLACEHOLDER_SERIES_NAMES[Math.abs(index) % PLACEHOLDER_SERIES_NAMES.length];
}

function getPlaceholderArtist(index: number): string {
  return PLACEHOLDER_ARTISTS[Math.abs(index) % PLACEHOLDER_ARTISTS.length];
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getDisplayName(
  item: BaseItem | Episode | null | undefined,
  hideMedia: boolean
): string {
  if (!item) return '';
  if (!hideMedia) {
    return item.Name ?? '';
  }

  const index = hashCode(item.Id ?? '');
  return getPlaceholderByType(item.Type, index);
}

export function getDisplaySeriesName(
  item: Episode | null | undefined,
  hideMedia: boolean
): string {
  if (!item) return '';
  if (!hideMedia) {
    return item.SeriesName ?? '';
  }

  const index = hashCode(item.SeriesId ?? item.Id ?? '');
  return getPlaceholderSeriesName(index);
}

export function getDisplayArtist(
  artists: string[] | undefined,
  hideMedia: boolean
): string[] {
  if (!hideMedia || !artists || !Array.isArray(artists)) {
    return Array.isArray(artists) ? artists : [];
  }

  return artists.map((_, index) => getPlaceholderArtist(index));
}

export function getDisplayYear(
  year: number | undefined,
  hideMedia: boolean
): number | undefined {
  if (!hideMedia) {
    return year;
  }
  return 2024;
}

const PLACEHOLDER_GRADIENT_COLORS = [
  ['#1a1a2e', '#16213e'],
  ['#0f3460', '#1a1a2e'],
  ['#2d132c', '#801336'],
  ['#1b262c', '#0f4c75'],
  ['#222831', '#393e46'],
  ['#2b2e4a', '#53354a'],
  ['#3d1f1f', '#a64452'],
  ['#1e3d59', '#f5f0e1'],
  ['#1f4037', '#99f2c8'],
  ['#141e30', '#243b55'],
  ['#232526', '#414345'],
  ['#0f2027', '#203a43'],
];

export function getPlaceholderImageUrl(
  itemId: string,
  imageType: string = 'Primary'
): string {
  const index = hashCode(itemId) % PLACEHOLDER_GRADIENT_COLORS.length;
  const colors = PLACEHOLDER_GRADIENT_COLORS[index];
  const color1 = colors[0].replace('#', '');
  const color2 = colors[1].replace('#', '');

  const width = imageType === 'Backdrop' ? 400 : 200;
  const height = imageType === 'Backdrop' ? 225 : 300;

  return `https://placehold.co/${width}x${height}/${color1}/${color2}`;
}

export function getDisplayImageUrl(
  itemId: string | undefined,
  imageUrl: string | null,
  hideMedia: boolean,
  imageType: string = 'Primary'
): string | null {
  if (!hideMedia) {
    return imageUrl;
  }

  return getPlaceholderImageUrl(itemId ?? 'default', imageType);
}

export function getDisplayUsername(
  username: string | undefined,
  hideMedia: boolean
): string {
  if (!hideMedia) {
    return username ?? '';
  }
  return 'User';
}

export function getDisplayServerName(
  serverName: string | undefined,
  hideMedia: boolean
): string {
  if (!hideMedia) {
    return serverName ?? '';
  }
  return 'Media Server';
}
