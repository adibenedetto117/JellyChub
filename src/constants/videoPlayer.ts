/**
 * Video player constants
 */

export const VIDEO_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;

export type VideoSpeed = typeof VIDEO_SPEED_OPTIONS[number];

export const QUALITY_OPTIONS = [
  { value: 'auto', label: 'Auto', desc: 'Adapts to connection' },
  { value: 'original', label: 'Original', desc: 'Direct stream • No transcoding' },
  { value: '1080p', label: '1080p', desc: '~8 Mbps • High quality' },
  { value: '720p', label: '720p', desc: '~4 Mbps • Good quality' },
  { value: '480p', label: '480p', desc: '~2 Mbps • Data saver' },
] as const;

export type StreamingQuality = typeof QUALITY_OPTIONS[number]['value'];

// Note: Language code mappings and getLanguageVariants moved to audioLanguages.ts

/**
 * Player gesture zone widths
 */
export const GESTURE_ZONE_WIDTH = 100;
export const CENTER_DEADZONE_START_RATIO = 0.35;
export const CENTER_DEADZONE_END_RATIO = 0.65;

/**
 * Seek amounts in milliseconds
 */
export const SEEK_AMOUNT_MS = 10000;
export const FAST_SEEK_AMOUNT_MS = 30000;

/**
 * Default buffer settings
 */
export const BUFFER_OPTIONS = {
  preferredForwardBufferDuration: 30, // Buffer 30 seconds ahead
  minBufferForPlayback: 5, // Require 5 seconds buffered before playing (Android)
  waitsToMinimizeStalling: true, // Auto-pause to buffer if needed (iOS)
};

/**
 * Controls hide delay in milliseconds
 */
export const CONTROLS_HIDE_DELAY = 4000;

/**
 * Progress report interval in milliseconds
 */
export const PROGRESS_REPORT_INTERVAL = 30000;

/**
 * Subtitle load retry settings
 */
export const SUBTITLE_LOAD_MAX_RETRIES = 2;
export const SUBTITLE_LOAD_TIMEOUT = 15000;
