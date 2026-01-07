export const spacing = {
  // Base spacing scale (4px increments)
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
  36: 144,
  40: 160,
  44: 176,
  48: 192,
  52: 208,
  56: 224,
  60: 240,
  64: 256,
  72: 288,
  80: 320,
  96: 384,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

// Screen padding for different contexts
export const screenPadding = {
  mobile: spacing[4],
  tablet: spacing[6],
  tv: spacing[8],
} as const;

// Card sizes
export const cardSizes = {
  poster: {
    small: { width: 100, height: 150 },
    medium: { width: 140, height: 210 },
    large: { width: 180, height: 270 },
  },
  backdrop: {
    small: { width: 200, height: 113 },
    medium: { width: 320, height: 180 },
    large: { width: 480, height: 270 },
  },
  avatar: {
    small: 32,
    medium: 48,
    large: 64,
    xl: 96,
  },
} as const;

export type Spacing = typeof spacing;
export type BorderRadius = typeof borderRadius;
