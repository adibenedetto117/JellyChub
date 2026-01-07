import { useEffect, useState } from 'react';
import { View } from 'react-native';
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
import { colors } from '@/theme';
import '../global.css';

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
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="player/video"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="player/music"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="player/audiobook"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="reader/epub"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="reader/pdf"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="reader/comic"
          options={{
            animation: 'fade',
            presentation: 'fullScreenModal',
          }}
        />
        <Stack.Screen
          name="settings/jellyseerr"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="settings/bottom-bar"
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="search"
          options={{
            animation: 'slide_from_bottom',
            presentation: 'modal',
            gestureEnabled: true,
            gestureDirection: 'vertical',
          }}
        />
      </Stack>
      <MiniPlayer />
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
