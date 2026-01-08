import { router } from 'expo-router';

/**
 * Navigate back to the previous screen.
 *
 * In expo-router with tabs, the back() function is unreliable because
 * detail screens are siblings in the Tabs navigator, not in a Stack.
 *
 * This function navigates directly to the fallback route to ensure
 * consistent back navigation behavior.
 *
 * @param fallback - Route to navigate to (required for reliable behavior)
 */
export function goBack(fallback: string) {
  // Navigate directly to the fallback route
  // Using replace() removes the current screen from history
  router.replace(fallback as any);
}

export function dismissModal() {
  if (router.canDismiss()) {
    router.dismiss();
  } else if (router.canGoBack()) {
    router.back();
  }
}
