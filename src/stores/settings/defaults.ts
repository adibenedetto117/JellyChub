import type { PlayerSettings } from '@/types';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';
import { DEFAULT_EQUALIZER_PRESET } from '@/constants/equalizer';
import { isTV } from '@/utils/platform';
import type {
  TabId,
  BottomBarConfig,
  LibrarySortPreferences,
  SettingsState,
} from './types';

export const DEFAULT_TAB_ORDER: TabId[] = [
  'home',
  'library',
  'downloads',
  'more',
  'settings',
];

export const DEFAULT_BOTTOM_BAR_CONFIG: BottomBarConfig = {
  showHome: true,
  showLibrary: true,
  showDownloads: true,
  showAdmin: false,
  showJellyseerr: false,
  showRadarr: false,
  showSonarr: false,
  showFavorites: false,
  showLiveTV: false,
  showMore: true,
  moreMenuTabs: ['jellyseerr', 'admin', 'radarr', 'sonarr', 'favorites', 'livetv'],
  selectedLibraryIds: [],
  tabOrder: DEFAULT_TAB_ORDER,
  landingPage: 'home',
};

export const MAX_LIBRARY_TABS = 3;

export const ACCENT_COLOR_PRESETS = [
  { name: 'Blue', color: '#0ea5e9' },
  { name: 'Teal', color: '#14b8a6' },
  { name: 'Green', color: '#22c55e' },
  { name: 'Orange', color: '#f97316' },
  { name: 'Red', color: '#ef4444' },
  { name: 'Pink', color: '#ec4899' },
] as const;

export const defaultPlayerSettings: PlayerSettings = {
  autoPlay: true,
  defaultSubtitleLanguage: 'eng',
  defaultAudioLanguage: 'eng',
  forceSubtitles: false,
  subtitleSize: 'medium',
  subtitlePosition: 'bottom',
  subtitleBackgroundOpacity: 0.75,
  subtitleTextColor: '#ffffff',
  subtitleBackgroundColor: '#000000',
  subtitleOutlineStyle: 'shadow',
  hardwareAcceleration: true,
  maxStreamingBitrate: 20,
  externalPlayerEnabled: true,
  controlsConfig: DEFAULT_PLAYER_CONTROLS_CONFIG,
  controlsOrder: DEFAULT_PLAYER_CONTROLS_ORDER,
};

export const defaultLibrarySortPreferences: LibrarySortPreferences = {
  movies: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  shows: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  music: { sortBy: 'DateCreated', sortOrder: 'Descending' },
  books: { sortBy: 'DateCreated', sortOrder: 'Descending' },
};

export const initialSettingsState: Omit<SettingsState, '_hasHydrated'> = {
  theme: 'dark',
  accentColor: '#0ea5e9',
  enableAnimations: true,
  reduceMotion: false,
  bottomBarConfig: DEFAULT_BOTTOM_BAR_CONFIG,
  player: defaultPlayerSettings,
  downloadQuality: 'high',
  downloadOverWifiOnly: true,
  autoRemoveWatchedDownloads: false,
  maxDownloadSize: 50,
  jellyseerrUrl: null,
  jellyseerrAuthToken: null,
  jellyseerrUsername: null,
  jellyseerrJellyfinServerUrl: null,
  jellyseerrJellyfinUserId: null,
  jellyseerrJellyfinToken: null,
  jellyseerrSessionCookie: null,
  isTVMode: isTV,
  offlineMode: false,
  hideMedia: false,
  hapticsEnabled: true,
  librarySortPreferences: defaultLibrarySortPreferences,
  equalizerPreset: DEFAULT_EQUALIZER_PRESET,
  customEqualizerBands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  openSubtitlesApiKey: null,
  radarrUrl: null,
  radarrApiKey: null,
  radarrConnectionStatus: 'unknown',
  radarrUseCustomHeaders: false,
  sonarrUrl: null,
  sonarrApiKey: null,
  sonarrConnectionStatus: 'unknown',
  sonarrUseCustomHeaders: false,
  jellyseerrConnectionStatus: 'unknown',
  jellyseerrUseCustomHeaders: false,
  jellyseerrHideAvailable: false,
  jellyseerrHideProcessing: false,
  jellyseerrHidePartial: false,
  jellyseerrMediaFilter: 'all',
  jellyseerrGenreFilter: [],
  jellyseerrMinRating: 0,
  jellyseerrRatingSource: 'tmdb',
  jellyseerrYearFilter: null,
  notifications: {
    downloadComplete: true,
    nowPlaying: true,
  },
  language: null,
};
