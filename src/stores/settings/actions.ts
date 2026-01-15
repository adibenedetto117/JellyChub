import type { StateCreator } from 'zustand';
import type { PlayerSettings } from '@/types';
import type {
  TabId,
  BottomBarConfig,
  LibraryCategory,
  LibrarySortBy,
  LibrarySortOrder,
  SettingsState,
  NotificationSettings,
} from './types';
import { DEFAULT_BOTTOM_BAR_CONFIG, DEFAULT_TAB_ORDER, MAX_LIBRARY_TABS, initialSettingsState } from './defaults';

export interface SettingsActions {
  setHasHydrated: (state: boolean) => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  setEnableAnimations: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setBottomBarConfig: (config: Partial<BottomBarConfig>) => void;
  toggleLibraryOnBottomBar: (libraryId: string) => void;
  moveTabInOrder: (tabId: TabId, direction: 'up' | 'down') => void;
  setTabOrder: (tabOrder: TabId[]) => void;
  updatePlayerSettings: (settings: Partial<PlayerSettings>) => void;
  setDownloadQuality: (quality: 'original' | 'high' | 'medium' | 'low') => void;
  setDownloadOverWifiOnly: (wifiOnly: boolean) => void;
  setAutoRemoveWatchedDownloads: (enabled: boolean) => void;
  setMaxDownloadSize: (size: number) => void;
  setJellyseerrCredentials: (
    url: string | null,
    authToken: string | null,
    username?: string | null,
    jellyfinAuth?: { serverUrl: string; userId: string; token: string; sessionCookie?: string } | null
  ) => void;
  clearJellyseerrCredentials: () => void;
  setTVMode: (enabled: boolean) => void;
  setOfflineMode: (enabled: boolean) => void;
  setHideMedia: (enabled: boolean) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setLibrarySortPreference: (
    category: LibraryCategory,
    sortBy: LibrarySortBy,
    sortOrder: LibrarySortOrder
  ) => void;
  setEqualizerPreset: (presetId: string) => void;
  setCustomEqualizerBands: (bands: number[]) => void;
  setOpenSubtitlesApiKey: (apiKey: string | null) => void;
  setRadarrCredentials: (url: string | null, apiKey: string | null) => void;
  clearRadarrCredentials: () => void;
  setRadarrConnectionStatus: (status: 'unknown' | 'connected' | 'error') => void;
  setRadarrUseCustomHeaders: (enabled: boolean) => void;
  setSonarrCredentials: (url: string | null, apiKey: string | null) => void;
  clearSonarrCredentials: () => void;
  setSonarrConnectionStatus: (status: 'unknown' | 'connected' | 'error') => void;
  setSonarrUseCustomHeaders: (enabled: boolean) => void;
  setJellyseerrConnectionStatus: (status: 'unknown' | 'connected' | 'error') => void;
  setJellyseerrUseCustomHeaders: (enabled: boolean) => void;
  setJellyseerrHideAvailable: (enabled: boolean) => void;
  setJellyseerrHideProcessing: (enabled: boolean) => void;
  setJellyseerrHidePartial: (enabled: boolean) => void;
  setJellyseerrMediaFilter: (filter: 'all' | 'movie' | 'tv') => void;
  setJellyseerrGenreFilter: (genres: number[]) => void;
  toggleJellyseerrGenre: (genreId: number) => void;
  setJellyseerrMinRating: (rating: number) => void;
  setJellyseerrRatingSource: (source: 'tmdb' | 'imdb' | 'any') => void;
  setJellyseerrYearFilter: (year: number | null) => void;
  clearJellyseerrFilters: () => void;
  setNotificationSetting: (key: keyof NotificationSettings, enabled: boolean) => void;
  setLanguage: (language: string | null) => void;
  batchUpdate: (updates: Partial<Pick<SettingsState,
    'theme' | 'accentColor' | 'enableAnimations' | 'reduceMotion' |
    'downloadQuality' | 'downloadOverWifiOnly' | 'autoRemoveWatchedDownloads' |
    'maxDownloadSize' | 'isTVMode' | 'offlineMode' | 'hideMedia' | 'hapticsEnabled' | 'language'
  >>) => void;
  resetToDefaults: () => void;
}

