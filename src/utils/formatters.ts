// Time formatting utilities

/**
 * Convert ticks (100-nanosecond intervals) to milliseconds
 */
export function ticksToMs(ticks: number): number {
  return Math.floor(ticks / 10000);
}

/**
 * Convert milliseconds to ticks
 */
export function msToTicks(ms: number): number {
  return ms * 10000;
}

/**
 * Format milliseconds to readable duration (e.g., "2h 30m" or "45m 30s")
 */
export function formatDuration(ms: number, includeSeconds = false): string {
  if (!ms || ms < 0) return '0m';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }

  if (includeSeconds && (seconds > 0 || parts.length === 0)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ') || '0m';
}

/**
 * Format milliseconds to player timestamp (e.g., "2:30:45" or "45:30")
 */
export function formatPlayerTime(ms: number): string {
  if (!ms || ms < 0) return '0:00';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format bitrate to human readable format
 */
export function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000000) {
    return `${(bitrate / 1000000).toFixed(1)} Mbps`;
  }
  if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)} Kbps`;
  }
  return `${bitrate} bps`;
}

/**
 * Format date to relative time (e.g., "2 days ago", "in 3 hours")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffSecs = Math.abs(Math.floor(diffMs / 1000));
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isFuture = diffMs > 0;
  const prefix = isFuture ? 'in ' : '';
  const suffix = isFuture ? '' : ' ago';

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${prefix}${diffMins}m${suffix}`;
  if (diffHours < 24) return `${prefix}${diffHours}h${suffix}`;
  if (diffDays < 7) return `${prefix}${diffDays}d${suffix}`;
  if (diffWeeks < 4) return `${prefix}${diffWeeks}w${suffix}`;
  if (diffMonths < 12) return `${prefix}${diffMonths}mo${suffix}`;
  return `${prefix}${diffYears}y${suffix}`;
}

/**
 * Format date to localized string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const target = new Date(date);
  return target.toLocaleDateString(undefined, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format year from date
 */
export function formatYear(date: Date | string | number | undefined): string {
  if (!date) return '';
  if (typeof date === 'number') return date.toString();
  return new Date(date).getFullYear().toString();
}

/**
 * Format rating (e.g., 7.5 -> "7.5", 7.567 -> "7.6")
 */
export function formatRating(rating: number | undefined): string {
  if (!rating) return '';
  return rating.toFixed(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

/**
 * Pluralize word based on count
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  return plural ?? `${singular}s`;
}

/**
 * Format episode number (e.g., "S01E05")
 */
export function formatEpisodeNumber(season?: number, episode?: number): string {
  if (!season && !episode) return '';
  const s = season ? `S${season.toString().padStart(2, '0')}` : '';
  const e = episode ? `E${episode.toString().padStart(2, '0')}` : '';
  return `${s}${e}`;
}
