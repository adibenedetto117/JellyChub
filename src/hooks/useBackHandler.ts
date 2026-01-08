import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';

/**
 * Hook for handling the Android hardware back button.
 * Essential for Android TV navigation where the back button
 * on the remote needs to be handled properly.
 *
 * @param handler - Callback that returns true if the back press was handled,
 *                  false to let the default behavior occur
 * @param enabled - Whether the handler is active (default: true)
 *
 * @example
 * ```tsx
 * // In a video player
 * useBackHandler(() => {
 *   if (showControls) {
 *     hideControls();
 *     return true; // Handled - don't go back
 *   }
 *   closePlayer();
 *   return true; // Handled
 * }, true);
 * ```
 *
 * @example
 * ```tsx
 * // In a modal
 * useBackHandler(() => {
 *   closeModal();
 *   return true;
 * }, isModalVisible);
 * ```
 */
export function useBackHandler(
  handler: () => boolean,
  enabled = true
): void {
  const memoizedHandler = useCallback(() => {
    if (!enabled) return false;
    return handler();
  }, [handler, enabled]);

  useEffect(() => {
    // Only relevant on Android (including Android TV)
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      memoizedHandler
    );

    return () => subscription.remove();
  }, [memoizedHandler]);
}

/**
 * Hook for handling back button that respects screen focus.
 * The handler is only active when the screen is focused.
 * Uses Expo Router's useFocusEffect.
 *
 * @param handler - Callback that returns true if handled
 * @param enabled - Whether the handler is active
 *
 * @example
 * ```tsx
 * // Handler only active when screen is focused
 * useFocusedBackHandler(() => {
 *   router.back();
 *   return true;
 * });
 * ```
 */
export function useFocusedBackHandler(
  handler: () => boolean,
  enabled = true
): void {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android' || !enabled) return;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        handler
      );

      return () => subscription.remove();
    }, [handler, enabled])
  );
}
