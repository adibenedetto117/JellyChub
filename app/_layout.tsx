import { useEffect, useState } from 'react';
import { View, Platform, InteractionManager } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryProvider } from '@/providers';
import { useAuthStore, useSettingsStore } from '@/stores';
import { jellyfinClient, jellyseerrClient } from '@/api';
import { notificationService } from '@/services';
import { useDeepLinking } from '@/hooks';
import { ErrorBoundary } from '@/components/ui';
import { MiniPlayer } from '@/components/player';
import { BottomNav } from '@/components/navigation';
import { TVSidebar } from '@/components/tv';
import { SecurityLockScreen } from '@/components/security';
import { TVFocusProvider } from '@/contexts';
import { isTV } from '@/utils/platform';
import { colors } from '@/theme';
import '../global.css';

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
  freezeOnBlur: true,
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
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const activeServer = useAuthStore((state) => state.getActiveServer());
  const jellyseerrUrl = useSettingsStore((state) => state.jellyseerrUrl);
  const jellyseerrAuthToken = useSettingsStore((state) => state.jellyseerrAuthToken);

  useDeepLinking();

  // Defer client initialization to after navigation animations complete
  // This prevents jank during initial app load and screen transitions
  useEffect(() => {
    if (activeServer?.url) {
      // Use InteractionManager to defer heavy initialization
      const handle = InteractionManager.runAfterInteractions(() => {
        jellyfinClient.initialize(activeServer.url);
      });
      return () => handle.cancel();
    }
  }, [activeServer?.url]);

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken) {
      // Defer Jellyseerr client initialization
      const handle = InteractionManager.runAfterInteractions(() => {
        jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
      });
      return () => handle.cancel();
    }
  }, [jellyseerrUrl, jellyseerrAuthToken]);

  useEffect(() => {
    notificationService.initialize();
  }, []);

  useEffect(() => {
    const insetsReady = insets.top > 0 || insets.bottom > 0;
    if (insetsReady || isReady) {
      setIsReady(true);
      SplashScreen.hideAsync();
    } else {
      const timeout = setTimeout(() => {
        setIsReady(true);
        SplashScreen.hideAsync();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [insets, isReady]);

  if (!isReady) {
    return <View style={{ flex: 1, backgroundColor: colors.background.primary }} />;
  }

  return (
    <View style={{ flex: 1, flexDirection: isTV ? 'row' : 'column' }}>
      <StatusBar style="light" />
      {/* TV Sidebar - Left side navigation for TV */}
      {isTV && <TVSidebar />}
      <View style={{ flex: 1 }}>
        <Stack screenOptions={DEFAULT_SCREEN_OPTIONS}>
        {/* Auth screens - crossfade for seamless transition */}
        <Stack.Screen name="(auth)" options={AUTH_SCREEN_OPTIONS} />

        {/* Main tabs - fade transition for tab switches */}
        <Stack.Screen name="(tabs)" options={TABS_SCREEN_OPTIONS} />

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
