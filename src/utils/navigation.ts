import { router } from 'expo-router';

// Modal routes that should not be navigated to as back targets
const MODAL_ROUTES = ['/search', '/(tabs)/search'];

/**
 * Navigate back properly. Uses router.navigate() for instant navigation
 * to the source/fallback route. This is faster than replace() and more
 * reliable than back() in Expo Router tabs.
 *
 * If the source is a modal route (like /search), use the fallback instead
 * since modals are dismissed, not navigated to.
 */
export function goBack(source?: string, fallback: string = '/(tabs)/home') {
  // Don't navigate to modal routes - use fallback instead
  const isModalSource = source && MODAL_ROUTES.includes(source);
  const target = (!source || isModalSource) ? fallback : source;
  // Use navigate for instant switching - it reuses existing screens
  router.navigate(target as any);
}

/**
 * Navigate to a details screen with source tracking via URL param.
 */
export function navigateToDetails(type: string, id: string, sourceTab: string) {
  // Guard: validate required parameters
  if (!type || !id) {
    console.error('[navigateToDetails] Missing required params:', { type, id, sourceTab });
    return;
  }

  const route = `/details/${type}/${id}?from=${encodeURIComponent(sourceTab)}`;
  console.log('[navigateToDetails] Navigating to:', route);

  // Just push the route - expo-router handles modal dismissal
  router.push(route as any);
}

/**
 * Navigate to a library collection screen with source tracking via URL param.
 */
export function navigateToLibrary(libraryId: string, sourceTab: string) {
  router.push(`/library/${libraryId}?from=${encodeURIComponent(sourceTab)}` as any);
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
