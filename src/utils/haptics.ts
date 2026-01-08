import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/stores';

export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';

const impactStyles: Record<'light' | 'medium' | 'heavy', Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
};

const notificationTypes: Record<'success' | 'warning' | 'error', Haptics.NotificationFeedbackType> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

export function triggerHaptic(type: HapticFeedbackType = 'light'): void {
  if (Platform.OS === 'web') return;

  const hapticsEnabled = useSettingsStore.getState().hapticsEnabled;
  if (!hapticsEnabled) return;

  try {
    if (type === 'selection') {
      Haptics.selectionAsync();
    } else if (type in impactStyles) {
      Haptics.impactAsync(impactStyles[type as 'light' | 'medium' | 'heavy']);
    } else if (type in notificationTypes) {
      Haptics.notificationAsync(notificationTypes[type as 'success' | 'warning' | 'error']);
    }
  } catch {
    // Silently fail if haptics not available
  }
}

export const haptics = {
  light: () => triggerHaptic('light'),
  medium: () => triggerHaptic('medium'),
  heavy: () => triggerHaptic('heavy'),
  selection: () => triggerHaptic('selection'),
  success: () => triggerHaptic('success'),
  warning: () => triggerHaptic('warning'),
  error: () => triggerHaptic('error'),
};
