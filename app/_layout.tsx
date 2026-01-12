import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryProvider } from '@/providers';
import { useAuthStore, useSettingsStore, useNavigationStore, useDownloadStore, selectActiveServer, selectDownloadHasHydrated } from '@/stores';
import { jellyfinClient, jellyseerrClient } from '@/api';
import { notificationService, downloadManager } from '@/services';
import { useDeepLinking, useGlobalBackHandler } from '@/hooks';
import { ErrorBoundary } from '@/components/ui';
import { MiniPlayer } from '@/components/player';
import { BottomNav } from '@/components/navigation';
import { TVSidebar } from '@/components/tv';
import { SecurityLockScreen } from '@/components/security';
import { TVFocusProvider } from '@/contexts';
import { isTV } from '@/utils/platform';
import { colors } from '@/theme';
import initI18n from '@/i18n';
import '../global.css';

// Initialize i18n before app renders
initI18n();

// Optimized animation duration constants - faster for snappier feel
const ANIMATION_DURATION = {
  fast: 150,      // Reduced from 180 for snappier transitions
  normal: 200,    // Reduced from 250 for more responsive feel
  modal: 250,     // Reduced from 300 for faster modal presentation
} as const;

const DEFAULT_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: colors.background.primary },
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.fast,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
  freezeOnBlur: true,
  ...(Platform.OS === 'ios' && {
    animationTypeForReplace: 'push' as const,
  }),
};

const AUTH_SCREEN_OPTIONS = {
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.fast,
  gestureEnabled: false,
};

const TABS_SCREEN_OPTIONS = {
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.fast,
  gestureEnabled: false,
  // freezeOnBlur disabled - it interferes with back navigation
  freezeOnBlur: false,
};

const VIDEO_PLAYER_OPTIONS = {
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.normal,
  presentation: 'fullScreenModal' as const,
  gestureEnabled: false,
};

const LIVETV_PLAYER_OPTIONS = {
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.normal,
  presentation: 'fullScreenModal' as const,
  gestureEnabled: false,
};

const MUSIC_PLAYER_OPTIONS = {
  animation: 'slide_from_bottom' as const,
  animationDuration: ANIMATION_DURATION.modal,
  presentation: 'transparentModal' as const,
  gestureEnabled: true,
  gestureDirection: 'vertical' as const,
};

const AUDIOBOOK_PLAYER_OPTIONS = {
  animation: 'slide_from_bottom' as const,
  animationDuration: ANIMATION_DURATION.modal,
  presentation: 'modal' as const,
  gestureEnabled: true,
  gestureDirection: 'vertical' as const,
};

const READER_OPTIONS = {
  animation: 'fade' as const,
  animationDuration: ANIMATION_DURATION.normal,
  presentation: 'fullScreenModal' as const,
  gestureEnabled: false,
};

const SETTINGS_SCREEN_OPTIONS = {
  animation: 'slide_from_right' as const,
  animationDuration: ANIMATION_DURATION.normal,
  gestureEnabled: true,
  gestureDirection: 'horizontal' as const,
};

