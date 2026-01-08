import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores';
import { jellyseerrClient } from '@/api/jellyseerr';
import { colors } from '@/theme';
import { goBack } from '@/utils';

type AuthMethod = 'apikey' | 'jellyfin' | 'local';

export default function JellyseerrSettingsScreen() {
  const {
    jellyseerrUrl,
    jellyseerrUsername,
    jellyseerrAuthToken,
    accentColor,
    setJellyseerrCredentials,
    clearJellyseerrCredentials,
    bottomBarConfig,
    setBottomBarConfig,
  } = useSettingsStore();

  const activeServer = useAuthStore((s) => s.getActiveServer());
  const currentUser = useAuthStore((s) => s.currentUser);

  const [url, setUrl] = useState(jellyseerrUrl ?? '');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('apikey');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const isConnected = !!jellyseerrAuthToken;

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken) {
      testExistingConnection();
    }
  }, []);

  const testExistingConnection = async () => {
    if (!jellyseerrUrl) return;
    setIsTesting(true);
    try {
      jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken ?? undefined);
      const result = await jellyseerrClient.testConnection();
      setConnectionStatus(result.ok ? 'connected' : 'error');
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setIsTesting(true);
    try {
      jellyseerrClient.initialize(url.trim());
      const result = await jellyseerrClient.testConnection();
      if (result.ok) {
        Alert.alert('Success', `Connected to Jellyseerr ${result.version ?? ''}`);
        setConnectionStatus('connected');
      } else {
        Alert.alert('Error', result.error ?? 'Connection failed');
        setConnectionStatus('error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
      setConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');

      const getUserDisplayName = (user: any) =>
        user.displayName || user.username || user.jellyfinUsername || user.email || 'User';

      if (authMethod === 'apikey') {
        if (!apiKey.trim()) {
          Alert.alert('Error', 'Please enter your API key');
          setIsLoading(false);
          return;
        }
        jellyseerrClient.initialize(cleanUrl, apiKey.trim());
        const user = await jellyseerrClient.getCurrentUser();
        setJellyseerrCredentials(cleanUrl, apiKey.trim(), getUserDisplayName(user));
      } else if (authMethod === 'jellyfin') {
        if (!activeServer?.url || !currentUser?.Name || !activeServer?.accessToken) {
          Alert.alert('Error', 'You must be logged into Jellyfin first');
          setIsLoading(false);
          return;
        }
        const user = await jellyseerrClient.initializeWithJellyfin(
          cleanUrl,
          activeServer.url,
          currentUser.Name,
          activeServer.accessToken
        );
        // Store Jellyfin credentials for re-authentication on app restart
        setJellyseerrCredentials(cleanUrl, 'jellyfin-auth', getUserDisplayName(user), {
          serverUrl: activeServer.url,
          userId: currentUser.Name, // Store username, not ID
          token: activeServer.accessToken,
        });
      } else {
        if (!username.trim() || !password.trim()) {
          Alert.alert('Error', 'Please enter your username and password');
          setIsLoading(false);
          return;
        }
        jellyseerrClient.initialize(cleanUrl);
        const user = await jellyseerrClient.login(username.trim(), password);
        setJellyseerrCredentials(cleanUrl, 'local-auth', getUserDisplayName(user));
      }

      // Auto-enable Jellyseerr tab in bottom bar if not already enabled
      if (!bottomBarConfig.showJellyseerr) {
        setBottomBarConfig({ ...bottomBarConfig, showJellyseerr: true });
      }
      Alert.alert('Success', 'Connected to Jellyseerr! Check the Requests tab.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/requests') },
      ]);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Connection failed';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from Jellyseerr?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          clearJellyseerrCredentials();
          jellyseerrClient.clearAuth();
          setUrl('');
          setApiKey('');
          setUsername('');
          setPassword('');
          setConnectionStatus('unknown');
        },
      },
    ]);
  };

  const AuthMethodButton = ({ method, label, icon }: { method: AuthMethod; label: string; icon: string }) => (
    <Pressable
      onPress={() => setAuthMethod(method)}
      style={[
        styles.authMethodButton,
        authMethod === method && { backgroundColor: accentColor + '20', borderColor: accentColor },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={authMethod === method ? accentColor : 'rgba(255,255,255,0.5)'}
      />
      <Text style={[styles.authMethodText, authMethod === method && { color: accentColor }]}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Jellyseerr',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {isConnected ? (
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'error' ? '#ef4444' : '#f59e0b' }]} />
                <Text style={styles.statusText}>
                  {isTesting ? 'Checking...' : connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Connection Error' : 'Unknown'}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="server-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.infoText}>{jellyseerrUrl}</Text>
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.infoText}>{jellyseerrUsername}</Text>
              </View>
            </View>

            <Pressable style={styles.testButton} onPress={testExistingConnection} disabled={isTesting}>
              {isTesting ? (
                <ActivityIndicator color={accentColor} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color={accentColor} />
                  <Text style={[styles.testButtonText, { color: accentColor }]}>Test Connection</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.label}>Server URL</Text>
            <View style={styles.urlRow}>
              <TextInput
                style={[styles.input, styles.urlInput]}
                placeholder="https://jellyseerr.example.com"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Pressable
                style={[styles.testUrlButton, { backgroundColor: accentColor }]}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="flash-outline" size={20} color="white" />
                )}
              </Pressable>
            </View>

            <Text style={styles.label}>Authentication Method</Text>
            <View style={styles.authMethodRow}>
              <AuthMethodButton method="apikey" label="API Key" icon="key-outline" />
              <AuthMethodButton method="jellyfin" label="Jellyfin" icon="link-outline" />
              <AuthMethodButton method="local" label="Password" icon="lock-closed-outline" />
            </View>

            {authMethod === 'apikey' && (
              <>
                <Text style={styles.label}>API Key</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Jellyseerr API key"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.hint}>
                  Find your API key in Jellyseerr Settings → General → API Key
                </Text>
              </>
            )}

            {authMethod === 'jellyfin' && (
              <View style={styles.jellyfinInfo}>
                <Ionicons name="information-circle-outline" size={20} color={accentColor} />
                <Text style={styles.jellyfinInfoText}>
                  Will authenticate using your current Jellyfin session ({currentUser?.Name ?? 'Not logged in'})
                </Text>
              </View>
            )}

            {authMethod === 'local' && (
              <>
                <Text style={styles.label}>Email or Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email or username"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </>
            )}

            <Pressable
              style={[styles.connectButton, { backgroundColor: accentColor }]}
              onPress={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.connectButtonText}>Connect</Text>
              )}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  label: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  urlInput: {
    flex: 1,
  },
  testUrlButton: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  authMethodButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  authMethodText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
  },
  jellyfinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  jellyfinInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
  },
  connectButton: {
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.surface.default,
    marginBottom: 12,
    gap: 8,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  disconnectButton: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
