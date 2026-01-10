import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, ActivityIndicator, TextInput, Platform } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useSecurityStore, type AutoLockTimeout } from '@/stores/securityStore';
import { ACCENT_COLOR_PRESETS } from '@/stores/settingsStore';
import { formatBytes, getCacheSize, clearImageCache, type CacheInfo, getDisplayUsername, getDisplayServerName, haptics } from '@/utils';
import { UserSwitcher } from '@/components/settings/UserSwitcher';
import { PinLock } from '@/components/security';
import { downloadManager, notificationService } from '@/services';
import { EQUALIZER_PRESETS, getPresetById } from '@/constants/equalizer';
import { SUPPORTED_LANGUAGES, changeLanguage, i18n } from '@/i18n';
import type { SubtitleFontColor, SubtitleBackgroundColor, SubtitleSize } from '@/types/player';

const SUBTITLE_TEXT_COLORS: { name: string; color: SubtitleFontColor }[] = [
  { name: 'White', color: '#ffffff' },
  { name: 'Yellow', color: '#ffff00' },
  { name: 'Cyan', color: '#00ffff' },
  { name: 'Green', color: '#00ff00' },
];

const SUBTITLE_BG_COLORS: { name: string; color: SubtitleBackgroundColor }[] = [
  { name: 'None', color: 'none' },
  { name: 'Black', color: '#000000' },
  { name: 'Dark Gray', color: '#333333' },
];

const SUBTITLE_SIZES: { label: string; value: SubtitleSize }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Extra Large', value: 'extraLarge' },
];

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingsRow({ title, subtitle, onPress, rightElement }: SettingsRowProps) {
  const hasSwitch = rightElement && typeof rightElement === 'object' && 'type' in rightElement && rightElement.type === Switch;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between py-4 border-b border-surface"
      accessible={true}
      accessibilityRole={hasSwitch ? 'none' : onPress ? 'button' : 'text'}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      accessibilityHint={onPress && !hasSwitch ? `Opens ${title}` : undefined}
    >
      <View className="flex-1" accessible={false} importantForAccessibility="no-hide-descendants">
        <Text className="text-white text-base">{title}</Text>
        {subtitle && (
          <Text className="text-text-tertiary text-sm mt-0.5">{subtitle}</Text>
        )}
      </View>
      {rightElement}
    </Pressable>
  );
}

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View className="mb-6 mx-4" accessible={true} accessibilityRole="none">
      <Text
        className="text-accent text-xs font-semibold uppercase mb-2"
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View className="bg-surface rounded-xl px-4">{children}</View>
    </View>
  );
}

const LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'zho', name: 'Chinese' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'tur', name: 'Turkish' },
  { code: 'pol', name: 'Polish' },
  { code: 'nld', name: 'Dutch' },
  { code: 'swe', name: 'Swedish' },
  { code: 'nor', name: 'Norwegian' },
  { code: 'dan', name: 'Danish' },
  { code: 'fin', name: 'Finnish' },
  { code: 'und', name: 'Unknown' },
];

function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();
}

interface LanguagePickerProps {
  title: string;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  accentColor: string;
}

