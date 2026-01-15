import type { SonarrCalendarEpisode } from '@/api/external/sonarr';

export const SONARR_BLUE = '#35c5f4';
export const SONARR_DARK = '#1a3a4a';
export const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

export type ViewMode = 'week' | 'month';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  episodes: SonarrCalendarEpisode[];
}
