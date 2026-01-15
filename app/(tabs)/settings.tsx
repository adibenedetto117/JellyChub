import { useState, useCallback } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import {
  SettingsHeader,
  AccountSection,
  IntegrationsSection,
  SecuritySection,
  AppearanceSection,
  PlaybackSection,
  DownloadsSection,
  AboutSection,
  OpenSubtitlesModal,
  NavigationSection,
  NotificationsSection,
  OfflineModeSection,
  UserSwitcher,
} from '@/components/shared/settings';

export default function SettingsScreen() {
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showOpenSubtitlesInput, setShowOpenSubtitlesInput] = useState(false);
  const [showHideMediaToggle, setShowHideMediaToggle] = useState(false);

  const { currentUser, logout, servers, activeServerId } = useAuthStore();
  const {
    accentColor,
    jellyseerrUsername,
    jellyseerrAuthToken,
    offlineMode,
    hideMedia,
    openSubtitlesApiKey,
    setOpenSubtitlesApiKey,
    radarrApiKey,
    radarrConnectionStatus,
    sonarrApiKey,
    sonarrConnectionStatus,
    jellyseerrConnectionStatus,
  } = useSettingsStore();

  const activeServer = servers.find((s) => s.id === activeServerId);

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }, [logout]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        <SettingsHeader />

        {!offlineMode && (
          <AccountSection
            currentUserName={currentUser?.Name}
            activeServerName={activeServer?.name}
            hideMedia={hideMedia}
            onSwitchUser={() => setShowUserSwitcher(true)}
            onLogout={handleLogout}
          />
        )}

        {!offlineMode && (
          <IntegrationsSection
            jellyseerrAuthToken={jellyseerrAuthToken}
            jellyseerrConnectionStatus={jellyseerrConnectionStatus}
            jellyseerrUsername={jellyseerrUsername}
            radarrApiKey={radarrApiKey}
            radarrConnectionStatus={radarrConnectionStatus}
            sonarrApiKey={sonarrApiKey}
            sonarrConnectionStatus={sonarrConnectionStatus}
            openSubtitlesApiKey={openSubtitlesApiKey}
            hideMedia={hideMedia}
            onOpenSubtitlesPress={() => setShowOpenSubtitlesInput(true)}
          />
        )}

        {!offlineMode && <NavigationSection />}

        <OfflineModeSection />

        <SecuritySection accentColor={accentColor} />

        <AppearanceSection showHideMediaToggle={showHideMediaToggle} />

        <NotificationsSection />

        <PlaybackSection />

        <DownloadsSection />

        <AboutSection
          onHideMediaToggleUnlocked={() => setShowHideMediaToggle(true)}
        />

        <View className="h-24" />
      </ScrollView>

      {showUserSwitcher && <UserSwitcher onClose={() => setShowUserSwitcher(false)} />}

      <OpenSubtitlesModal
        visible={showOpenSubtitlesInput}
        currentApiKey={openSubtitlesApiKey}
        accentColor={accentColor}
        onSave={setOpenSubtitlesApiKey}
        onClose={() => setShowOpenSubtitlesInput(false)}
      />
    </SafeAreaView>
  );
}
