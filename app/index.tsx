import { View, ActivityIndicator } from 'react-native';
import { Redirect, type Href } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { selectAuthHasHydrated } from '@/stores/authStore';
import { selectHasHydrated } from '@/stores/settingsStore';
import { colors } from '@/theme';

export default function Index() {
  const authHasHydrated = useAuthStore(selectAuthHasHydrated);
  const settingsHasHydrated = useSettingsStore(selectHasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasServers = useAuthStore((state) => state.servers.length > 0);
  const landingPage = useSettingsStore((state) => state.bottomBarConfig?.landingPage ?? 'home');

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

  return <Redirect href={`/(tabs)/${landingPage}` as Href} />;
}
