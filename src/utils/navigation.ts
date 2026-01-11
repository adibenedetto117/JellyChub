import { router } from 'expo-router';
import { useNavigationStore } from '@/stores/navigationStore';

const MODAL_ROUTES = ['/search', '/(tabs)/search'];

export function goBack(source?: string, fallback: string = '/(tabs)/home') {
  const isModalSource = source && MODAL_ROUTES.includes(source);
  const target = (!source || isModalSource) ? fallback : source;
  const { push } = useNavigationStore.getState();
  push(target);
  router.navigate(target as any);
}

export function navigateToDetails(type: string, id: string, sourceTab: string) {
  if (!type || !id) {
    console.error('[navigateToDetails] Missing required params:', { type, id, sourceTab });
    return;
  }

  const route = `/details/${type}/${id}?from=${encodeURIComponent(sourceTab)}`;
  const { push } = useNavigationStore.getState();
  push(route);
  router.push(route as any);
}

export function navigateToLibrary(libraryId: string, sourceTab: string) {
  const route = `/library/${libraryId}?from=${encodeURIComponent(sourceTab)}`;
  const { push } = useNavigationStore.getState();
  push(route);
  router.push(route as any);
}

export function setNavigationSource(_source: string) {
}

export function dismissModal(fallback?: string) {
  if (router.canDismiss()) {
    router.dismiss();
  } else if (fallback) {
    router.navigate(fallback as any);
  } else if (router.canGoBack()) {
    router.back();
  }
}

export function trackNavigation(route: string) {
  const { push } = useNavigationStore.getState();
  push(route);
}

export function handleBackNavigation(): boolean {
  const { goBack } = useNavigationStore.getState();
  return goBack();
}