function LanguagePicker({ title, selectedCode, onSelect, onClose, accentColor }: LanguagePickerProps) {
  return (
    <View
      className="absolute inset-0 bg-black/90 z-50 justify-center items-center"
      accessible={true}
      accessibilityRole="none"
      accessibilityViewIsModal={true}
    >
      <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <Text className="text-white text-lg font-bold" accessibilityRole="header">{title}</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Closes the language picker"
          >
            <Text className="text-white font-bold" accessible={false}>X</Text>
          </Pressable>
        </View>
        <ScrollView className="max-h-[400px]" accessibilityRole="list">
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => {
                onSelect(lang.code);
                onClose();
              }}
              className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
              style={{
                backgroundColor: selectedCode === lang.code ? accentColor + '30' : 'transparent',
              }}
              accessible={true}
              accessibilityRole="radio"
              accessibilityLabel={lang.name}
              accessibilityState={{ checked: selectedCode === lang.code }}
            >
              <Text className="text-white" accessible={false}>{lang.name}</Text>
              {selectedCode === lang.code && (
                <View
                  className="w-5 h-5 rounded-full items-center justify-center"
                  style={{ backgroundColor: accentColor }}
                  accessible={false}
                >
                  <Text className="text-white text-xs">✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const AUTO_LOCK_OPTIONS: { label: string; value: AutoLockTimeout }[] = [
  { label: 'Immediately', value: 'immediate' },
  { label: '1 minute', value: '1min' },
  { label: '5 minutes', value: '5min' },
  { label: '15 minutes', value: '15min' },
  { label: '30 minutes', value: '30min' },
  { label: 'Never', value: 'never' },
];

function getAutoLockLabel(value: AutoLockTimeout): string {
  return AUTO_LOCK_OPTIONS.find((o) => o.value === value)?.label ?? '5 minutes';
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showSubtitleLanguagePicker, setShowSubtitleLanguagePicker] = useState(false);
  const [showAudioLanguagePicker, setShowAudioLanguagePicker] = useState(false);
  const [showEqualizerPicker, setShowEqualizerPicker] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showHideMediaToggle, setShowHideMediaToggle] = useState(false);
  const [showOpenSubtitlesInput, setShowOpenSubtitlesInput] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [setupPin, setSetupPin] = useState('');
  const [showAutoLockPicker, setShowAutoLockPicker] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const { currentUser, logout, servers, activeServerId } = useAuthStore();
  const {
    player,
    accentColor,
    jellyseerrUrl,
    jellyseerrUsername,
    jellyseerrAuthToken,
    offlineMode,
    hideMedia,
    reduceMotion,
    hapticsEnabled,
    equalizerPreset,
    updatePlayerSettings,
    setAccentColor,
    setOfflineMode,
    setHideMedia,
    setReduceMotion,
    setHapticsEnabled,
    setEqualizerPreset,
    openSubtitlesApiKey,
    setOpenSubtitlesApiKey,
    notifications,
    setNotificationSetting,
    radarrApiKey,
    radarrConnectionStatus,
    sonarrApiKey,
    sonarrConnectionStatus,
    jellyseerrConnectionStatus,
    language,
    setLanguage,
  } = useSettingsStore();

  const { usedStorage, maxStorage } = useDownloadStore();

  const {
    settings: securitySettings,
    setSettings: setSecuritySettings,
    removePin,
    biometricType,
    checkBiometricAvailability,
  } = useSecurityStore();

  const activeServer = servers.find((s) => s.id === activeServerId);

  useEffect(() => {
    getCacheSize().then(setCacheInfo);
  }, []);

  useEffect(() => {
    checkBiometricAvailability().then(({ available }) => {
      setBiometricAvailable(available);
    });
  }, [checkBiometricAvailability]);

  const handleClearImageCache = async () => {
    Alert.alert(
      'Clear Image Cache',
      'This will clear all cached images. They will be re-downloaded as needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            await clearImageCache();
            const newCacheInfo = await getCacheSize();
            setCacheInfo(newCacheInfo);
            setIsClearingCache(false);
          },
        },
      ]
    );
  };

  const handleLogout = () => {
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
  };

  const handleChangeServer = () => {
    router.push('/(auth)/server-select');
  };

  const handlePinSetupComplete = useCallback((pin: string) => {
    setSetupPin(pin);
    setShowPinSetup(false);
    setShowPinConfirm(true);
  }, []);

  const handlePinConfirmComplete = useCallback(() => {
    setShowPinConfirm(false);
    setSetupPin('');
    Alert.alert('Success', 'PIN has been set successfully.');
  }, []);

  const handleDisablePin = useCallback(() => {
    Alert.alert(
      'Disable PIN Lock',
      'Are you sure you want to disable PIN lock?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => {
            removePin();
          },
        },
      ]
    );
  }, [removePin]);

  const getBiometricLabel = () => {
    if (biometricType === LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) {
      return Platform.OS === 'ios' ? 'Face ID' : 'Face Unlock';
    }
    return 'Fingerprint';
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        <View className="px-4 py-4">
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{t('settings.title')}</Text>
        </View>

        {!offlineMode && (
          <SettingsSection title={t('settings.account')}>
            <SettingsRow
              title={getDisplayUsername(currentUser?.Name, hideMedia)}
              subtitle={getDisplayServerName(activeServer?.name, hideMedia)}
            />
            <SettingsRow
              title={t('settings.switchUser')}
              onPress={() => setShowUserSwitcher(true)}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
            <SettingsRow
              title={t('settings.changeServer')}
              onPress={handleChangeServer}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
            <SettingsRow
              title="Custom Headers"
              onPress={() => router.push('/settings/custom-headers' as any)}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
            <SettingsRow
              title={t('settings.signOut')}
              onPress={handleLogout}
              rightElement={
                <Text className="text-error">{'>'}</Text>
              }
            />
          </SettingsSection>
        )}

        {!offlineMode && (
          <SettingsSection title={t('settings.integrations')}>
            <SettingsRow
              title={t('settings.jellyseerr')}
              subtitle={
                jellyseerrAuthToken
                  ? jellyseerrConnectionStatus === 'error'
                    ? t('settings.connectionError')
                    : `${t('settings.connected')} (${hideMedia ? 'User' : jellyseerrUsername})`
                  : t('settings.notConfigured')
              }
              onPress={() => router.push('/settings/jellyseerr')}
              rightElement={
                <Text style={{
                  color: !jellyseerrAuthToken
                    ? 'rgba(255,255,255,0.5)'
                    : jellyseerrConnectionStatus === 'error'
                      ? '#ef4444'
                      : jellyseerrConnectionStatus === 'connected'
                        ? '#22c55e'
                        : '#f59e0b'
                }}>
                  {jellyseerrAuthToken ? '●' : '○'}
                </Text>
              }
            />
            <SettingsRow
              title={t('settings.radarr')}
              subtitle={
                radarrApiKey
                  ? radarrConnectionStatus === 'error'
                    ? t('settings.connectionError')
                    : t('settings.connected')
                  : t('settings.notConfigured')
              }
              onPress={() => router.push('/settings/radarr')}
              rightElement={
                <Text style={{
                  color: !radarrApiKey
                    ? 'rgba(255,255,255,0.5)'
                    : radarrConnectionStatus === 'error'
                      ? '#ef4444'
                      : radarrConnectionStatus === 'connected'
                        ? '#22c55e'
                        : '#f59e0b'
                }}>
                  {radarrApiKey ? '●' : '○'}
                </Text>
              }
            />
            <SettingsRow
              title={t('settings.sonarr')}
              subtitle={
                sonarrApiKey
                  ? sonarrConnectionStatus === 'error'
                    ? t('settings.connectionError')
                    : t('settings.connected')
                  : t('settings.notConfigured')
              }
              onPress={() => router.push('/settings/sonarr')}
              rightElement={
                <Text style={{
                  color: !sonarrApiKey
                    ? 'rgba(255,255,255,0.5)'
                    : sonarrConnectionStatus === 'error'
                      ? '#ef4444'
                      : sonarrConnectionStatus === 'connected'
                        ? '#22c55e'
                        : '#f59e0b'
                }}>
                  {sonarrApiKey ? '●' : '○'}
                </Text>
              }
            />
            <SettingsRow
              title={t('settings.opensubtitles')}
              subtitle={openSubtitlesApiKey ? t('settings.connected') : t('settings.notConfigured')}
              onPress={() => {
                setTempApiKey(openSubtitlesApiKey || '');
                setShowOpenSubtitlesInput(true);
              }}
              rightElement={
                <Text style={{ color: openSubtitlesApiKey ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
                  {openSubtitlesApiKey ? '●' : '○'}
                </Text>
              }
            />
          </SettingsSection>
        )}

        {!offlineMode && (
          <SettingsSection title={t('settings.navigation')}>
            <SettingsRow
              title={t('settings.customizeBottomBar')}
              subtitle={t('settings.chooseNavItems')}
              onPress={() => router.push('/settings/bottom-bar')}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
          </SettingsSection>
        )}

        <SettingsSection title={t('settings.offlineMode')}>
          <SettingsRow
            title={t('settings.offlineMode')}
            subtitle={offlineMode ? t('settings.offlineModeDesc') : t('settings.offlineModeDesc')}
            rightElement={
              <Switch
                value={offlineMode}
                onValueChange={(value) => {
                  haptics.medium();
                  setOfflineMode(value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.security')}>
          <SettingsRow
            title={t('settings.appLock')}
            subtitle={securitySettings.pinEnabled ? t('settings.pinEnabled') : t('settings.notConfigured')}
            onPress={() => {
              if (securitySettings.pinEnabled) {
                handleDisablePin();
              } else {
                setShowPinSetup(true);
              }
            }}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          {securitySettings.pinEnabled && biometricAvailable && (
            <SettingsRow
              title={getBiometricLabel()}
              subtitle={`Use ${getBiometricLabel()} to unlock`}
              rightElement={
                <Switch
                  value={securitySettings.biometricEnabled}
                  onValueChange={(value) => {
                    haptics.medium();
                    setSecuritySettings({ biometricEnabled: value });
                  }}
                  trackColor={{ false: '#3a3a3a', true: accentColor }}
                />
              }
            />
          )}
          {securitySettings.pinEnabled && (
            <SettingsRow
              title="Auto-Lock"
              subtitle={getAutoLockLabel(securitySettings.autoLockTimeout)}
              onPress={() => setShowAutoLockPicker(true)}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
          )}
          <SettingsRow
            title={t('settings.hideInAppSwitcher')}
            subtitle={t('settings.hideInAppSwitcher')}
            rightElement={
              <Switch
                value={securitySettings.hideInAppSwitcher}
                onValueChange={(value) => {
                  haptics.medium();
                  setSecuritySettings({ hideInAppSwitcher: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        {/* Language Section */}
        <SettingsSection title={t('settings.language')}>
          <SettingsRow
            title={t('settings.appLanguage')}
            subtitle={SUPPORTED_LANGUAGES.find(l => l.code === (language || i18n.language))?.nativeName || 'English'}
            onPress={() => setShowLanguagePicker(true)}
            rightElement={<Text className="text-text-tertiary">{'>'}</Text>}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.appearance')}>
          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-3" accessibilityRole="header">{t('settings.accentColor')}</Text>
            <View className="flex-row flex-wrap gap-3" accessibilityRole="radiogroup">
              {ACCENT_COLOR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.color}
                  onPress={() => setAccentColor(preset.color)}
                  className="items-center"
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityLabel={`${preset.name} accent color`}
                  accessibilityState={{ checked: accentColor === preset.color }}
                  accessibilityHint="Sets the app accent color"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: preset.color,
                      borderWidth: accentColor === preset.color ? 3 : 0,
                      borderColor: 'white',
                    }}
                    accessible={false}
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: accentColor === preset.color ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                    accessible={false}
                  >
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <SettingsRow
            title={t('settings.reduceMotion')}
            subtitle={t('settings.reduceMotionDesc')}
            rightElement={
              <Switch
                value={reduceMotion}
                onValueChange={(value) => {
                  haptics.medium();
                  setReduceMotion(value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
                accessibilityLabel="Reduce motion toggle"
                accessibilityHint="Reduces animations throughout the app"
              />
            }
          />
          <SettingsRow
            title={t('settings.hapticFeedback')}
            subtitle={t('settings.hapticFeedback')}
            rightElement={
              <Switch
                value={hapticsEnabled}
                onValueChange={(value) => {
                  haptics.medium();
                  setHapticsEnabled(value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
                accessibilityLabel="Haptic feedback toggle"
                accessibilityHint="Enables or disables vibration feedback"
              />
            }
          />
          {(showHideMediaToggle || hideMedia) && (
            <SettingsRow
              title="Hide Media Info"
              rightElement={
                <Switch
                  value={hideMedia}
                  onValueChange={(value) => {
                    haptics.medium();
                    setHideMedia(value);
                  }}
                  trackColor={{ false: '#3a3a3a', true: accentColor }}
                />
              }
            />
          )}
        </SettingsSection>

        <SettingsSection title={t('settings.notifications')}>
          <SettingsRow
            title={t('settings.downloadComplete')}
            subtitle={t('settings.downloadComplete')}
            rightElement={
              <Switch
                value={notifications.downloadComplete}
                onValueChange={(value) => {
                  haptics.medium();
                  if (value) {
                    notificationService.requestPermission();
                  }
                  setNotificationSetting('downloadComplete', value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
          <SettingsRow
            title="Now Playing"
            subtitle="Show notification for current media"
            rightElement={
              <Switch
                value={notifications.nowPlaying}
                onValueChange={(value) => {
                  haptics.medium();
                  if (value) {
                    notificationService.requestPermission();
                  }
                  setNotificationSetting('nowPlaying', value);
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.playback')}>
          <SettingsRow
            title={t('settings.autoPlay')}
            rightElement={
              <Switch
                value={player.autoPlay}
                onValueChange={(value) => {
                  haptics.medium();
                  updatePlayerSettings({ autoPlay: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
          <SettingsRow
            title="Hardware Acceleration"
            subtitle="Use device GPU for video decoding"
            rightElement={
              <Switch
                value={player.hardwareAcceleration}
                onValueChange={(value) => {
                  haptics.medium();
                  updatePlayerSettings({ hardwareAcceleration: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
          <SettingsRow
            title="Default Audio Language"
            subtitle={getLanguageName(player.defaultAudioLanguage)}
            onPress={() => setShowAudioLanguagePicker(true)}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          <SettingsRow
            title="Default Subtitle Language"
            subtitle={getLanguageName(player.defaultSubtitleLanguage)}
            onPress={() => setShowSubtitleLanguagePicker(true)}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          <SettingsRow
            title="External Player"
            subtitle="Show button to open video in external apps"
            rightElement={
              <Switch
                value={player.externalPlayerEnabled ?? true}
                onValueChange={(value) => {
                  haptics.medium();
                  updatePlayerSettings({ externalPlayerEnabled: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Player Controls">
          <SettingsRow
            title="Customize Controls"
            subtitle="Choose which buttons appear in the video player"
            onPress={() => router.push('/settings/player-controls' as any)}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.audio')}>
          <SettingsRow
            title="Equalizer"
            subtitle={getPresetById(equalizerPreset)?.name ?? 'Flat'}
            onPress={() => setShowEqualizerPicker(true)}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.downloadsSection')}>
          <SettingsRow
            title={t('downloads.title')}
            subtitle={`${formatBytes(usedStorage)} used`}
            onPress={() => router.push('/(tabs)/downloads')}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          <SettingsRow
            title="Remove Watched Now"
            subtitle="Remove all completed downloads you've watched"
            onPress={() => {
              Alert.alert(
                'Remove Watched Downloads',
                'This will remove all downloaded content that you have already watched. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      const count = await downloadManager.removeWatchedDownloads();
                      Alert.alert(
                        'Done',
                        count > 0
                          ? `Removed ${count} watched download${count !== 1 ? 's' : ''}.`
                          : 'No watched downloads found to remove.'
                      );
                    },
                  },
                ]
              );
            }}
            rightElement={
              <Text style={{ color: accentColor }}>Clean</Text>
            }
          />
        </SettingsSection>

        <SettingsSection title={t('settings.storageCache')}>
          <SettingsRow
            title="Downloads"
            subtitle={formatBytes(usedStorage)}
          />
          <SettingsRow
            title="Image Cache"
            subtitle="Managed by system"
            onPress={handleClearImageCache}
            rightElement={
              isClearingCache ? (
                <ActivityIndicator size="small" color={accentColor} />
              ) : (
                <Text style={{ color: accentColor }}>Clear</Text>
              )
            }
          />
        </SettingsSection>


        <SettingsSection title={t('settings.subtitles')}>
          <SettingsRow
            title="Force Subtitles"
            subtitle="Always enable subtitles when playing"
            rightElement={
              <Switch
                value={player.forceSubtitles}
                onValueChange={(value) => {
                  haptics.medium();
                  updatePlayerSettings({ forceSubtitles: value });
                }}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-3">Font Size</Text>
            <View className="flex-row">
              {SUBTITLE_SIZES.map((size) => (
                <Pressable
                  key={size.value}
                  onPress={() => updatePlayerSettings({ subtitleSize: size.value })}
                  className="px-4 py-2 rounded-xl mr-2"
                  style={{
                    backgroundColor: player.subtitleSize === size.value ? accentColor : '#27272a',
                  }}
                >
                  <Text className="text-white">{size.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-2">
              Background Opacity: {Math.round(player.subtitleBackgroundOpacity * 100)}%
            </Text>
            <Slider
              value={player.subtitleBackgroundOpacity}
              onValueChange={(value) =>
                updatePlayerSettings({ subtitleBackgroundOpacity: value })
              }
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              minimumTrackTintColor={accentColor}
              maximumTrackTintColor="#3f3f46"
              thumbTintColor={accentColor}
            />
          </View>

          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-3">Text Color</Text>
            <View className="flex-row flex-wrap gap-3">
              {SUBTITLE_TEXT_COLORS.map((tc) => (
                <Pressable
                  key={tc.color}
                  onPress={() => updatePlayerSettings({ subtitleTextColor: tc.color })}
                  className="items-center"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: tc.color,
                      borderWidth: player.subtitleTextColor === tc.color ? 3 : 0,
                      borderColor: accentColor,
                    }}
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: player.subtitleTextColor === tc.color ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {tc.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-3">Background Color</Text>
            <View className="flex-row flex-wrap gap-3">
              {SUBTITLE_BG_COLORS.map((bg) => (
                <Pressable
                  key={bg.color}
                  onPress={() => updatePlayerSettings({ subtitleBackgroundColor: bg.color })}
                  className="items-center"
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: bg.color,
                      borderWidth: player.subtitleBackgroundColor === bg.color ? 3 : 0,
                      borderColor: accentColor,
                    }}
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: player.subtitleBackgroundColor === bg.color ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {bg.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View className="py-4">
            <Text className="text-text-secondary text-sm mb-2">Preview</Text>
            <View
              className="p-3 rounded-lg items-center"
              style={{
                backgroundColor: player.subtitleBackgroundColor === 'none'
                  ? 'transparent'
                  : `${player.subtitleBackgroundColor}${Math.round(player.subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0')}`,
              }}
            >
              <Text
                style={{
                  color: player.subtitleTextColor,
                  fontSize:
                    player.subtitleSize === 'small'
                      ? 14
                      : player.subtitleSize === 'large'
                        ? 22
                        : player.subtitleSize === 'extraLarge'
                          ? 28
                          : 18,
                }}
              >
                Sample Subtitle Text
              </Text>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title={t('settings.about')}>
          <SettingsRow
            title="Version"
            subtitle="1.0.0"
            onPress={() => {
              const newCount = versionTapCount + 1;
              setVersionTapCount(newCount);
              if (newCount >= 7 && !showHideMediaToggle) {
                setShowHideMediaToggle(true);
                setVersionTapCount(0);
              }
            }}
          />
          <SettingsRow title="Build" subtitle="1" />
        </SettingsSection>

        <View className="h-24" />
      </ScrollView>

      {showUserSwitcher && (
        <UserSwitcher onClose={() => setShowUserSwitcher(false)} />
      )}

      {showSubtitleLanguagePicker && (
        <LanguagePicker
          title="Default Subtitle Language"
          selectedCode={player.defaultSubtitleLanguage}
          onSelect={(code) => updatePlayerSettings({ defaultSubtitleLanguage: code })}
          onClose={() => setShowSubtitleLanguagePicker(false)}
          accentColor={accentColor}
        />
      )}

      {showAudioLanguagePicker && (
        <LanguagePicker
          title="Default Audio Language"
          selectedCode={player.defaultAudioLanguage}
          onSelect={(code) => updatePlayerSettings({ defaultAudioLanguage: code })}
          onClose={() => setShowAudioLanguagePicker(false)}
          accentColor={accentColor}
        />
      )}

      {showEqualizerPicker && (
        <View className="absolute inset-0 bg-black/90 z-50 justify-center items-center">
          <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white text-lg font-bold">Equalizer Preset</Text>
              <Pressable
                onPress={() => setShowEqualizerPicker(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white font-bold">X</Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-[400px]">
              {EQUALIZER_PRESETS.filter(p => p.id !== 'custom').map((preset) => (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setEqualizerPreset(preset.id);
                    setShowEqualizerPicker(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                  style={{
                    backgroundColor: equalizerPreset === preset.id ? accentColor + '30' : 'transparent',
                  }}
                >
                  <View>
                    <Text className="text-white">{preset.name}</Text>
                    <Text className="text-text-tertiary text-xs mt-1">
                      {preset.bands.slice(0, 5).map(b => b > 0 ? `+${b}` : b).join(', ')}...
                    </Text>
                  </View>
                  {equalizerPreset === preset.id && (
                    <View
                      className="w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {showOpenSubtitlesInput && (
        <View className="absolute inset-0 bg-black/90 z-50 justify-center items-center">
          <View className="bg-surface rounded-2xl w-[85%] max-w-[400px] overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white text-lg font-bold">OpenSubtitles API Key</Text>
              <Pressable
                onPress={() => setShowOpenSubtitlesInput(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white font-bold">X</Text>
              </Pressable>
            </View>
            <View className="p-4">
              <TextInput
                value={tempApiKey}
                onChangeText={setTempApiKey}
                placeholder="Enter your API key"
                placeholderTextColor="rgba(255,255,255,0.4)"
                className="bg-white/10 text-white px-4 py-3 rounded-lg mb-4"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text className="text-text-tertiary text-xs mb-4">
                Get your free API key from opensubtitles.com/consumers
              </Text>
              <View className="flex-row gap-3">
                {openSubtitlesApiKey && (
                  <Pressable
                    onPress={() => {
                      setOpenSubtitlesApiKey(null);
                      setTempApiKey('');
                      setShowOpenSubtitlesInput(false);
                    }}
                    className="flex-1 py-3 rounded-lg bg-red-500/20 items-center"
                  >
                    <Text className="text-red-400 font-medium">Remove</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() => {
                    setOpenSubtitlesApiKey(tempApiKey.trim() || null);
                    setShowOpenSubtitlesInput(false);
                  }}
                  className="flex-1 py-3 rounded-lg items-center"
                  style={{ backgroundColor: accentColor }}
                >
                  <Text className="text-white font-medium">Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      )}

      {showPinSetup && (
        <View className="absolute inset-0 z-50">
          <PinLock
            mode="setup"
            onSuccess={(enteredPin) => {
              if (enteredPin) {
                handlePinSetupComplete(enteredPin);
              }
            }}
            onCancel={() => setShowPinSetup(false)}
          />
        </View>
      )}

      {showPinConfirm && (
        <View className="absolute inset-0 z-50">
          <PinLock
            mode="confirm"
            setupPin={setupPin}
            onSuccess={handlePinConfirmComplete}
            onCancel={() => {
              setShowPinConfirm(false);
              setSetupPin('');
            }}
          />
        </View>
      )}

      {showAutoLockPicker && (
        <View className="absolute inset-0 bg-black/90 z-50 justify-center items-center">
          <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white text-lg font-bold">Auto-Lock</Text>
              <Pressable
                onPress={() => setShowAutoLockPicker(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white font-bold">X</Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-[400px]">
              {AUTO_LOCK_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setSecuritySettings({ autoLockTimeout: option.value });
                    setShowAutoLockPicker(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                  style={{
                    backgroundColor:
                      securitySettings.autoLockTimeout === option.value
                        ? accentColor + '30'
                        : 'transparent',
                  }}
                >
                  <Text className="text-white">{option.label}</Text>
                  {securitySettings.autoLockTimeout === option.value && (
                    <View
                      className="w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Language Picker */}
      {showLanguagePicker && (
        <View className="absolute inset-0 bg-black/90 z-50 justify-center items-center">
          <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <Text className="text-white text-lg font-bold">App Language</Text>
              <Pressable
                onPress={() => setShowLanguagePicker(false)}
                className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
              >
                <Text className="text-white font-bold">X</Text>
              </Pressable>
            </View>
            <ScrollView className="max-h-[400px]">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    changeLanguage(lang.code);
                    setShowLanguagePicker(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-3 border-b border-white/5"
                  style={{
                    backgroundColor:
                      (language || i18n.language) === lang.code
                        ? accentColor + '30'
                        : 'transparent',
                  }}
                >
                  <View>
                    <Text className="text-white">{lang.nativeName}</Text>
                    <Text className="text-text-tertiary text-sm">{lang.name}</Text>
                  </View>
                  {(language || i18n.language) === lang.code && (
                    <View
                      className="w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Text className="text-white text-xs">✓</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
