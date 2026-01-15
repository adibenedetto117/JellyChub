import { Platform, Dimensions } from 'react-native';

// Check if running on TV
// Note: react-native-device-info would be more reliable but this works for basic detection
export const isTV = Platform.isTV;

// Check if tablet based on screen size
const { width, height } = Dimensions.get('window');
const screenSize = Math.min(width, height);
export const isTablet = screenSize >= 600;

// Platform detection
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
export const isWeb = Platform.OS === 'web';

// Desktop detection (Electron environment)
export const isDesktop = isWeb && typeof window !== 'undefined' && !!(window as any).electronAPI;
export const isMacOS = isDesktop && typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
export const isWindows = isDesktop && typeof navigator !== 'undefined' && /Win/i.test(navigator.platform);
export const isLinux = isDesktop && typeof navigator !== 'undefined' && /Linux/i.test(navigator.platform);

// Platform-specific selection utility
export function platformSelect<T>(options: {
  mobile: T;
  tablet?: T;
  tv?: T;
  desktop?: T;
  ios?: T;
  android?: T;
  web?: T;
}): T {
  // TV takes priority
  if (isTV && options.tv !== undefined) {
    return options.tv;
  }

  // Desktop (Electron) takes priority over web
  if (isDesktop && options.desktop !== undefined) {
    return options.desktop;
  }

  // Platform-specific overrides
  if (isIOS && options.ios !== undefined) {
    return options.ios;
  }
  if (isAndroid && options.android !== undefined) {
    return options.android;
  }
  if (isWeb && options.web !== undefined) {
    return options.web;
  }

  // Tablet fallback
  if (isTablet && options.tablet !== undefined) {
    return options.tablet;
  }

  // Default to mobile
  return options.mobile;
}

// Screen dimensions with updates support
export function useScreenDimensions() {
  // This would use a hook with dimension change listener
  // For now, return static values
  const window = Dimensions.get('window');
  const screen = Dimensions.get('screen');

  return {
    window: {
      width: window.width,
      height: window.height,
    },
    screen: {
      width: screen.width,
      height: screen.height,
    },
    isLandscape: window.width > window.height,
    isPortrait: window.height > window.width,
  };
}

// Safe area padding defaults
export const safeAreaDefaults = platformSelect({
  mobile: {
    top: isIOS ? 44 : 24,
    bottom: isIOS ? 34 : 0,
    left: 0,
    right: 0,
  },
  tablet: {
    top: isIOS ? 24 : 24,
    bottom: isIOS ? 20 : 0,
    left: 0,
    right: 0,
  },
  tv: {
    top: 48,
    bottom: 48,
    left: 48,
    right: 48,
  },
  desktop: {
    top: isMacOS ? 28 : 0, // macOS title bar
    bottom: 0,
    left: 0,
    right: 0,
  },
});

// TV-specific constants
export const tvConstants = {
  // Focus animations
  focusScale: 1.05,
  focusDuration: 150,

  // Layout dimensions
  rowItemWidth: 200,
  rowItemHeight: 300,
  headerHeight: 80,
  sidebarWidth: 300,

  // Video player controls
  controlButtonSize: 80,
  seekButtonSize: 64,
  smallButtonSize: 48,
  focusRingWidth: 4,

  // Playback
  seekStepMs: 10000, // 10 seconds
  volumeStep: 0.1, // 10% volume change

  // Spacing
  controlBarPadding: 48,
  buttonGap: 16,
  progressBarHeight: 8,
};

// Desktop-specific constants
export const desktopConstants = {
  // Window dimensions
  minWindowWidth: 800,
  minWindowHeight: 600,
  defaultWindowWidth: 1280,
  defaultWindowHeight: 720,

  // Sidebar
  sidebarWidth: 240,
  sidebarCollapsedWidth: 64,

  // Header
  headerHeight: 48,
  titleBarHeight: isMacOS ? 28 : 32,

  // Video player controls
  controlButtonSize: 40,
  seekButtonSize: 36,
  smallButtonSize: 28,

  // Hover animations
  hoverScale: 1.02,
  hoverDuration: 100,

  // Playback
  seekStepMs: 5000, // 5 seconds for desktop (more precise)
  volumeStep: 0.05, // 5% volume change

  // Keyboard shortcuts
  shortcuts: {
    play: ' ', // Space
    fullscreen: 'f',
    mute: 'm',
    seekForward: 'ArrowRight',
    seekBackward: 'ArrowLeft',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    escape: 'Escape',
  },
};
