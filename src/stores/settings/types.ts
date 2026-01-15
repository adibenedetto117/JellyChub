import type { PlayerSettings, PlayerControlsConfig, PlayerControlId } from '@/types';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';

export type LibrarySortBy = 'SortName' | 'DateCreated' | 'PremiereDate' | 'CommunityRating' | 'Runtime';
export type LibrarySortOrder = 'Ascending' | 'Descending';
export type LibraryCategory = 'movies' | 'shows' | 'music' | 'books';

export interface LibrarySortPreference {
  sortBy: LibrarySortBy;
  sortOrder: LibrarySortOrder;
}

export type LibrarySortPreferences = Record<LibraryCategory, LibrarySortPreference>;

export type FixedTabId = 'home' | 'search' | 'library' | 'downloads' | 'settings';

export type TabId = 'home' | 'search' | 'library' | 'downloads' | 'jellyseerr' | 'admin' | 'settings' | 'livetv' | 'more' | 'radarr' | 'sonarr' | 'favorites' | string;

export interface BottomBarConfig {
  showHome: boolean;
  showLibrary: boolean;
  showDownloads: boolean;
  showAdmin: boolean;
  showJellyseerr: boolean;
  showRadarr: boolean;
  showSonarr: boolean;
  showFavorites: boolean;
  showLiveTV: boolean;
  showMore: boolean;
  moreMenuTabs: TabId[];
  selectedLibraryIds: string[];
  tabOrder: TabId[];
  landingPage: TabId;
}

export interface UISettingsState {
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  enableAnimations: boolean;
  reduceMotion: boolean;
  bottomBarConfig: BottomBarConfig;
  isTVMode: boolean;
  offlineMode: boolean;
  hideMedia: boolean;
  hapticsEnabled: boolean;
  language: string | null;
}

export interface DownloadSettingsState {
  downloadQuality: 'original' | 'high' | 'medium' | 'low';
  downloadOverWifiOnly: boolean;
  autoRemoveWatchedDownloads: boolean;
  maxDownloadSize: number;
}

export interface JellyseerrSettingsState {
  jellyseerrUrl: string | null;
  jellyseerrAuthToken: string | null;
  jellyseerrUsername: string | null;
  jellyseerrJellyfinServerUrl: string | null;
  jellyseerrJellyfinUserId: string | null;
  jellyseerrJellyfinToken: string | null;
  jellyseerrSessionCookie: string | null;
  jellyseerrConnectionStatus: 'unknown' | 'connected' | 'error';
  jellyseerrUseCustomHeaders: boolean;
  jellyseerrHideAvailable: boolean;
  jellyseerrHideProcessing: boolean;
  jellyseerrHidePartial: boolean;
  jellyseerrMediaFilter: 'all' | 'movie' | 'tv';
  jellyseerrGenreFilter: number[];
  jellyseerrMinRating: number;
  jellyseerrRatingSource: 'tmdb' | 'imdb' | 'any';
  jellyseerrYearFilter: number | null;
}

export interface RadarrSettingsState {
  radarrUrl: string | null;
  radarrApiKey: string | null;
  radarrConnectionStatus: 'unknown' | 'connected' | 'error';
  radarrUseCustomHeaders: boolean;
}

export interface SonarrSettingsState {
  sonarrUrl: string | null;
  sonarrApiKey: string | null;
  sonarrConnectionStatus: 'unknown' | 'connected' | 'error';
  sonarrUseCustomHeaders: boolean;
}

export interface NotificationSettings {
  downloadComplete: boolean;
  nowPlaying: boolean;
}

export interface PlayerState {
  player: PlayerSettings;
  librarySortPreferences: LibrarySortPreferences;
  equalizerPreset: string;
  customEqualizerBands: number[];
  openSubtitlesApiKey: string | null;
}

export interface SettingsState extends
  UISettingsState,
  DownloadSettingsState,
  JellyseerrSettingsState,
  RadarrSettingsState,
  SonarrSettingsState,
  PlayerState {
  _hasHydrated: boolean;
  notifications: NotificationSettings;
}