type SettingsStore = SettingsState & { _hasHydrated: boolean } & SettingsActions;

export const createSettingsActions: StateCreator<SettingsStore, [], [], SettingsActions> = (set) => ({
  setHasHydrated: (state) => set({ _hasHydrated: state }),

  setTheme: (theme) => set({ theme }),

  setAccentColor: (accentColor) => set({ accentColor }),

  setEnableAnimations: (enableAnimations) => set({ enableAnimations }),

  setReduceMotion: (reduceMotion) => set({ reduceMotion }),

  setBottomBarConfig: (config) =>
    set((state) => ({
      bottomBarConfig: { ...state.bottomBarConfig, ...config },
    })),

  toggleLibraryOnBottomBar: (libraryId) =>
    set((state) => {
      const selectedLibraryIds = state.bottomBarConfig?.selectedLibraryIds ?? [];
      const tabOrder = state.bottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER;
      const isSelected = selectedLibraryIds.includes(libraryId);

      if (isSelected) {
        return {
          bottomBarConfig: {
            ...DEFAULT_BOTTOM_BAR_CONFIG,
            ...state.bottomBarConfig,
            selectedLibraryIds: selectedLibraryIds.filter((id) => id !== libraryId),
            tabOrder: tabOrder.filter((id) => id !== libraryId),
          },
        };
      } else {
        if (selectedLibraryIds.length >= MAX_LIBRARY_TABS) {
          return state;
        }
        const settingsIndex = tabOrder.indexOf('settings');
        const newTabOrder = [...tabOrder];
        if (settingsIndex !== -1) {
          newTabOrder.splice(settingsIndex, 0, libraryId);
        } else {
          newTabOrder.push(libraryId);
        }
        return {
          bottomBarConfig: {
            ...DEFAULT_BOTTOM_BAR_CONFIG,
            ...state.bottomBarConfig,
            selectedLibraryIds: [...selectedLibraryIds, libraryId],
            tabOrder: newTabOrder,
          },
        };
      }
    }),

  moveTabInOrder: (tabId, direction) =>
    set((state) => {
      const tabOrder = state.bottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER;
      const currentIndex = tabOrder.indexOf(tabId);
      if (currentIndex === -1) return state;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= tabOrder.length) return state;

      const newTabOrder = [...tabOrder];
      [newTabOrder[currentIndex], newTabOrder[newIndex]] = [newTabOrder[newIndex], newTabOrder[currentIndex]];

      return {
        bottomBarConfig: {
          ...DEFAULT_BOTTOM_BAR_CONFIG,
          ...state.bottomBarConfig,
          tabOrder: newTabOrder,
        },
      };
    }),

  setTabOrder: (tabOrder) =>
    set((state) => ({
      bottomBarConfig: {
        ...state.bottomBarConfig,
        tabOrder,
      },
    })),

  updatePlayerSettings: (settings) =>
    set((state) => ({
      player: { ...state.player, ...settings },
    })),

  setDownloadQuality: (downloadQuality) => set({ downloadQuality }),

  setDownloadOverWifiOnly: (downloadOverWifiOnly) =>
    set({ downloadOverWifiOnly }),

  setAutoRemoveWatchedDownloads: (autoRemoveWatchedDownloads) =>
    set({ autoRemoveWatchedDownloads }),

  setMaxDownloadSize: (maxDownloadSize) => set({ maxDownloadSize }),

  setJellyseerrCredentials: (url, authToken, username, jellyfinAuth) =>
    set({
      jellyseerrUrl: url,
      jellyseerrAuthToken: authToken,
      jellyseerrUsername: username ?? null,
      jellyseerrJellyfinServerUrl: jellyfinAuth?.serverUrl ?? null,
      jellyseerrJellyfinUserId: jellyfinAuth?.userId ?? null,
      jellyseerrJellyfinToken: jellyfinAuth?.token ?? null,
      jellyseerrSessionCookie: jellyfinAuth?.sessionCookie ?? null,
      jellyseerrConnectionStatus: 'unknown',
    }),

  clearJellyseerrCredentials: () =>
    set({
      jellyseerrUrl: null,
      jellyseerrAuthToken: null,
      jellyseerrJellyfinServerUrl: null,
      jellyseerrJellyfinUserId: null,
      jellyseerrJellyfinToken: null,
      jellyseerrSessionCookie: null,
      jellyseerrUsername: null,
      jellyseerrConnectionStatus: 'unknown',
    }),

  setTVMode: (isTVMode) => set({ isTVMode }),

  setOfflineMode: (offlineMode) => set({ offlineMode }),

  setHideMedia: (hideMedia) => set({ hideMedia }),

  setHapticsEnabled: (hapticsEnabled) => set({ hapticsEnabled }),

  setLibrarySortPreference: (category, sortBy, sortOrder) =>
    set((state) => ({
      librarySortPreferences: {
        ...state.librarySortPreferences,
        [category]: { sortBy, sortOrder },
      },
    })),

  setEqualizerPreset: (equalizerPreset) => set({ equalizerPreset }),

  setCustomEqualizerBands: (customEqualizerBands) => set({ customEqualizerBands }),

  setOpenSubtitlesApiKey: (openSubtitlesApiKey) => set({ openSubtitlesApiKey }),

  setRadarrCredentials: (url, apiKey) =>
    set({
      radarrUrl: url,
      radarrApiKey: apiKey,
      radarrConnectionStatus: 'unknown',
    }),

  clearRadarrCredentials: () =>
    set({
      radarrUrl: null,
      radarrApiKey: null,
      radarrConnectionStatus: 'unknown',
    }),

  setSonarrCredentials: (url, apiKey) =>
    set({
      sonarrUrl: url,
      sonarrApiKey: apiKey,
      sonarrConnectionStatus: 'unknown',
    }),

  clearSonarrCredentials: () =>
    set({
      sonarrUrl: null,
      sonarrApiKey: null,
      sonarrConnectionStatus: 'unknown',
    }),

  setRadarrConnectionStatus: (status) => set({ radarrConnectionStatus: status }),
  setRadarrUseCustomHeaders: (enabled) => set({ radarrUseCustomHeaders: enabled }),

  setSonarrConnectionStatus: (status) => set({ sonarrConnectionStatus: status }),
  setSonarrUseCustomHeaders: (enabled) => set({ sonarrUseCustomHeaders: enabled }),

  setJellyseerrConnectionStatus: (status) => set({ jellyseerrConnectionStatus: status }),
  setJellyseerrUseCustomHeaders: (enabled) => set({ jellyseerrUseCustomHeaders: enabled }),
  setJellyseerrHideAvailable: (enabled) => set({ jellyseerrHideAvailable: enabled }),
  setJellyseerrHideProcessing: (enabled) => set({ jellyseerrHideProcessing: enabled }),
  setJellyseerrHidePartial: (enabled) => set({ jellyseerrHidePartial: enabled }),
  setJellyseerrMediaFilter: (filter) => set({ jellyseerrMediaFilter: filter }),
  setJellyseerrGenreFilter: (genres) => set({ jellyseerrGenreFilter: genres }),
  toggleJellyseerrGenre: (genreId) =>
    set((state) => ({
      jellyseerrGenreFilter: state.jellyseerrGenreFilter.includes(genreId)
        ? state.jellyseerrGenreFilter.filter((id) => id !== genreId)
        : [...state.jellyseerrGenreFilter, genreId],
    })),
  setJellyseerrMinRating: (rating) => set({ jellyseerrMinRating: rating }),
  setJellyseerrRatingSource: (source) => set({ jellyseerrRatingSource: source }),
  setJellyseerrYearFilter: (year) => set({ jellyseerrYearFilter: year }),
  clearJellyseerrFilters: () =>
    set({
      jellyseerrHideAvailable: false,
      jellyseerrHideProcessing: false,
      jellyseerrHidePartial: false,
      jellyseerrMediaFilter: 'all',
      jellyseerrGenreFilter: [],
      jellyseerrMinRating: 0,
      jellyseerrRatingSource: 'tmdb',
      jellyseerrYearFilter: null,
    }),

  setNotificationSetting: (key, enabled) =>
    set((state) => ({
      notifications: {
        ...state.notifications,
        [key]: enabled,
      },
    })),

  setLanguage: (language) => set({ language }),

  batchUpdate: (updates) => set(updates),

  resetToDefaults: () => set({ ...initialSettingsState, _hasHydrated: true }),
});
