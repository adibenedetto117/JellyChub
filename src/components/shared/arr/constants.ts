/**
 * Shared constants for Sonarr/Radarr components
 */

// Sonarr branding
export const SONARR_BLUE = '#35c5f4';
export const SONARR_DARK = '#1a3a4a';
export const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

// Radarr branding
export const RADARR_GOLD = '#ffc230';
export const RADARR_DARK = '#3d3d00';
export const RADARR_GRADIENT = ['#ffc230', '#d4a020', '#a88010'] as const;

// Common filter/sort types
export type ViewMode = 'list' | 'grid';

// Size ranges for manual search filtering
export const SIZE_RANGES = [
  { label: 'Any', min: 0, max: Infinity },
  { label: '< 1GB', min: 0, max: 1073741824 },
  { label: '1-5GB', min: 1073741824, max: 5368709120 },
  { label: '5-10GB', min: 5368709120, max: 10737418240 },
  { label: '> 10GB', min: 10737418240, max: Infinity },
];

// Quality badge colors
export function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('uhd') || q.includes('4k')) return '#8b5cf6';
  if (q.includes('1080')) return '#22c55e';
  if (q.includes('720')) return '#3b82f6';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return '#6b7280';
}
