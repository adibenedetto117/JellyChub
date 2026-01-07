export * from './jellyfin';
export * from './player';

// App-specific types
export interface AppSettings {
  // Server settings
  servers: import('./jellyfin').JellyfinServer[];
  activeServerId?: string;

  // UI settings
  theme: 'dark' | 'light' | 'system';
  accentColor: string;
  enableAnimations: boolean;

  // Playback settings
  player: import('./player').PlayerSettings;

  // Download settings
  downloadQuality: 'original' | 'high' | 'medium' | 'low';
  downloadOverWifiOnly: boolean;
  maxDownloadSize: number; // in GB

  // TV mode
  isTVMode: boolean;
}

export interface DownloadItem {
  id: string;
  itemId: string;
  serverId: string;
  item: import('./jellyfin').BaseItem;
  status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed';
  progress: number; // 0-100
  totalBytes: number;
  downloadedBytes: number;
  localPath?: string;
  error?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CachedImage {
  remoteUrl: string;
  localPath: string;
  cachedAt: string;
}

// Navigation types
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
