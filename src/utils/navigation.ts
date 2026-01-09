import { router } from 'expo-router';

/**
 * Navigate back properly. Uses router.navigate() for instant navigation
 * to the source/fallback route. This is faster than replace() and more
 * reliable than back() in Expo Router tabs.
 */
export function goBack(source?: string, fallback: string = '/(tabs)/home') {
  const target = source || fallback;
  // Use navigate for instant switching - it reuses existing screens
  router.navigate(target as any);
}

/**
 * Navigate to a details screen with source tracking via URL param.
 */
export function navigateToDetails(type: string, id: string, sourceTab: string) {
  router.push(`/details/${type}/${id}?from=${encodeURIComponent(sourceTab)}`);
}

/**
 * Navigate to a library collection screen with source tracking via URL param.
 */
export function navigateToLibrary(libraryId: string, sourceTab: string) {
  router.push(`/library/${libraryId}?from=${encodeURIComponent(sourceTab)}`);
}

/**
 * Set the navigation source - now a no-op for backwards compatibility.
 * @deprecated Use navigateToDetails or navigateToLibrary instead
 */
export function setNavigationSource(_source: string) {
  // No-op - source is now passed via URL params
}

export function dismissModal(fallback?: string) {
  if (router.canDismiss()) {
    router.dismiss();
  } else if (fallback) {
    // Use navigate for instant switching
    router.navigate(fallback as any);
  } else if (router.canGoBack()) {
    router.back();
  }
}
