import type { RadarrCalendarMovie } from '@/api/external/radarr';

export type ViewMode = 'week' | 'month';

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  movies: RadarrCalendarMovie[];
}
