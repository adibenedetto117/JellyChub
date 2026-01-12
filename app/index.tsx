import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { selectAuthHasHydrated, selectActiveServer } from '@/stores/authStore';
import { selectHasHydrated } from '@/stores/settingsStore';
import { jellyfinClient } from '@/api';
import { colors } from '@/theme';

export default function Index() {
  const authHasHydrated = useAuthStore(selectAuthHasHydrated);
  const settingsHasHydrated = useSettingsStore(selectHasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasServers = useAuthStore((state) => state.servers.length > 0);
  const activeServer = useAuthStore(selectActiveServer);
  const landingPage = useSettingsStore((state) => state.bottomBarConfig?.landingPage ?? 'home');
  const [clientReady, setClientReady] = useState(false);

  // Initialize the API client as soon as we have server info
  // This must happen before redirecting to home screen
  useEffect(() => {
    if (authHasHydrated && activeServer?.url) {
      jellyfinClient.initialize(activeServer.url, activeServer.customHeaders);
      setClientReady(true);
    } else if (authHasHydrated && !activeServer) {
      // No server configured, still allow redirect to auth flow
      setClientReady(true);
    }
  }, [authHasHydrated, activeServer?.url, activeServer?.customHeaders]);

  // Wait for both stores to be loaded from storage before redirecting
  if (!authHasHydrated || !settingsHasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  if (!hasServers) {
    return <Redirect href="/(auth)/server-select" />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // Wait for client to be initialized before redirecting to authenticated screens
  if (!clientReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background.primary, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return <Redirect href={`/(tabs)/${landingPage}` as Href} />;
}
