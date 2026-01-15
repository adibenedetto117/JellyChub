import type { PlayerSettings } from '@/types';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';
import type { SettingsState, BottomBarConfig } from './types';
import { DEFAULT_BOTTOM_BAR_CONFIG, DEFAULT_TAB_ORDER, defaultPlayerSettings } from './defaults';

export function migratePersistedState(
  persistedState: Partial<SettingsState> | undefined,
  currentState: SettingsState & { _hasHydrated: boolean }
): SettingsState & { _hasHydrated: boolean } {
  const persisted = persistedState;
  if (!persisted) return currentState;

  let tabOrder = persisted.bottomBarConfig?.tabOrder ?? DEFAULT_TAB_ORDER;

  tabOrder = tabOrder.map((t) => (t === 'requests' ? 'jellyseerr' : t));

  if (!tabOrder.includes('more')) {
    const settingsIndex = tabOrder.indexOf('settings');
    if (settingsIndex !== -1) {
      tabOrder = [...tabOrder.slice(0, settingsIndex), 'more', ...tabOrder.slice(settingsIndex)];
    } else {
      tabOrder = [...tabOrder, 'more'];
    }
  }

  const persistedConfig = persisted.bottomBarConfig as any;
  const showJellyseerr = persistedConfig?.showJellyseerr ?? persistedConfig?.showRequests ?? false;

  let moreMenuTabs = persisted.bottomBarConfig?.moreMenuTabs ?? DEFAULT_BOTTOM_BAR_CONFIG.moreMenuTabs;

  const integrationTabs = ['jellyseerr', 'admin', 'radarr', 'sonarr', 'favorites', 'livetv'] as const;
  for (const tabId of integrationTabs) {
    const isInTabOrder = tabOrder.includes(tabId);
    const isInMoreMenu = moreMenuTabs.includes(tabId);
    if (!isInTabOrder && !isInMoreMenu) {
      moreMenuTabs = [...moreMenuTabs, tabId];
    }
  }

  const mergedBottomBarConfig: BottomBarConfig = {
    ...DEFAULT_BOTTOM_BAR_CONFIG,
    ...persisted.bottomBarConfig,
    showJellyseerr,
    selectedLibraryIds: persisted.bottomBarConfig?.selectedLibraryIds ?? [],
    moreMenuTabs,
    tabOrder,
    landingPage: persisted.bottomBarConfig?.landingPage ?? 'home',
  };

  const mergedNotifications = {
    downloadComplete: persisted.notifications?.downloadComplete ?? true,
    nowPlaying: persisted.notifications?.nowPlaying ?? false,
  };

  const persistedPlayer = persisted.player as any;
  let controlsConfig = persistedPlayer?.controlsConfig ?? { ...DEFAULT_PLAYER_CONTROLS_CONFIG };
  let controlsOrder = persistedPlayer?.controlsOrder ?? [...DEFAULT_PLAYER_CONTROLS_ORDER];

  if (persistedPlayer) {
    if ('showPiPButton' in persistedPlayer && !persistedPlayer.controlsConfig) {
      controlsConfig.pip = persistedPlayer.showPiPButton === false ? 'hidden' : 'visible';
    }
    if ('showCastButton' in persistedPlayer && !persistedPlayer.controlsConfig) {
      controlsConfig.cast = persistedPlayer.showCastButton === false ? 'hidden' : 'visible';
    }
    if ('showSpeedInMenu' in persistedPlayer && !persistedPlayer.controlsConfig) {
      controlsConfig.speed = persistedPlayer.showSpeedInMenu === false ? 'visible' : 'menu';
    }
    if ('showEpisodeList' in persistedPlayer && !persistedPlayer.controlsConfig) {
      controlsConfig.episodes = persistedPlayer.showEpisodeList === false ? 'hidden' : 'visible';
    }
  }

  const mergedPlayer: PlayerSettings = {
    ...defaultPlayerSettings,
    ...persisted.player,
    controlsConfig,
    controlsOrder,
  };

  return {
    ...currentState,
    ...persisted,
    bottomBarConfig: mergedBottomBarConfig,
    notifications: mergedNotifications,
    player: mergedPlayer,
  };
}
