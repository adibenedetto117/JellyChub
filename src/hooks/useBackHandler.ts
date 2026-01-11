import { useEffect, useCallback } from 'react';
import { BackHandler, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useNavigationStore } from '@/stores/navigationStore';

export function useBackHandler(
  handler: () => boolean,
  enabled = true
): void {
  const memoizedHandler = useCallback(() => {
    if (!enabled) return false;
    return handler();
  }, [handler, enabled]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      memoizedHandler
    );

    return () => subscription.remove();
  }, [memoizedHandler]);
}

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

export function useGlobalBackHandler(): void {
  const goBack = useNavigationStore((state) => state.goBack);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        return goBack();
      }
    );

    return () => subscription.remove();
  }, [goBack]);
}
