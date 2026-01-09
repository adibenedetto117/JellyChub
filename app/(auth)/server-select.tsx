import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from '@/providers';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { validateServerUrl, getServerPublicInfo, jellyfinClient } from '@/api';
import type { ServerInfo } from '@/api';

interface ServerConnectionStatus {
  [serverId: string]: {
    isOnline: boolean;
    serverInfo: ServerInfo | null;
    isChecking: boolean;
  };
}

function ServerCard({
  server,
  status,
  onSelect,
  onRemove,
  index,
}: {
  server: { id: string; name: string; url: string; customHeaders?: Record<string, string> };
  status: { isOnline: boolean; serverInfo: ServerInfo | null; isChecking: boolean } | undefined;
  onSelect: () => void;
  onRemove: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const isOnline = status?.isOnline ?? false;
  const isChecking = status?.isChecking ?? true;
  const serverVersion = status?.serverInfo?.Version;
  const hasCustomHeaders = server.customHeaders && Object.keys(server.customHeaders).length > 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      style={animatedStyle}
    >
      <Pressable
        className="bg-surface rounded-2xl p-4 mb-3 border border-white/5"
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-3">
            <View className="flex-row items-center mb-1">
              <View
                className={`w-2 h-2 rounded-full mr-2 ${
                  isChecking
                    ? 'bg-warning'
                    : isOnline
                    ? 'bg-success'
                    : 'bg-error'
                }`}
              />
              <Text className="text-white text-lg font-semibold" numberOfLines={1}>
                {server.name}
              </Text>
              {hasCustomHeaders && (
                <Text className="text-text-muted text-xs ml-2">[Headers]</Text>
              )}
            </View>
            <Text className="text-text-tertiary text-sm" numberOfLines={1}>
              {server.url}
            </Text>
            {serverVersion && (
              <Text className="text-text-muted text-xs mt-1">
                Jellyfin {serverVersion}
              </Text>
            )}
          </View>
          <Pressable
            className="p-2 -mr-2 -mt-1"
            onPress={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text className="text-text-tertiary text-lg">x</Text>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface CustomHeader {
  id: string;
  name: string;
  value: string;
}

export default function ServerSelectScreen() {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ServerConnectionStatus>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<CustomHeader[]>([]);

  const { servers, addServer, setActiveServer, removeServer } = useAuthStore();
  const { setOfflineMode } = useSettingsStore();

  // Helper to convert custom headers array to record
  const getHeadersRecord = (headers: CustomHeader[]): Record<string, string> | undefined => {
    const validHeaders = headers.filter((h) => h.name.trim() && h.value.trim());
    if (validHeaders.length === 0) return undefined;
    return validHeaders.reduce((acc, h) => {
      acc[h.name.trim()] = h.value.trim();
      return acc;
    }, {} as Record<string, string>);
  };

  // Add a new empty custom header
  const addCustomHeader = () => {
    setCustomHeaders((prev) => [
      ...prev,
      { id: `header_${Date.now()}`, name: '', value: '' },
    ]);
  };

  // Update a custom header
  const updateCustomHeader = (id: string, field: 'name' | 'value', value: string) => {
    setCustomHeaders((prev) =>
      prev.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  // Remove a custom header
  const removeCustomHeader = (id: string) => {
    setCustomHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  // Check connection status for all saved servers
  const checkServerConnections = useCallback(async () => {
    for (const server of servers) {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: { ...prev[server.id], isChecking: true, isOnline: false, serverInfo: null },
      }));

      try {
        // Use saved custom headers for the server when checking connection
        const serverInfo = await getServerPublicInfo(server.url, server.customHeaders);
        setConnectionStatus((prev) => ({
          ...prev,
          [server.id]: {
            isOnline: serverInfo !== null,
            serverInfo,
            isChecking: false,
          },
        }));
      } catch {
        setConnectionStatus((prev) => ({
          ...prev,
          [server.id]: {
            isOnline: false,
            serverInfo: null,
            isChecking: false,
          },
        }));
      }
    }
  }, [servers]);

  useEffect(() => {
    checkServerConnections();
  }, [checkServerConnections]);

  // Auto-show add server form if no servers exist
  useEffect(() => {
    if (servers.length === 0) {
      setShowAddServer(true);
    }
  }, [servers.length]);

  const handleAddServer = async () => {
    if (!serverUrl.trim()) {
      setError(t('auth.invalidUrl'));
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      let url = serverUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      // Get custom headers record for the connection
      const headersRecord = getHeadersRecord(customHeaders);

      // Validate server URL with custom headers
      const serverInfo = await validateServerUrl(url, headersRecord);

      if (!serverInfo) {
        setError(t('auth.connectionFailed'));
        return;
      }

      // Add server with custom headers
      const serverId = addServer({
        name: serverInfo.ServerName,
        url: url.replace(/\/$/, ''),
        isDefault: servers.length === 0,
        customHeaders: headersRecord,
      });

      // Initialize client with custom headers
      jellyfinClient.initialize(url, headersRecord);
      setActiveServer(serverId);
      setServerUrl('');
      setCustomHeaders([]);
      setShowAdvanced(false);
      setShowAddServer(false);
      router.replace('/(auth)/login');
    } catch {
      setError(t('auth.connectionFailed'));
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelectServer = (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (server) {
      // Initialize client with saved custom headers
      jellyfinClient.initialize(server.url, server.customHeaders);
      setActiveServer(id);
      router.replace('/(auth)/login');
    }
  };

  const handleRemoveServer = (id: string) => {
    removeServer(id);
    setConnectionStatus((prev) => {
      const newStatus = { ...prev };
      delete newStatus[id];
      return newStatus;
    });
  };

  const handleEnterOfflineMode = () => {
    setOfflineMode(true);
    router.replace('/(tabs)/downloads');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} className="pt-12 pb-8 items-center">
          <Image
            source={require('../../assets/icon.png')}
            className="w-20 h-20 rounded-2xl mb-4"
          />
          <Text className="text-3xl font-bold text-white tracking-tight">
            JellyChub
          </Text>
          <Text className="text-text-secondary text-center mt-2">
            Your media, everywhere
          </Text>
        </Animated.View>

        {/* Saved Servers */}
        {servers.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} className="mb-6">
            <Text className="text-text-secondary text-sm font-medium uppercase tracking-wider mb-3">
              {t('auth.savedServers')}
            </Text>
            {servers.map((server, index) => (
              <ServerCard
                key={server.id}
                server={server}
                status={connectionStatus[server.id]}
                onSelect={() => handleSelectServer(server.id)}
                onRemove={() => handleRemoveServer(server.id)}
                index={index}
              />
            ))}
          </Animated.View>
        )}

        {/* Add Server Section */}
        {showAddServer ? (
          <Animated.View
            entering={FadeInDown.duration(400)}
            className="bg-surface rounded-2xl p-5 border border-white/5"
          >
            <Text className="text-white text-lg font-semibold mb-4">
              {t('auth.addServer')}
            </Text>

            <View className="mb-4">
              <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
                {t('auth.serverUrl')}
              </Text>
              <TextInput
                className="bg-background-secondary text-white px-4 py-3.5 rounded-xl text-base"
                placeholder="jellyfin.example.com"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={serverUrl}
                onChangeText={(text) => {
                  setServerUrl(text);
                  setError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                autoFocus={servers.length === 0}
              />
            </View>

            {/* Advanced Section */}
            <Pressable
              className="flex-row items-center mb-4"
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text className="text-text-secondary text-sm">
                {showAdvanced ? '[-]' : '[+]'}
              </Text>
              <Text className="text-text-secondary text-sm ml-2">
                {t('auth.advanced', 'Advanced')}
              </Text>
            </Pressable>

            {showAdvanced && (
              <View className="mb-4 bg-background-secondary rounded-xl p-4">
                <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
                  {t('auth.customHeaders', 'Custom HTTP Headers')}
                </Text>
                <Text className="text-text-muted text-xs mb-3">
                  {t('auth.customHeadersDesc', 'Add custom HTTP headers to requests')}
                </Text>

                {customHeaders.map((header) => (
                  <View key={header.id} className="flex-row items-center mb-2">
                    <TextInput
                      className="flex-1 bg-surface text-white px-3 py-2.5 rounded-lg text-sm mr-2"
                      placeholder={t('auth.headerName', 'Header name')}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={header.name}
                      onChangeText={(text) => updateCustomHeader(header.id, 'name', text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TextInput
                      className="flex-1 bg-surface text-white px-3 py-2.5 rounded-lg text-sm mr-2"
                      placeholder={t('auth.headerValue', 'Value')}
                      placeholderTextColor="rgba(255,255,255,0.25)"
                      value={header.value}
                      onChangeText={(text) => updateCustomHeader(header.id, 'value', text)}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <Pressable
                      className="p-2"
                      onPress={() => removeCustomHeader(header.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text className="text-error text-base">x</Text>
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  className="flex-row items-center justify-center py-2 mt-1"
                  onPress={addCustomHeader}
                >
                  <Text className="text-accent text-sm mr-1">+</Text>
                  <Text className="text-accent text-sm">
                    {t('auth.addHeader', 'Add Header')}
                  </Text>
                </Pressable>
              </View>
            )}

            {error && (
              <View className="bg-error/10 rounded-xl px-4 py-3 mb-4">
                <Text className="text-error text-sm">{error}</Text>
              </View>
            )}

            <Pressable
              className={`py-3.5 rounded-xl items-center ${
                isValidating ? 'bg-accent/70' : 'bg-accent'
              }`}
              onPress={handleAddServer}
              disabled={isValidating}
            >
              {isValidating ? (
                <View className="flex-row items-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-semibold ml-2">{t('auth.connecting')}</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">{t('auth.connect')}</Text>
              )}
            </Pressable>

            {servers.length > 0 && (
              <Pressable
                className="py-3 mt-2 items-center"
                onPress={() => {
                  setShowAddServer(false);
                  setError(null);
                  setServerUrl('');
                  setCustomHeaders([]);
                  setShowAdvanced(false);
                }}
              >
                <Text className="text-text-secondary">{t('common.cancel')}</Text>
              </Pressable>
            )}
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Pressable
              className="bg-surface rounded-2xl py-4 items-center border border-white/5 border-dashed"
              onPress={() => setShowAddServer(true)}
            >
              <View className="flex-row items-center">
                <Text className="text-accent text-xl mr-2">+</Text>
                <Text className="text-accent font-semibold">{t('auth.addServer')}</Text>
              </View>
            </Pressable>
          </Animated.View>
        )}

        {/* Offline Mode Button */}
        <Animated.View entering={FadeInDown.delay(400).duration(400)} className="mt-6">
          <Pressable
            className="bg-surface/50 rounded-2xl py-4 items-center border border-white/5"
            onPress={handleEnterOfflineMode}
          >
            <View className="flex-row items-center">
              <Text className="text-text-secondary text-lg mr-2">⬇</Text>
              <Text className="text-text-secondary font-medium">Use Offline Mode</Text>
            </View>
            <Text className="text-text-muted text-xs mt-1">
              Access your downloaded content
            </Text>
          </Pressable>
        </Animated.View>

        {/* Footer */}
        <View className="mt-8 items-center">
          <Text className="text-text-muted text-xs">
            Jellyfin Client
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
