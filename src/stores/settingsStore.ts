import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, PlayerSettings } from '@/types';
import { isTV } from '@/utils/platform';
import { appStorage } from './storage';

// Library sort types
export type LibrarySortBy = 'SortName' | 'DateCreated' | 'PremiereDate' | 'CommunityRating' | 'Runtime';
export type LibrarySortOrder = 'Ascending' | 'Descending';
export type LibraryCategory = 'movies' | 'shows' | 'music' | 'books';

export interface LibrarySortPreference {
  sortBy: LibrarySortBy;
  sortOrder: LibrarySortOrder;
}

export type LibrarySortPreferences = Record<LibraryCategory, LibrarySortPreference>;

// Fixed tabs that are always available
export type FixedTabId = 'home' | 'search' | 'library' | 'downloads' | 'settings';

// Tab IDs for ordering
export type TabId = 'home' | 'search' | 'library' | 'downloads' | 'requests' | 'admin' | 'settings' | string;

// Default tab order (library IDs are appended dynamically)
export const DEFAULT_TAB_ORDER: TabId[] = [
  'home',
  'library',
  'downloads',
  'requests',
  'admin',
  'settings',
];

// Tab bar configuration - libraries are now dynamic based on Jellyfin
export interface BottomBarConfig {
  showHome: boolean;
  showDownloads: boolean;
  showAdmin: boolean;
  showRequests: boolean;
  selectedLibraryIds: string[];
  tabOrder: TabId[];
  landingPage: TabId;
}

export const DEFAULT_BOTTOM_BAR_CONFIG: BottomBarConfig = {
  showHome: true,
  showDownloads: true,
  showAdmin: true,
  showRequests: true,
  selectedLibraryIds: [],
  tabOrder: DEFAULT_TAB_ORDER,
  landingPage: 'home',
};

// Maximum number of library tabs allowed on bottom bar (excluding fixed tabs)
export const MAX_LIBRARY_TABS = 3;

