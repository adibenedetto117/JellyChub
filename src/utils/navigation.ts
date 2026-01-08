import { router } from 'expo-router';

export function goBack(fallbackRoute?: string) {
  if (router.canGoBack()) {
    router.back();
  } else if (fallbackRoute) {
    router.replace(fallbackRoute as any);
  } else {
    router.replace('/(tabs)/home' as any);
  }
}

export function dismissModal(fallbackRoute?: string) {
  if (router.canGoBack()) {
    router.back();
  } else if (fallbackRoute) {
    router.replace(fallbackRoute as any);
  } else {
    router.replace('/(tabs)/home' as any);
  }
}
