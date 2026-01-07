import { useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { QueryProvider } from '@/providers';
import { useAuthStore, useSettingsStore } from '@/stores';
import { jellyfinClient, jellyseerrClient } from '@/api';
import { useDeepLinking } from '@/hooks';
import { ErrorBoundary } from '@/components/ui';
import { MiniPlayer } from '@/components/player';
import { BottomNav } from '@/components/navigation';
import { colors } from '@/theme';
import '../global.css';

// Animation duration constants for consistent feel across the app
const ANIMATION_DURATION = {
  fast: 180,
  normal: 250,
  modal: 300,
} as const;

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const insets = useSafeAreaInsets();
  const [isReady, setIsReady] = useState(false);
  const activeServer = useAuthStore((state) => state.getActiveServer());
  const jellyseerrUrl = useSettingsStore((state) => state.jellyseerrUrl);
  const jellyseerrAuthToken = useSettingsStore((state) => state.jellyseerrAuthToken);

  useDeepLinking();

  useEffect(() => {
    if (activeServer?.url) {
      jellyfinClient.initialize(activeServer.url);
    }
  }, [activeServer?.url]);

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken) {
      jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
    }
  }, [jellyseerrUrl, jellyseerrAuthToken]);

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
    <View style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.primary },
          // Default animation: slide from right for push, slide from left for back
          animation: 'slide_from_right',
          animationDuration: ANIMATION_DURATION.normal,
          // Enable native gesture for going back with swipe
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          // Smooth native-feeling animation curves
          ...(Platform.OS === 'ios' && {
            // iOS-specific: use native spring animation for smoother feel
            animationTypeForReplace: 'push',
          }),
        }}
      >
        {/* Auth screens - crossfade for seamless transition */}
        <Stack.Screen
          name="(auth)"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.fast,
            gestureEnabled: false,
          }}
        />

        {/* Main tabs - fade transition for tab switches */}
        <Stack.Screen
          name="(tabs)"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.fast,
            gestureEnabled: false,
          }}
        />

        {/* Video player - fade in for immersive experience */}
        <Stack.Screen
          name="player/video"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.normal,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />

        {/* Music player - slide up modal with smooth animation */}
        <Stack.Screen
          name="player/music"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: ANIMATION_DURATION.modal,
            presentation: 'transparentModal',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />

        {/* Audiobook player - slide up modal */}
        <Stack.Screen
          name="player/audiobook"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: ANIMATION_DURATION.modal,
            presentation: 'modal',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />

        {/* Reader screens - fade for immersive reading experience */}
        <Stack.Screen
          name="reader/epub"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.normal,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="reader/pdf"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.normal,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="reader/comic"
          options={{
            animation: 'fade',
            animationDuration: ANIMATION_DURATION.normal,
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />

        {/* Settings screens - native slide animation */}
        <Stack.Screen
          name="settings/jellyseerr"
          options={{
            animation: 'slide_from_right',
            animationDuration: ANIMATION_DURATION.normal,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />
        <Stack.Screen
          name="settings/bottom-bar"
          options={{
            animation: 'slide_from_right',
            animationDuration: ANIMATION_DURATION.normal,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        />

        {/* Search modal - slide up with vertical swipe to dismiss */}
        <Stack.Screen
          name="search"
          options={{
            animation: 'slide_from_bottom',
            animationDuration: ANIMATION_DURATION.modal,
            presentation: 'modal',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
      </Stack>
      <MiniPlayer />
      <BottomNav />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <ErrorBoundary>
          <QueryProvider>
            <AppContent />
          </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
