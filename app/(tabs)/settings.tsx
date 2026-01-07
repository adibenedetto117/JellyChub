import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { ACCENT_COLOR_PRESETS } from '@/stores/settingsStore';
import { formatBytes, getCacheSize, clearImageCache, type CacheInfo } from '@/utils';
import { UserSwitcher } from '@/components/settings/UserSwitcher';
import { HomeButton } from '@/components/ui';

const SUBTITLE_TEXT_COLORS = [
  { name: 'White', color: '#ffffff' },
  { name: 'Yellow', color: '#ffff00' },
  { name: 'Cyan', color: '#00ffff' },
  { name: 'Green', color: '#00ff00' },
];

const SUBTITLE_BG_COLORS = [
  { name: 'Black', color: '#000000' },
  { name: 'Gray', color: '#4a4a4a' },
  { name: 'Navy', color: '#1a1a3e' },
];

const SUBTITLE_SIZES: { label: string; value: 'small' | 'medium' | 'large' }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
];

interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
}

function SettingsRow({ title, subtitle, onPress, rightElement }: SettingsRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      className="flex-row items-center justify-between py-4 border-b border-surface"
    >
      <View className="flex-1">
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
    <View className="mb-6 mx-4">
      <Text className="text-accent text-xs font-semibold uppercase mb-2">
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
    <View className="absolute inset-0 bg-black/90 z-50 justify-center items-center">
      <View className="bg-surface rounded-2xl w-[85%] max-h-[70%] overflow-hidden">
        <View className="flex-row items-center justify-between p-4 border-b border-white/10">
          <Text className="text-white text-lg font-bold">{title}</Text>
          <Pressable
            onPress={onClose}
            className="w-8 h-8 items-center justify-center rounded-full bg-white/10"
          >
            <Text className="text-white font-bold">X</Text>
          </Pressable>
        </View>
        <ScrollView className="max-h-[400px]">
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
            >
              <Text className="text-white">{lang.name}</Text>
              {selectedCode === lang.code && (
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
  );
}

export default function SettingsScreen() {
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showSubtitleLanguagePicker, setShowSubtitleLanguagePicker] = useState(false);
  const [showAudioLanguagePicker, setShowAudioLanguagePicker] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const { currentUser, logout, servers, activeServerId } = useAuthStore();
  const {
    downloadQuality,
    downloadOverWifiOnly,
    player,
    accentColor,
    jellyseerrUrl,
    jellyseerrUsername,
    jellyseerrAuthToken,
    offlineMode,
    setDownloadQuality,
    setDownloadOverWifiOnly,
    updatePlayerSettings,
    setAccentColor,
    setOfflineMode,
  } = useSettingsStore();

  const { usedStorage, maxStorage } = useDownloadStore();

  const activeServer = servers.find((s) => s.id === activeServerId);

  useEffect(() => {
    getCacheSize().then(setCacheInfo);
  }, []);

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

  const qualityOptions = ['original', 'high', 'medium', 'low'] as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1">
        <View className="px-4 py-4 flex-row items-center gap-3">
          <HomeButton currentScreen="settings" />
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Settings</Text>
        </View>

        {!offlineMode && (
          <SettingsSection title="Account">
            <SettingsRow
              title={currentUser?.Name ?? 'User'}
              subtitle={activeServer?.name ?? 'No server'}
            />
            <SettingsRow
              title="Switch User"
              onPress={() => setShowUserSwitcher(true)}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
            <SettingsRow
              title="Change Server"
              onPress={handleChangeServer}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
            <SettingsRow
              title="Sign Out"
              onPress={handleLogout}
              rightElement={
                <Text className="text-error">{'>'}</Text>
              }
            />
          </SettingsSection>
        )}

        <SettingsSection title="Offline Mode">
          <SettingsRow
            title="Offline Mode"
            subtitle={offlineMode ? 'Only downloads and settings available' : 'Full app access with server connection'}
            rightElement={
              <Switch
                value={offlineMode}
                onValueChange={setOfflineMode}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Appearance">
          <View className="py-4 border-b border-surface">
            <Text className="text-white text-base mb-3">Accent Color</Text>
            <View className="flex-row flex-wrap gap-3">
              {ACCENT_COLOR_PRESETS.map((preset) => (
                <Pressable
                  key={preset.color}
                  onPress={() => setAccentColor(preset.color)}
                  className="items-center"
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
                  />
                  <Text
                    className="text-xs mt-1"
                    style={{
                      color: accentColor === preset.color ? 'white' : 'rgba(255,255,255,0.5)',
                    }}
                  >
                    {preset.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </SettingsSection>

        {!offlineMode && (
          <SettingsSection title="Bottom Bar">
            <SettingsRow
              title="Customize Bottom Bar"
              subtitle="Tabs, order, and landing page"
              onPress={() => router.push('/settings/bottom-bar')}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
          </SettingsSection>
        )}

        <SettingsSection title="Playback">
          <SettingsRow
            title="Auto Play Next"
            rightElement={
              <Switch
                value={player.autoPlay}
                onValueChange={(value) =>
                  updatePlayerSettings({ autoPlay: value })
                }
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
                onValueChange={(value) =>
                  updatePlayerSettings({ hardwareAcceleration: value })
                }
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
        </SettingsSection>

        <SettingsSection title="Downloads">
          <SettingsRow
            title="Manage Downloads"
            subtitle={`${formatBytes(usedStorage)} used`}
            onPress={() => router.push('/(tabs)/downloads')}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          <SettingsRow
            title="Download Quality"
            subtitle={downloadQuality.charAt(0).toUpperCase() + downloadQuality.slice(1)}
            onPress={() => {
              const currentIndex = qualityOptions.indexOf(downloadQuality);
              const nextIndex = (currentIndex + 1) % qualityOptions.length;
              setDownloadQuality(qualityOptions[nextIndex]);
            }}
            rightElement={
              <Text className="text-text-tertiary">{'>'}</Text>
            }
          />
          <SettingsRow
            title="Wi-Fi Only"
            subtitle="Only download when connected to Wi-Fi"
            rightElement={
              <Switch
                value={downloadOverWifiOnly}
                onValueChange={setDownloadOverWifiOnly}
                trackColor={{ false: '#3a3a3a', true: accentColor }}
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Storage & Cache">
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

        {!offlineMode && (
          <SettingsSection title="Jellyseerr">
            <SettingsRow
              title="Jellyseerr"
              subtitle={jellyseerrAuthToken ? `Connected as ${jellyseerrUsername}` : 'Not configured'}
              onPress={() => router.push('/settings/jellyseerr')}
              rightElement={
                <Text className="text-text-tertiary">{'>'}</Text>
              }
            />
          </SettingsSection>
        )}

        <SettingsSection title="Subtitles">
          <SettingsRow
            title="Force Subtitles"
            subtitle="Always enable subtitles when playing"
            rightElement={
              <Switch
                value={player.forceSubtitles}
                onValueChange={(value) =>
                  updatePlayerSettings({ forceSubtitles: value })
                }
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
                backgroundColor: `${player.subtitleBackgroundColor || '#000000'}${Math.round(player.subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0')}`,
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
                        : 18,
                }}
              >
                Sample Subtitle Text
              </Text>
            </View>
          </View>
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow title="Version" subtitle="1.0.0" />
          <SettingsRow title="Build" subtitle="1" />
        </SettingsSection>

        <View className="h-8" />
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
    </SafeAreaView>
  );
}
