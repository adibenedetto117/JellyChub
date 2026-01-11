import { create } from 'zustand';
import { router } from 'expo-router';
import { Platform, BackHandler } from 'react-native';

const MAX_HISTORY_SIZE = 50;

const TAB_ROUTES = [
  '/(tabs)/home',
  '/(tabs)/library',
  '/(tabs)/movies',
  '/(tabs)/shows',
  '/(tabs)/music',
  '/(tabs)/books',
  '/(tabs)/downloads',
  '/(tabs)/requests',
  '/(tabs)/admin',
  '/(tabs)/settings',
  '/(tabs)/livetv',
];

const MODAL_ROUTES = ['/search', '/(tabs)/search'];

const PLAYER_ROUTES = [
  '/player/video',
  '/player/music',
  '/player/audiobook',
  '/player/livetv',
];

interface NavigationState {
  history: string[];
  currentRoute: string | null;
}

interface NavigationActions {
  push: (route: string) => void;
  pop: () => string | null;
  replace: (route: string) => void;
  clear: () => void;
  canGoBack: () => boolean;
  goBack: () => boolean;
}

type NavigationStore = NavigationState & NavigationActions;

const initialState: NavigationState = {
  history: [],
  currentRoute: null,
};

export const useNavigationStore = create<NavigationStore>()((set, get) => ({
  ...initialState,

  push: (route: string) => {
    const { history, currentRoute } = get();

    if (MODAL_ROUTES.includes(route)) {
      set({ currentRoute: route });
      return;
    }

    if (route === currentRoute) {
      return;
    }

    const newHistory = currentRoute && !MODAL_ROUTES.includes(currentRoute)
      ? [...history, currentRoute]
      : history;

    const trimmedHistory = newHistory.length > MAX_HISTORY_SIZE
      ? newHistory.slice(-MAX_HISTORY_SIZE)
      : newHistory;

    set({
      history: trimmedHistory,
      currentRoute: route,
    });
  },

  pop: () => {
    const { history } = get();
    if (history.length === 0) return null;

    const previousRoute = history[history.length - 1];
    set({
      history: history.slice(0, -1),
      currentRoute: previousRoute,
    });

    return previousRoute;
  },

  replace: (route: string) => {
    set({ currentRoute: route });
  },

  clear: () => {
    set(initialState);
  },

  canGoBack: () => {
    const { history, currentRoute } = get();

    if (PLAYER_ROUTES.some(r => currentRoute?.startsWith(r))) {
      return true;
    }

    return history.length > 0;
  },

  goBack: () => {
    const { history, currentRoute, pop } = get();

    if (currentRoute && PLAYER_ROUTES.some(r => currentRoute.startsWith(r))) {
      if (router.canDismiss()) {
        router.dismiss();
        return true;
      }
    }

    if (currentRoute && MODAL_ROUTES.includes(currentRoute)) {
      if (router.canDismiss()) {
        router.dismiss();
        return true;
      }
    }

    if (history.length === 0) {
      if (currentRoute && TAB_ROUTES.includes(currentRoute) && currentRoute !== '/(tabs)/home') {
        router.navigate('/(tabs)/home' as any);
        set({ currentRoute: '/(tabs)/home', history: [] });
        return true;
      }

      if (Platform.OS === 'android') {
        BackHandler.exitApp();
      }
      return false;
    }

    const previousRoute = pop();
    if (previousRoute) {
      router.navigate(previousRoute as any);
      return true;
    }

    return false;
  },
}));

export const selectCanGoBack = (state: NavigationStore) => state.canGoBack();
export const selectCurrentRoute = (state: NavigationStore) => state.currentRoute;
export const selectHistoryLength = (state: NavigationStore) => state.history.length;
