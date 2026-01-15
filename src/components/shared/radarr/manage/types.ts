export type TabType = 'library' | 'queue' | 'search';
export type FilterType = 'all' | 'downloaded' | 'missing' | 'unmonitored';
export type SortType = 'title' | 'added' | 'year' | 'size';

export interface Stats {
  total: number;
  downloaded: number;
  missing: number;
  queue: number;
}
