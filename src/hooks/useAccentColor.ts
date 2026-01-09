import { useMemo } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { getAccentColorVariants, hexToRgba } from '@/theme/colors';

export interface AccentColorVariants {
  /** The primary accent color (user-selected) */
  primary: string;
  /** Lighter variant (~20% brighter) */
  light: string;
  /** Darker variant (~20% darker) */
  dark: string;
  /** Very dark variant (~60% darker) - good for backgrounds */
  subtle: string;
}

export interface AccentColorUtils {
  /** All accent color variants */
  variants: AccentColorVariants;
  /** Get accent color with specified opacity */
  withOpacity: (opacity: number) => string;
  /** Get light variant with opacity */
  lightWithOpacity: (opacity: number) => string;
  /** Get dark variant with opacity */
  darkWithOpacity: (opacity: number) => string;
  /** Get subtle variant with opacity */
  subtleWithOpacity: (opacity: number) => string;
}

/**
 * Hook to access accent color and its variants reactively.
 * Re-renders component when accent color changes in settings.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const accent = useAccentColor();
 *
 *   return (
 *     <View style={{ backgroundColor: accent.primary }}>
 *       <View style={{ borderColor: accent.variants.light }} />
 *       <View style={{ backgroundColor: accent.withOpacity(0.2) }} />
 *     </View>
 *   );
 * }
 * ```
 */
export function useAccentColor(): string & AccentColorUtils {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const result = useMemo(() => {
    const variants = getAccentColorVariants(accentColor);

    // Create a string that also has methods attached
    const colorString = accentColor as string & AccentColorUtils;

    // Attach utilities to the string
    Object.defineProperties(colorString, {
      variants: {
        value: variants,
        enumerable: false,
      },
      withOpacity: {
        value: (opacity: number) => hexToRgba(variants.primary, opacity),
        enumerable: false,
      },
      lightWithOpacity: {
        value: (opacity: number) => hexToRgba(variants.light, opacity),
        enumerable: false,
      },
      darkWithOpacity: {
        value: (opacity: number) => hexToRgba(variants.dark, opacity),
        enumerable: false,
      },
      subtleWithOpacity: {
        value: (opacity: number) => hexToRgba(variants.subtle, opacity),
        enumerable: false,
      },
    });

    return colorString;
  }, [accentColor]);

  return result;
}

/**
 * Simpler hook that just returns the accent color variants object.
 * Use this when you need multiple variants but don't need the utility methods.
 *
 * @example
 * ```tsx
 * const { primary, light, dark, subtle } = useAccentColorVariants();
 * ```
 */
export function useAccentColorVariants(): AccentColorVariants {
  const accentColor = useSettingsStore((s) => s.accentColor);

  return useMemo(() => getAccentColorVariants(accentColor), [accentColor]);
}

/**
 * Hook that returns commonly used accent color styles.
 * Memoized to avoid recalculating on every render.
 */
export function useAccentStyles() {
  const accentColor = useSettingsStore((s) => s.accentColor);

  return useMemo(() => {
    const variants = getAccentColorVariants(accentColor);

    return {
      // Button styles
      buttonBackground: variants.primary,
      buttonBackgroundPressed: variants.dark,
      buttonBackgroundDisabled: variants.subtle,

      // Text styles
      textAccent: variants.primary,
      textAccentMuted: variants.light,

      // Border styles
      borderAccent: variants.primary,
      borderAccentSubtle: hexToRgba(variants.primary, 0.3),

      // Focus ring
      focusRing: variants.light,
      focusRingSubtle: hexToRgba(variants.light, 0.5),

      // Progress/indicators
      progressBar: variants.primary,
      progressBackground: hexToRgba(variants.primary, 0.2),

      // Overlay/backdrop
      overlayAccent: hexToRgba(variants.primary, 0.1),
      overlayAccentStrong: hexToRgba(variants.primary, 0.3),
    };
  }, [accentColor]);
}
