import type { BaseItem, ImageType, ImageOptions, MediaStream, MediaSource } from '@/types/jellyfin';

/**
 * Get image URL for a Jellyfin item
 */
export function getImageUrl(
  serverUrl: string,
  itemId: string,
  options: ImageOptions = {}
): string {
  const {
    type = 'Primary',
    maxWidth,
    maxHeight,
    quality = 90,
    tag,
  } = options;

  const params = new URLSearchParams();
  if (maxWidth) params.set('maxWidth', maxWidth.toString());
  if (maxHeight) params.set('maxHeight', maxHeight.toString());
  params.set('quality', quality.toString());
  if (tag) params.set('tag', tag);

  return `${serverUrl}/Items/${itemId}/Images/${type}?${params.toString()}`;
}

/**
 * Get primary image URL with fallback dimensions
 */
export function getPrimaryImageUrl(
  serverUrl: string,
  item: BaseItem,
  size: 'small' | 'medium' | 'large' = 'medium'
): string | null {
  const tag = item.ImageTags?.Primary;
  if (!tag) return null;

  const dimensions = {
    small: { maxWidth: 200, maxHeight: 300 },
    medium: { maxWidth: 400, maxHeight: 600 },
    large: { maxWidth: 800, maxHeight: 1200 },
  };

  return getImageUrl(serverUrl, item.Id, {
    type: 'Primary',
    ...dimensions[size],
    tag,
  });
}

/**
 * Get backdrop image URL
 */
export function getBackdropUrl(
  serverUrl: string,
  item: BaseItem,
  index = 0,
  maxWidth = 1920
): string | null {
  const tags = item.BackdropImageTags;
  if (!tags || tags.length === 0) return null;

  const tag = tags[Math.min(index, tags.length - 1)];
  return getImageUrl(serverUrl, item.Id, {
    type: 'Backdrop',
    maxWidth,
    tag,
  });
}

/**
 * Get the best video stream from media source
 */
export function getVideoStream(mediaSource: MediaSource): MediaStream | undefined {
  return mediaSource.MediaStreams.find(s => s.Type === 'Video');
}

/**
 * Get all audio streams from media source
 */
export function getAudioStreams(mediaSource: MediaSource): MediaStream[] {
  return mediaSource.MediaStreams.filter(s => s.Type === 'Audio');
}

/**
 * Get all subtitle streams from media source
 */
export function getSubtitleStreams(mediaSource: MediaSource): MediaStream[] {
  return mediaSource.MediaStreams.filter(s => s.Type === 'Subtitle');
}

/**
 * Get default audio stream
 */
export function getDefaultAudioStream(mediaSource: MediaSource): MediaStream | undefined {
  const audioStreams = getAudioStreams(mediaSource);
  return audioStreams.find(s => s.IsDefault) ?? audioStreams[0];
}

/**
 * Get default subtitle stream
 */
export function getDefaultSubtitleStream(mediaSource: MediaSource): MediaStream | undefined {
  const subtitleStreams = getSubtitleStreams(mediaSource);
  return subtitleStreams.find(s => s.IsDefault);
}

/**
 * Get video resolution label
 */
export function getResolutionLabel(stream: MediaStream): string {
  if (!stream.Width || !stream.Height) return 'Unknown';

  const height = stream.Height;
  if (height >= 2160) return '4K';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  return `${height}p`;
}

/**
 * Get audio channel label
 */
export function getAudioChannelLabel(channels?: number): string {
  if (!channels) return '';
  if (channels === 1) return 'Mono';
  if (channels === 2) return 'Stereo';
  if (channels === 6) return '5.1';
  if (channels === 8) return '7.1';
  return `${channels}ch`;
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(code?: string): string {
  if (!code) return 'Unknown';

  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'language' });
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * Sort items by premiere date (newest first)
 */
export function sortByPremiereDate<T extends BaseItem>(items: T[], ascending = false): T[] {
  return [...items].sort((a, b) => {
    const dateA = a.PremiereDate ? new Date(a.PremiereDate).getTime() : 0;
    const dateB = b.PremiereDate ? new Date(b.PremiereDate).getTime() : 0;
    return ascending ? dateA - dateB : dateB - dateA;
  });
}

/**
 * Sort items by name
 */
export function sortByName<T extends BaseItem>(items: T[]): T[] {
  return [...items].sort((a, b) => a.Name.localeCompare(b.Name));
}

/**
 * Sort items by rating (highest first)
 */
export function sortByRating<T extends BaseItem>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.CommunityRating ?? 0) - (a.CommunityRating ?? 0));
}

/**
 * Filter items with unwatched content
 */
export function filterUnwatched<T extends BaseItem>(items: T[]): T[] {
  return items.filter(item => !item.UserData?.Played);
}

/**
 * Filter favorite items
 */
export function filterFavorites<T extends BaseItem>(items: T[]): T[] {
  return items.filter(item => item.UserData?.IsFavorite);
}

/**
 * Get watch progress percentage
 */
export function getWatchProgress(item: BaseItem): number {
  if (!item.UserData?.PlaybackPositionTicks || !item.RunTimeTicks) return 0;
  return Math.min(100, (item.UserData.PlaybackPositionTicks / item.RunTimeTicks) * 100);
}

/**
 * Check if item is in progress (started but not finished)
 */
export function isInProgress(item: BaseItem): boolean {
  const progress = getWatchProgress(item);
  return progress > 0 && progress < 90 && !item.UserData?.Played;
}

/**
 * Get item type icon name
 */
export function getItemTypeIcon(type: BaseItem['Type']): string {
  const icons: Record<string, string> = {
    Movie: 'film',
    Series: 'tv',
    Episode: 'play-circle',
    MusicAlbum: 'disc',
    Audio: 'music',
    Book: 'book-open',
    AudioBook: 'headphones',
  };
  return icons[type] ?? 'file';
}
