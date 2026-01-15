import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors } from '@/theme';
import { SONARR_BLUE } from './constants';

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

export function getStatusColor(episode: SonarrCalendarEpisode): string {
  if (episode.hasFile) return colors.status.success;
  if (!episode.monitored) return colors.text.tertiary;
  if (episode.grabbed) return SONARR_BLUE;
  return colors.status.warning;
}

export function getStatusText(episode: SonarrCalendarEpisode): string {
  if (episode.hasFile) return 'Downloaded';
  if (!episode.monitored) return 'Unmonitored';
  if (episode.grabbed) return 'Downloading';
  return 'Missing';
}
