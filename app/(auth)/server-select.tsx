import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
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
  server: { id: string; name: string; url: string };
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

export default function ServerSelectScreen() {
  const [serverUrl, setServerUrl] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddServer, setShowAddServer] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ServerConnectionStatus>({});

  const { servers, addServer, setActiveServer, removeServer } = useAuthStore();
  const { setOfflineMode } = useSettingsStore();

  // Check connection status for all saved servers
  const checkServerConnections = useCallback(async () => {
    for (const server of servers) {
      setConnectionStatus((prev) => ({
        ...prev,
        [server.id]: { ...prev[server.id], isChecking: true, isOnline: false, serverInfo: null },
      }));

      try {
        const serverInfo = await getServerPublicInfo(server.url);
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
      setError('Please enter a server URL');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      let url = serverUrl.trim();
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }

      const serverInfo = await validateServerUrl(url);

      if (!serverInfo) {
        setError('Could not connect to server. Please check the URL.');
        return;
      }

      const serverId = addServer({
        name: serverInfo.ServerName,
        url: url.replace(/\/$/, ''),
        isDefault: servers.length === 0,
      });

      jellyfinClient.initialize(url);
      setActiveServer(serverId);
      setServerUrl('');
      setShowAddServer(false);
      router.replace('/(auth)/login');
    } catch {
      setError('Failed to connect to server');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSelectServer = (id: string) => {
    const server = servers.find((s) => s.id === id);
    if (server) {
      jellyfinClient.initialize(server.url);
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
              Your Servers
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
              Connect to Server
            </Text>

            <View className="mb-4">
              <Text className="text-text-tertiary text-xs uppercase tracking-wider mb-2">
                Server URL
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
                  <Text className="text-white font-semibold ml-2">Connecting...</Text>
                </View>
              ) : (
                <Text className="text-white font-semibold text-base">Connect</Text>
              )}
            </Pressable>

            {servers.length > 0 && (
              <Pressable
                className="py-3 mt-2 items-center"
                onPress={() => {
                  setShowAddServer(false);
                  setError(null);
                  setServerUrl('');
                }}
              >
                <Text className="text-text-secondary">Cancel</Text>
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
                <Text className="text-accent font-semibold">Add Server</Text>
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
