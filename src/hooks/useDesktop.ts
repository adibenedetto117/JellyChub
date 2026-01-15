/**
 * Desktop/Electron Integration Hook
 *
 * Provides access to Electron APIs when running as a desktop app.
 * Returns null/no-op functions when not in Electron environment.
 */
import { useState, useEffect, useCallback } from 'react';
import { isDesktop } from '@/utils/platform';
import type { ElectronPlatformInfo, ElectronThemeInfo } from '@/types/electron';

export interface UseDesktopReturn {
  isDesktop: boolean;
  isElectron: boolean;
  platform: ElectronPlatformInfo | null;

  // Window controls
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: boolean;

  // Fullscreen
  toggleFullscreen: () => void;
  isFullscreen: boolean;

  // Theme
  theme: ElectronThemeInfo | null;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

export function useDesktop(): UseDesktopReturn {
  const [platform, setPlatform] = useState<ElectronPlatformInfo | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [theme, setThemeState] = useState<ElectronThemeInfo | null>(null);

  const electronAPI = typeof window !== 'undefined' ? window.electronAPI : undefined;
  const isElectron = !!electronAPI;

  // Initialize on mount
  useEffect(() => {
    if (!electronAPI) return;

    // Get initial state
    electronAPI.getPlatform().then(setPlatform).catch(console.error);
    electronAPI.windowIsMaximized().then(setIsMaximized).catch(console.error);
    electronAPI.isFullscreen().then(setIsFullscreen).catch(console.error);
    electronAPI.getTheme().then(setThemeState).catch(console.error);

    // Subscribe to changes
    const unsubMaximize = electronAPI.onMaximizeChange(setIsMaximized);
    const unsubFullscreen = electronAPI.onFullscreenChange(setIsFullscreen);
    const unsubTheme = electronAPI.onThemeChange(setThemeState);

    return () => {
      unsubMaximize();
      unsubFullscreen();
      unsubTheme();
    };
  }, [electronAPI]);

  const minimize = useCallback(() => {
    electronAPI?.windowMinimize();
  }, [electronAPI]);

  const maximize = useCallback(() => {
    electronAPI?.windowMaximize().then(setIsMaximized).catch(console.error);
  }, [electronAPI]);

  const close = useCallback(() => {
    electronAPI?.windowClose();
  }, [electronAPI]);

  const toggleFullscreen = useCallback(() => {
    electronAPI?.toggleFullscreen().then(setIsFullscreen).catch(console.error);
  }, [electronAPI]);

  const setTheme = useCallback(
    (newTheme: 'dark' | 'light' | 'system') => {
      electronAPI?.setTheme(newTheme).catch(console.error);
      electronAPI?.getTheme().then(setThemeState).catch(console.error);
    },
    [electronAPI]
  );

  return {
    isDesktop,
    isElectron,
    platform,
    minimize,
    maximize,
    close,
    isMaximized,
    toggleFullscreen,
    isFullscreen,
    theme,
    setTheme,
  };
}

/**
 * Hook for handling desktop keyboard shortcuts
 */
export function useDesktopKeyboard(options: {
  onPlayPause?: () => void;
  onFullscreen?: () => void;
  onMute?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onVolumeUp?: () => void;
  onVolumeDown?: () => void;
  onEscape?: () => void;
  enabled?: boolean;
}) {
  const {
    onPlayPause,
    onFullscreen,
    onMute,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onEscape,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!isDesktop || !enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if typing in an input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          onPlayPause?.();
          break;
        case 'f':
        case 'F':
          event.preventDefault();
          onFullscreen?.();
          break;
        case 'm':
        case 'M':
          event.preventDefault();
          onMute?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          onSeekForward?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          onSeekBackward?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onVolumeUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onVolumeDown?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onPlayPause,
    onFullscreen,
    onMute,
    onSeekForward,
    onSeekBackward,
    onVolumeUp,
    onVolumeDown,
    onEscape,
  ]);
}

export type { ElectronPlatformInfo, ElectronThemeInfo };
