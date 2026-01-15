import type { SettingsState } from './types';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';

export const selectHasHydrated = (state: SettingsState & { _hasHydrated: boolean }) => state._hasHydrated;
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
export const selectHideMedia = (state: SettingsState) => state.hideMedia;
export const selectReduceMotion = (state: SettingsState) => state.reduceMotion;
export const selectEqualizerPreset = (state: SettingsState) => state.equalizerPreset;
export const selectCustomEqualizerBands = (state: SettingsState) => state.customEqualizerBands;
export const selectOpenSubtitlesApiKey = (state: SettingsState) => state.openSubtitlesApiKey;
export const selectHasOpenSubtitles = (state: SettingsState) =>
  !!state.openSubtitlesApiKey && state.openSubtitlesApiKey.length > 0;
export const selectHapticsEnabled = (state: SettingsState) => state.hapticsEnabled;
export const selectNotifications = (state: SettingsState) => state.notifications;
export const selectHasRadarr = (state: SettingsState) =>
  !!state.radarrUrl && !!state.radarrApiKey;
export const selectHasSonarr = (state: SettingsState) =>
  !!state.sonarrUrl && !!state.sonarrApiKey;
export const selectRadarrConnectionStatus = (state: SettingsState) =>
  state.radarrConnectionStatus;
export const selectSonarrConnectionStatus = (state: SettingsState) =>
  state.sonarrConnectionStatus;
export const selectJellyseerrConnectionStatus = (state: SettingsState) =>
  state.jellyseerrConnectionStatus;

export const selectBottomNavSettings = (state: SettingsState) => ({
  bottomBarConfig: state.bottomBarConfig,
  accentColor: state.accentColor,
  offlineMode: state.offlineMode,
  reduceMotion: state.reduceMotion,
  hasJellyseerr: !!state.jellyseerrUrl && !!state.jellyseerrAuthToken,
  hasRadarr: !!state.radarrUrl && !!state.radarrApiKey,
  hasSonarr: !!state.sonarrUrl && !!state.sonarrApiKey,
});

export const selectMiniPlayerSettings = (state: SettingsState) => ({
  accentColor: state.accentColor,
  hideMedia: state.hideMedia,
});

export const selectPosterCardSettings = (state: SettingsState) => ({
  accentColor: state.accentColor,
  hideMedia: state.hideMedia,
});

export const selectPlayerControlsConfig = (state: SettingsState) =>
  state.player.controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG;
export const selectPlayerControlsOrder = (state: SettingsState) =>
  state.player.controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER;
