import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

export const typography = {
  fonts: fontFamily,

  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  lineHeights: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },

  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

// Text style presets
export const textStyles = {
  // Headers
  h1: {
    fontSize: typography.sizes['4xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['4xl'] * typography.lineHeights.tight,
  },
  h2: {
    fontSize: typography.sizes['3xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
  },
  h3: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
  },
  h4: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
  },

  // Body text
  body: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  bodySmall: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },

  // Labels
  label: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
  },
  labelSmall: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },

  // Captions
  caption: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.regular,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
  },
} as const;

export type Typography = typeof typography;
export type TextStyles = typeof textStyles;
