import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors } from '@/theme';
import { RADARR_ORANGE } from './constants';

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function getWeekDays(): string[] {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
}

export function getMonthName(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + (6 - end.getDay()));
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getStatusColor(movie: RadarrCalendarMovie): string {
  if (movie.hasFile) return colors.status.success;
  if (!movie.monitored) return colors.text.tertiary;
  if (movie.grabbed) return RADARR_ORANGE;
  return colors.status.warning;
}

export function getStatusText(movie: RadarrCalendarMovie): string {
  if (movie.hasFile) return 'Downloaded';
  if (!movie.monitored) return 'Unmonitored';
  if (movie.grabbed) return 'Downloading';
  return 'Missing';
}

export function getReleaseType(movie: RadarrCalendarMovie): string {
  if (movie.digitalRelease) return 'Digital';
  if (movie.physicalRelease) return 'Physical';
  if (movie.inCinemas) return 'In Cinemas';
  return 'Release';
}
