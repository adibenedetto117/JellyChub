import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';

import {
  type SettingsState,
  type TabId,
  type BottomBarConfig,
  type LibraryCategory,
  type LibrarySortBy,
  type LibrarySortOrder,
  type LibrarySortPreference,
  type LibrarySortPreferences,
  type FixedTabId,
  type NotificationSettings,
  DEFAULT_TAB_ORDER,
  DEFAULT_BOTTOM_BAR_CONFIG,
  MAX_LIBRARY_TABS,
  ACCENT_COLOR_PRESETS,
  initialSettingsState,
  migratePersistedState,
  selectHasHydrated,
  selectPlayerSettings,
  selectTheme,
  selectIsTVMode,
  selectHasJellyseerr,
  selectBottomBarConfig,
  selectAccentColor,
  selectTabOrder,
  selectLibrarySortPreferences,
  selectOfflineMode,
  selectHideMedia,
  selectReduceMotion,
  selectEqualizerPreset,
  selectCustomEqualizerBands,
  selectOpenSubtitlesApiKey,
  selectHasOpenSubtitles,
  selectHapticsEnabled,
  selectNotifications,
  selectHasRadarr,
  selectHasSonarr,
  selectRadarrConnectionStatus,
  selectSonarrConnectionStatus,
  selectJellyseerrConnectionStatus,
  selectBottomNavSettings,
  selectMiniPlayerSettings,
  selectPosterCardSettings,
  selectPlayerControlsConfig,
  selectPlayerControlsOrder,
  type SettingsActions,
  createSettingsActions,
} from './settings';

type SettingsStore = SettingsState & { _hasHydrated: boolean } & SettingsActions;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get, store) => ({
      _hasHydrated: false,
      ...initialSettingsState,
      ...createSettingsActions(set, get, store),
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...migratePersistedState(
          persistedState as Partial<SettingsState> | undefined,
          currentState
        ),
      }),
    }
  )
);

export {
  type SettingsState,
  type TabId,
  type BottomBarConfig,
  type LibraryCategory,
  type LibrarySortBy,
  type LibrarySortOrder,
  type LibrarySortPreference,
  type LibrarySortPreferences,
  type FixedTabId,
  type NotificationSettings,
  DEFAULT_TAB_ORDER,
  DEFAULT_BOTTOM_BAR_CONFIG,
  MAX_LIBRARY_TABS,
  ACCENT_COLOR_PRESETS,
  selectHasHydrated,
  selectPlayerSettings,
  selectTheme,
  selectIsTVMode,
  selectHasJellyseerr,
  selectBottomBarConfig,
  selectAccentColor,
  selectTabOrder,
  selectLibrarySortPreferences,
  selectOfflineMode,
  selectHideMedia,
  selectReduceMotion,
  selectEqualizerPreset,
  selectCustomEqualizerBands,
  selectOpenSubtitlesApiKey,
  selectHasOpenSubtitles,
  selectHapticsEnabled,
  selectNotifications,
  selectHasRadarr,
  selectHasSonarr,
  selectRadarrConnectionStatus,
  selectSonarrConnectionStatus,
  selectJellyseerrConnectionStatus,
  selectBottomNavSettings,
  selectMiniPlayerSettings,
  selectPosterCardSettings,
  selectPlayerControlsConfig,
  selectPlayerControlsOrder,
};