const SEARCH_MODAL_OPTIONS = {
  animation: 'slide_from_bottom' as const,
  animationDuration: ANIMATION_DURATION.modal,
  presentation: 'modal' as const,
  gestureEnabled: true,
  gestureDirection: 'vertical' as const,
};

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const [isReady, setIsReady] = useState(false);
  const activeServer = useAuthStore(selectActiveServer);
  const jellyseerrUrl = useSettingsStore((state) => state.jellyseerrUrl);
  const jellyseerrAuthToken = useSettingsStore((state) => state.jellyseerrAuthToken);
  const pushNavigation = useNavigationStore((state) => state.push);
  const downloadStoreHydrated = useDownloadStore(selectDownloadHasHydrated);
  const pathname = usePathname();

  useDeepLinking();
  useGlobalBackHandler();

  useEffect(() => {
    if (pathname) {
      pushNavigation(pathname);
    }
  }, [pathname, pushNavigation]);

  // Initialize API clients immediately when credentials are available
  // This must happen synchronously so queries can execute on first render
  useEffect(() => {
    if (activeServer?.url) {
      jellyfinClient.initialize(activeServer.url, activeServer.customHeaders);
    }
  }, [activeServer?.url, activeServer?.customHeaders]);

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken) {
      jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
    }
  }, [jellyseerrUrl, jellyseerrAuthToken]);

  useEffect(() => {
    notificationService.initialize();
  }, []);

  // Validate downloads after store hydration to clean up orphaned records
  useEffect(() => {
    if (downloadStoreHydrated) {
      downloadManager.validateDownloads().catch((error) => {
        console.error('[App] Error validating downloads:', error);
      });
    }
  }, [downloadStoreHydrated]);

  // Use initialWindowMetrics for stable, synchronous layout
  // This avoids the race condition where dynamic insets change after initial render
  useEffect(() => {
    if (isReady) return;

    // initialWindowMetrics provides stable insets synchronously
    // If available and valid, we can show content immediately
    const hasValidMetrics = initialWindowMetrics &&
      (initialWindowMetrics.insets.top > 0 || initialWindowMetrics.insets.bottom > 0 ||
       initialWindowMetrics.frame.height > 0);

    if (hasValidMetrics) {
      setIsReady(true);
      SplashScreen.hideAsync();
    } else {
      // Fallback for edge cases where initialWindowMetrics is unavailable
      const timeout = setTimeout(() => {
        setIsReady(true);
        SplashScreen.hideAsync();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [isReady]);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background.primary }} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: isTV ? 'row' : 'column' }}>
      <StatusBar style="light" />
      {/* Connection status indicator - disabled */}
      {/* {!isTV && <ConnectionStatusIndicator />} */}
      {/* TV Sidebar - Left side navigation for TV */}
      {isTV && <TVSidebar />}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={DEFAULT_SCREEN_OPTIONS}>
        {/* Auth screens - crossfade for seamless transition */}
        <Stack.Screen name="(auth)" options={AUTH_SCREEN_OPTIONS} />

        {/* Main tabs - fade transition for tab switches */}
        <Stack.Screen name="(tabs)" options={TABS_SCREEN_OPTIONS} />

        {/* Details screen - root level for proper back navigation */}
        <Stack.Screen name="details/[type]/[id]" options={SETTINGS_SCREEN_OPTIONS} />

        {/* Library collection screen - root level for proper back navigation */}
        <Stack.Screen name="library/[id]" options={SETTINGS_SCREEN_OPTIONS} />

        {/* Video player - fade in for immersive experience */}
        <Stack.Screen name="player/video" options={VIDEO_PLAYER_OPTIONS} />

        {/* Live TV player - fade in for immersive experience */}
        <Stack.Screen name="player/livetv" options={LIVETV_PLAYER_OPTIONS} />

        {/* Music player - slide up modal with smooth animation */}
        <Stack.Screen name="player/music" options={MUSIC_PLAYER_OPTIONS} />

        {/* Audiobook player - slide up modal */}
        <Stack.Screen name="player/audiobook" options={AUDIOBOOK_PLAYER_OPTIONS} />

        {/* Reader screens - fade for immersive reading experience */}
        <Stack.Screen name="reader/epub" options={READER_OPTIONS} />
        <Stack.Screen name="reader/pdf" options={READER_OPTIONS} />
        <Stack.Screen name="reader/comic" options={READER_OPTIONS} />

        {/* Settings screens - native slide animation */}
        <Stack.Screen name="settings/jellyseerr" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/bottom-bar" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/custom-headers" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/player-controls" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/radarr" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/sonarr" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/radarr-manage" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/sonarr-manage" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/radarr-calendar" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/sonarr-calendar" options={SETTINGS_SCREEN_OPTIONS} />
        <Stack.Screen name="settings/arr-queue" options={SETTINGS_SCREEN_OPTIONS} />

        {/* Search modal - slide up with vertical swipe to dismiss */}
        <Stack.Screen name="search" options={SEARCH_MODAL_OPTIONS} />
      </Stack>
      <MiniPlayer />
      {/* Bottom navigation - hidden on TV (uses sidebar instead) */}
      {!isTV && <BottomNav />}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ErrorBoundary>
          <QueryProvider>
            <SecurityLockScreen>
              <AppContent />
            </SecurityLockScreen>
          </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (isTV) {
    return <TVFocusProvider>{content}</TVFocusProvider>;
  }

  return content;
}
