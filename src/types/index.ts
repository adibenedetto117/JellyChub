export * from './jellyfin';
export * from './jellyseerr';
export * from './livetv';
export * from './player';
import './react-native-tv';

export type { ElectronAPI, ElectronPlatformInfo, ElectronThemeInfo } from './electron';

export interface AppSettings {
  servers: import('./jellyfin').JellyfinServer[];
  activeServerId?: string;
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  enableAnimations: boolean;
  player: import('./player').PlayerSettings;
  downloadQuality: 'original' | 'high' | 'medium' | 'low';
  downloadOverWifiOnly: boolean;
  maxDownloadSize: number;
  isTVMode: boolean;
}

export interface DownloadItem {
  id: string;
  itemId: string;
  serverId: string;
  item: import('./jellyfin').BaseItem;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number;
  totalBytes: number;
  downloadedBytes: number;
  localPath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
  quality?: 'original' | 'high' | 'medium' | 'low';
}

export interface CachedImage {
  remoteUrl: string;
  localPath: string;
  cachedAt: string;
}

export type RootStackParamList = {
  '(tabs)': undefined;
  '(auth)': undefined;
  'player/video': { itemId: string; resume?: string };
  'player/music': { itemId: string };
  'player/audiobook': { itemId: string };
  'reader/epub': { itemId: string };
  'reader/comic': { itemId: string };
  'details/movie': { itemId: string };
  'details/series': { itemId: string };
  'details/album': { itemId: string };
  'details/artist': { itemId: string };
  'details/book': { itemId: string };
};

export type TabParamList = {
  home: undefined;
  movies: undefined;
  shows: undefined;
  music: undefined;
  books: undefined;
  settings: undefined;
};
