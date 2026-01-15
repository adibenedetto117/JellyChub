/**
 * Electron API type definitions
 * These types are exposed via the preload script when running in Electron
 */

export interface ElectronPlatformInfo {
  isMac: boolean;
  isWindows: boolean;
  isLinux: boolean;
  platform: 'darwin' | 'win32' | 'linux';
}

export interface ElectronThemeInfo {
  shouldUseDarkColors: boolean;
  themeSource: 'dark' | 'light' | 'system';
}

export interface ElectronAPI {
  // Platform info
  getPlatform: () => Promise<ElectronPlatformInfo>;

  // Theme
  getTheme: () => Promise<ElectronThemeInfo>;
  setTheme: (theme: 'dark' | 'light' | 'system') => Promise<{ success: boolean }>;

  // Window controls
  windowMinimize: () => Promise<void>;
  windowMaximize: () => Promise<boolean>;
  windowClose: () => Promise<void>;
  windowIsMaximized: () => Promise<boolean>;

  // Fullscreen
  toggleFullscreen: () => Promise<boolean>;
  isFullscreen: () => Promise<boolean>;

  // Event listeners
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  onFullscreenChange: (callback: (isFullscreen: boolean) => void) => () => void;
  onThemeChange: (callback: (theme: ElectronThemeInfo) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
