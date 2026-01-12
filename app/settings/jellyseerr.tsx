import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore, selectActiveServer } from '@/stores';
import { jellyseerrClient } from '@/api/jellyseerr';
import { colors } from '@/theme';
import { goBack } from '@/utils';

type AuthMethod = 'apikey' | 'jellyfin' | 'local';
const DEFAULT_PORT = '5055';
const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

export default function JellyseerrSettingsScreen() {
  const {
    jellyseerrUrl,
    jellyseerrUsername,
    jellyseerrAuthToken,
    jellyseerrSessionCookie,
    accentColor,
    jellyseerrConnectionStatus: storedConnectionStatus,
    jellyseerrUseCustomHeaders,
    setJellyseerrCredentials,
    clearJellyseerrCredentials,
    setJellyseerrConnectionStatus,
    setJellyseerrUseCustomHeaders,
    bottomBarConfig,
    setBottomBarConfig,
  } = useSettingsStore();

  const activeServer = useAuthStore(selectActiveServer);
  const currentUser = useAuthStore((s) => s.currentUser);

  // Parse existing URL into parts
  const parseUrl = (urlStr: string | null) => {
    if (!urlStr) return { protocol: 'http' as const, host: '', port: DEFAULT_PORT };
    try {
      const match = urlStr.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
      if (match) {
        return {
          protocol: (match[1] as 'http' | 'https') || 'http',
          host: match[2] || '',
          port: match[3] || DEFAULT_PORT,
        };
      }
    } catch {}
    return { protocol: 'http' as const, host: '', port: DEFAULT_PORT };
  };

  const parsed = parseUrl(jellyseerrUrl);
  const [protocol, setProtocol] = useState<'http' | 'https'>(parsed.protocol);
  const [host, setHost] = useState(parsed.host);
  const [port, setPort] = useState(parsed.port);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('apikey');
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [jellyfinPassword, setJellyfinPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>(storedConnectionStatus);

  const buildUrl = () => `${protocol}://${host.trim()}${port ? ':' + port : ''}`;
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
      // Initialize based on auth type
      if (jellyseerrAuthToken === 'jellyfin-auth' && jellyseerrSessionCookie) {
        // Use session cookie for Jellyfin auth
        console.log('[JellyseerrSettings] Testing with session cookie');
        jellyseerrClient.initializeWithSession(jellyseerrUrl, jellyseerrSessionCookie);
      } else if (jellyseerrAuthToken && jellyseerrAuthToken !== 'jellyfin-auth' && jellyseerrAuthToken !== 'local-auth') {
        // Use API key
        console.log('[JellyseerrSettings] Testing with API key');
        jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
      } else {
        // No valid auth method
        console.log('[JellyseerrSettings] No valid auth method found');
        jellyseerrClient.initialize(jellyseerrUrl);
      }
      const result = await jellyseerrClient.testConnection();
      const status = result.ok ? 'connected' : 'error';
      setConnectionStatus(status);
      setJellyseerrConnectionStatus(status);
    } catch (error) {
      console.error('[JellyseerrSettings] Test connection error:', error);
      setConnectionStatus('error');
      setJellyseerrConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server hostname');
      return;
    }

    setIsTesting(true);
    try {
      jellyseerrClient.initialize(buildUrl());
      const result = await jellyseerrClient.testConnection();
      if (result.ok) {
        Alert.alert('Success', `Connected to Jellyseerr ${result.version ?? ''}`);
        setConnectionStatus('connected');
        setJellyseerrConnectionStatus('connected');
      } else {
        Alert.alert('Error', result.error ?? 'Connection failed');
        setConnectionStatus('error');
        setJellyseerrConnectionStatus('error');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to connect to server');
      setConnectionStatus('error');
      setJellyseerrConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server hostname');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = buildUrl().replace(/\/$/, '');

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
        if (!activeServer?.url || !currentUser?.Name) {
          Alert.alert('Error', 'You must be logged into Jellyfin first');
          setIsLoading(false);
          return;
        }
        if (!jellyfinPassword.trim()) {
          Alert.alert('Error', 'Please enter your Jellyfin password');
          setIsLoading(false);
          return;
        }

        // Detailed debug logging to verify ALL parameters before API call
        console.log('='.repeat(60));
        console.log('[JellyseerrSettings] STARTING JELLYFIN AUTH');
        console.log('='.repeat(60));
        console.log('[JellyseerrSettings] Parameters being passed to API:');
        console.log('[JellyseerrSettings]   jellyseerrUrl (arg 1):', cleanUrl);
        console.log('[JellyseerrSettings]   jellyfinServerUrl (arg 2 / hostname):', activeServer.url);
        console.log('[JellyseerrSettings]   jellyfinUsername (arg 3):', currentUser.Name);
        console.log('[JellyseerrSettings]   jellyfinPassword (arg 4):', jellyfinPassword ? `"${jellyfinPassword.substring(0, 2)}..." (${jellyfinPassword.length} chars)` : 'EMPTY');
        console.log('[JellyseerrSettings] Active server object:', JSON.stringify(activeServer, null, 2));
        console.log('[JellyseerrSettings] Current user object:', JSON.stringify(currentUser, null, 2));
        console.log('='.repeat(60));

        const user = await jellyseerrClient.initializeWithJellyfin(
          cleanUrl,
          activeServer.url,
          currentUser.Name,
          jellyfinPassword
        );

        // Get the session cookie from the client
        const sessionCookie = jellyseerrClient.getSessionCookie();
        console.log('[JellyseerrSettings] Session cookie obtained:', sessionCookie ? 'yes' : 'no');

        // Store credentials for session - note: we don't store the password
        // User will need to re-enter password if session expires (or if no cookie was captured)
        setJellyseerrCredentials(cleanUrl, 'jellyfin-auth', getUserDisplayName(user), {
          serverUrl: activeServer.url,
          userId: currentUser.Name,
          token: '', // No token stored - Jellyseerr uses session cookies
          sessionCookie: sessionCookie ?? undefined,
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
      setJellyseerrConnectionStatus('connected');
      Alert.alert('Success', 'Connected to Jellyseerr! Check the Requests tab.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/requests') },
      ]);
    } catch (error: any) {
      console.error('='.repeat(60));
      console.error('[JellyseerrSettings] CONNECTION ERROR');
      console.error('='.repeat(60));
      console.error('[JellyseerrSettings] Error object:', error);
      console.error('[JellyseerrSettings] Error message:', error?.message);
      console.error('[JellyseerrSettings] Error name:', error?.name);
      console.error('[JellyseerrSettings] Error response data:', error?.response?.data);
      console.error('[JellyseerrSettings] Error response status:', error?.response?.status);
      console.error('[JellyseerrSettings] Error response headers:', error?.response?.headers);
      console.error('[JellyseerrSettings] Error stack:', error?.stack);
      console.error('='.repeat(60));

      // Build a detailed error message
      let message = 'Connection failed';
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

      // Add status code if available
      if (error?.response?.status) {
        message = `HTTP ${error.response.status}: ${message}`;
      }

      setJellyseerrConnectionStatus('error');
      Alert.alert('Connection Error', message);
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
          clearJellyseerrCredentials(); // This also resets jellyseerrConnectionStatus in the store
          jellyseerrClient.clearAuth();
          setProtocol('http');
          setHost('');
          setPort(DEFAULT_PORT);
          setApiKey('');
          setUsername('');
          setPassword('');
          setJellyfinPassword('');
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
        <View style={styles.brandingSection}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.brandingIcon}
          >
            <Ionicons name="film" size={28} color="#fff" />
          </LinearGradient>
          <Text style={styles.brandingTitle}>Jellyseerr</Text>
          <Text style={styles.brandingSubtitle}>
            Request movies and TV shows from your media server
          </Text>
        </View>

        {isConnected ? (
          <View style={styles.content}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Connection Status</Text>
                <View style={[
                  styles.statusPill,
                  { backgroundColor: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : connectionStatus === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)' }
                ]}>
                  <View style={[styles.statusDot, { backgroundColor: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'error' ? '#ef4444' : '#f59e0b' }]} />
                  <Text style={[
                    styles.statusPillText,
                    { color: connectionStatus === 'connected' ? '#22c55e' : connectionStatus === 'error' ? '#ef4444' : '#f59e0b' }
                  ]}>
                    {isTesting ? 'Checking...' : connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Error' : 'Unknown'}
                  </Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="server-outline" size={16} color={JELLYSEERR_PURPLE} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Server</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{jellyseerrUrl}</Text>
                  </View>
                </View>

                <View style={styles.infoItem}>
                  <View style={styles.infoIconContainer}>
                    <Ionicons name="person-outline" size={16} color={JELLYSEERR_PURPLE} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Logged in as</Text>
                    <Text style={styles.infoValue}>{jellyseerrUsername}</Text>
                  </View>
                </View>
              </View>
            </View>

            <Pressable style={styles.testButton} onPress={testExistingConnection} disabled={isTesting}>
              {isTesting ? (
                <ActivityIndicator color={JELLYSEERR_PURPLE} size="small" />
              ) : (
                <>
                  <Ionicons name="refresh-outline" size={18} color={JELLYSEERR_PURPLE} />
                  <Text style={[styles.testButtonText, { color: JELLYSEERR_PURPLE }]}>Test Connection</Text>
                </>
              )}
            </Pressable>

            <Pressable style={styles.navButton} onPress={() => router.push('/(tabs)/requests')}>
              <View style={styles.navButtonContent}>
                <View style={[styles.navButtonIcon, { backgroundColor: `${JELLYSEERR_PURPLE}20` }]}>
                  <Ionicons name="film-outline" size={18} color={JELLYSEERR_PURPLE} />
                </View>
                <View style={styles.navButtonText}>
                  <Text style={styles.navButtonTitle}>Open Requests</Text>
                  <Text style={styles.navButtonSubtitle}>Browse and request content</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </Pressable>

            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Advanced</Text>
            </View>

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Use Custom Headers</Text>
                <Text style={styles.optionSubtitle}>Apply headers from Settings to API requests</Text>
              </View>
              <Switch
                value={jellyseerrUseCustomHeaders}
                onValueChange={setJellyseerrUseCustomHeaders}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: JELLYSEERR_PURPLE + '80' }}
                thumbColor={jellyseerrUseCustomHeaders ? JELLYSEERR_PURPLE : '#f4f3f4'}
              />
            </View>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
              <Pressable style={styles.disconnectButton} onPress={handleDisconnect}>
                <Ionicons name="log-out-outline" size={18} color="#ef4444" />
                <Text style={styles.disconnectButtonText}>Disconnect from Jellyseerr</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={styles.label}>Server Address</Text>
            <View style={styles.urlRow}>
              <View style={styles.protocolPicker}>
                <Pressable
                  style={[styles.protocolOption, protocol === 'http' && { backgroundColor: accentColor }]}
                  onPress={() => setProtocol('http')}
                >
                  <Text style={[styles.protocolOptionText, protocol === 'http' && { color: '#fff' }]}>http://</Text>
                </Pressable>
                <Pressable
                  style={[styles.protocolOption, protocol === 'https' && { backgroundColor: accentColor }]}
                  onPress={() => setProtocol('https')}
                >
                  <Text style={[styles.protocolOptionText, protocol === 'https' && { color: '#fff' }]}>https://</Text>
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.hostInput]}
                placeholder="192.168.1.100"
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={host}
                onChangeText={setHost}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.input, styles.portInput]}
                placeholder={DEFAULT_PORT}
                placeholderTextColor="rgba(255,255,255,0.3)"
                value={port}
                onChangeText={setPort}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="number-pad"
              />
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
              <>
                <View style={styles.jellyfinInfo}>
                  <Ionicons name="information-circle-outline" size={20} color={accentColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jellyfinInfoText}>
                      Will authenticate as: {currentUser?.Name ?? 'Not logged in'}
                    </Text>
                    <Text style={[styles.jellyfinInfoText, { fontSize: 11, marginTop: 4, opacity: 0.7 }]}>
                      Jellyfin server: {activeServer?.url ?? 'Not connected'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.label}>Jellyfin Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Jellyfin password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={jellyfinPassword}
                  onChangeText={setJellyfinPassword}
                  secureTextEntry
                />
                <Text style={styles.hint}>
                  Jellyseerr requires your Jellyfin password to authenticate. Your password is not stored.
                </Text>
              </>
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

            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.testUrlButton, { borderColor: accentColor }]}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator color={accentColor} size="small" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={18} color={accentColor} />
                    <Text style={[styles.testUrlButtonText, { color: accentColor }]}>Test</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={[styles.connectButton, { backgroundColor: accentColor, flex: 1 }]}
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
  brandingSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  brandingIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandingTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },
  brandingSubtitle: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    backgroundColor: colors.surface.default,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  infoSection: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${JELLYSEERR_PURPLE}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  testUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  testUrlButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  testButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  navButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  navButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    flex: 1,
  },
  navButtonTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  navButtonSubtitle: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dangerZone: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  dangerZoneTitle: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  disconnectButton: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  disconnectButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  protocolPicker: {
    flexDirection: 'column',
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    overflow: 'hidden',
  },
  protocolOption: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  protocolOptionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  hostInput: {
    flex: 1,
  },
  portInput: {
    width: 70,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  optionInfo: {
    flex: 1,
    marginRight: 12,
  },
  optionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  optionSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
});