// Accent color presets
export const ACCENT_COLOR_PRESETS = [
  { name: 'Blue', color: '#0ea5e9' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Pink', color: '#ec4899' },
] as const;

const defaultPlayerSettings: PlayerSettings = {
  autoPlay: true,
  defaultSubtitleLanguage: 'eng',
  defaultAudioLanguage: 'eng',
  forceSubtitles: false,
  subtitleSize: 'medium',
  subtitlePosition: 'bottom',
  subtitleBackgroundOpacity: 0.75,
  subtitleTextColor: '#ffffff',
  subtitleBackgroundColor: '#000000',
  hardwareAcceleration: true,
  maxStreamingBitrate: 20, // 20 Mbps
};

const defaultLibrarySortPreferences: LibrarySortPreferences = {
  movies: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  shows: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  music: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  books: { sortBy: 'DateCreated', sortOrder: 'Descending' },
};

interface SettingsState extends Omit<AppSettings, 'servers'> {
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // UI settings
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  enableAnimations: boolean;
  bottomBarConfig: BottomBarConfig;

  // Playback settings
  player: PlayerSettings;

  // Download settings
  downloadQuality: 'original' | 'high' | 'medium' | 'low';
  downloadOverWifiOnly: boolean;
  maxDownloadSize: number;

  // Jellyseerr
  jellyseerrUrl: string | null;
  jellyseerrAuthToken: string | null;
  jellyseerrUsername: string | null;

  // TV mode
  isTVMode: boolean;

  // Offline mode
  offlineMode: boolean;

  // Library preferences
  librarySortPreferences: LibrarySortPreferences;

  // Actions
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  setEnableAnimations: (enabled: boolean) => void;
  setBottomBarConfig: (config: Partial<BottomBarConfig>) => void;
  toggleLibraryOnBottomBar: (libraryId: string) => void;
  moveTabInOrder: (tabId: TabId, direction: 'up' | 'down') => void;
  setTabOrder: (tabOrder: TabId[]) => void;

  updatePlayerSettings: (settings: Partial<PlayerSettings>) => void;

  setDownloadQuality: (quality: AppSettings['downloadQuality']) => void;
  setDownloadOverWifiOnly: (wifiOnly: boolean) => void;
  setMaxDownloadSize: (size: number) => void;

  setJellyseerrCredentials: (url: string | null, authToken: string | null, username?: string | null) => void;
  clearJellyseerrCredentials: () => void;

  setTVMode: (enabled: boolean) => void;

  setOfflineMode: (enabled: boolean) => void;

  setLibrarySortPreference: (
    category: LibraryCategory,
    sortBy: LibrarySortBy,
    sortOrder: LibrarySortOrder
  ) => void;

  resetToDefaults: () => void;
}

const initialState = {
  _hasHydrated: false,
  theme: 'dark' as const,
  accentColor: '#0ea5e9',
  enableAnimations: true,
  bottomBarConfig: DEFAULT_BOTTOM_BAR_CONFIG,
  player: defaultPlayerSettings,
  downloadQuality: 'high' as const,
  downloadOverWifiOnly: true,
  maxDownloadSize: 50, // 50 GB
  jellyseerrUrl: null,
  jellyseerrAuthToken: null,
  jellyseerrUsername: null,
  isTVMode: isTV,
  offlineMode: false,
  librarySortPreferences: defaultLibrarySortPreferences,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...initialState,

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setTheme: (theme) => set({ theme }),

      setAccentColor: (accentColor) => set({ accentColor }),

      setEnableAnimations: (enableAnimations) => set({ enableAnimations }),

      setBottomBarConfig: (config) =>
        set((state) => ({
          bottomBarConfig: { ...state.bottomBarConfig, ...config },
        })),

      toggleLibraryOnBottomBar: (libraryId) =>
        set((state) => {
          // Ensure arrays exist with safe defaults
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

      setMaxDownloadSize: (maxDownloadSize) => set({ maxDownloadSize }),

      setJellyseerrCredentials: (url, authToken, username) =>
        set({
          jellyseerrUrl: url,
          jellyseerrAuthToken: authToken,
          jellyseerrUsername: username ?? null,
        }),

      clearJellyseerrCredentials: () =>
        set({
          jellyseerrUrl: null,
          jellyseerrAuthToken: null,
          jellyseerrUsername: null,
        }),

      setTVMode: (isTVMode) => set({ isTVMode }),

      setOfflineMode: (offlineMode) => set({ offlineMode }),

      setLibrarySortPreference: (category, sortBy, sortOrder) =>
        set((state) => ({
          librarySortPreferences: {
            ...state.librarySortPreferences,
            [category]: { sortBy, sortOrder },
          },
        })),

      resetToDefaults: () => set(initialState),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined;
        if (!persisted) return currentState;

        // Merge bottomBarConfig with defaults to handle missing fields
        const mergedBottomBarConfig: BottomBarConfig = {
          ...DEFAULT_BOTTOM_BAR_CONFIG,
          ...persisted.bottomBarConfig,
          // Ensure arrays are never undefined
          selectedLibraryIds: persisted.bottomBarConfig?.selectedLibraryIds ?? [],
          tabOrder: persisted.bottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER,
          landingPage: persisted.bottomBarConfig?.landingPage ?? 'home',
        };

        return {
          ...currentState,
          ...persisted,
          bottomBarConfig: mergedBottomBarConfig,
        };
      },
    }
  )
);

// Selectors
export const selectHasHydrated = (state: SettingsState) => state._hasHydrated;
export const selectPlayerSettings = (state: SettingsState) => state.player;
export const selectTheme = (state: SettingsState) => state.theme;
export const selectIsTVMode = (state: SettingsState) => state.isTVMode;
export const selectHasJellyseerr = (state: SettingsState) =>
  !!state.jellyseerrUrl && !!state.jellyseerrAuthToken;
export const selectBottomBarConfig = (state: SettingsState) => state.bottomBarConfig;
export const selectAccentColor = (state: SettingsState) => state.accentColor;
export const selectTabOrder = (state: SettingsState) => state.bottomBarConfig.tabOrder;
export const selectLibrarySortPreferences = (state: SettingsState) =>
  state.librarySortPreferences;
export const selectOfflineMode = (state: SettingsState) => state.offlineMode;
