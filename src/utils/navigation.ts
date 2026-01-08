import { router } from 'expo-router';

/**
 * Navigate back to the specified source or fallback.
 * The source should be read from the URL param 'from'.
 */
export function goBack(source: string | undefined, fallback: string = '/(tabs)/home') {
  const destination = source || fallback;
  router.replace(destination as any);
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
  } else if (router.canGoBack()) {
    router.back();
  } else if (fallback) {
    router.replace(fallback as any);
  }
}
