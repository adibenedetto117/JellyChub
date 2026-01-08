import { useSettingsStore } from '@/stores/settingsStore';

export const colors = {
  // Background colors
  background: {
    primary: '#0a0a0a',
    secondary: '#141414',
    tertiary: '#1c1c1c',
  },

  // Surface colors (elevated)
  surface: {
    default: '#1c1c1c',
    elevated: '#242424',
    highlight: '#2a2a2a',
  },

  // Accent colors - modern sky blue (default)
  accent: {
    primary: '#0ea5e9',
    light: '#38bdf8',
    dark: '#0284c7',
    subtle: '#0369a1',
  },

  // Text colors with opacity
  text: {
    primary: 'rgba(255, 255, 255, 1)',
    secondary: 'rgba(255, 255, 255, 0.7)',
    tertiary: 'rgba(255, 255, 255, 0.5)',
    muted: 'rgba(255, 255, 255, 0.3)',
  },

  // Status colors
  status: {
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },

  // Border colors
  border: {
    default: 'rgba(255, 255, 255, 0.15)',
    subtle: 'rgba(255, 255, 255, 0.08)',
    strong: 'rgba(255, 255, 255, 0.25)',
  },

  // Gradient presets
  gradients: {
    accent: ['#0ea5e9', '#06b6d4'],
    dark: ['#1c1c1c', '#0a0a0a'],
    card: ['rgba(28, 28, 28, 0.8)', 'rgba(20, 20, 20, 0.95)'],
  },
} as const;

export type ColorTheme = typeof colors;

/**
 * Gets the current accent color from settings.
 * Use this function when you need the accent color outside of React components.
 * For React components, prefer using the useAccentColor hook.
 */
export function getAccentColor(): string {
  return useSettingsStore.getState().accentColor;
}

/**
 * Generates lighter and darker variants of a hex color.
 * Useful for creating accent color variants dynamically.
 */
export function getAccentColorVariants(baseColor: string): {
  primary: string;
  light: string;
  dark: string;
  subtle: string;
} {
  // Parse hex color
  const hex = baseColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Generate lighter variant (increase brightness by ~20%)
  const lighten = (value: number) => Math.min(255, Math.round(value + (255 - value) * 0.25));
  const lightR = lighten(r);
  const lightG = lighten(g);
  const lightB = lighten(b);

  // Generate darker variant (decrease brightness by ~20%)
  const darken = (value: number) => Math.round(value * 0.8);
  const darkR = darken(r);
  const darkG = darken(g);
  const darkB = darken(b);

  // Generate subtle variant (even darker, ~60%)
  const subtleR = Math.round(r * 0.6);
  const subtleG = Math.round(g * 0.6);
  const subtleB = Math.round(b * 0.6);

  const toHex = (val: number) => val.toString(16).padStart(2, '0');

  return {
    primary: baseColor,
    light: `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`,
    dark: `#${toHex(darkR)}${toHex(darkG)}${toHex(darkB)}`,
    subtle: `#${toHex(subtleR)}${toHex(subtleG)}${toHex(subtleB)}`,
  };
}
