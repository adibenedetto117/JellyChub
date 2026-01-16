import { useState, useEffect } from 'react';
import { Alert, ScrollView } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore, selectActiveServer } from '@/stores';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import { colors } from '@/theme';
import {
  ConnectionStatus,
  ConnectionForm,
  styles,
  AuthMethod,
  DEFAULT_PORT,
  parseUrl,
} from '@/components/shared/settings/jellyseerr';

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
      if (jellyseerrAuthToken === 'jellyfin-auth' && jellyseerrSessionCookie) {
        console.log('[JellyseerrSettings] Testing with session cookie');
        jellyseerrClient.initializeWithSession(jellyseerrUrl, jellyseerrSessionCookie);
      } else if (jellyseerrAuthToken && jellyseerrAuthToken !== 'jellyfin-auth' && jellyseerrAuthToken !== 'local-auth') {
        console.log('[JellyseerrSettings] Testing with API key');
        jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
      } else {
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

        const sessionCookie = jellyseerrClient.getSessionCookie();
        console.log('[JellyseerrSettings] Session cookie obtained:', sessionCookie ? 'yes' : 'no');

        setJellyseerrCredentials(cleanUrl, 'jellyfin-auth', getUserDisplayName(user), {
          serverUrl: activeServer.url,
          userId: currentUser.Name,
          token: '',
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

      let message = 'Connection failed';
      if (error?.response?.data?.message) {
        message = error.response.data.message;
      } else if (error?.message) {
        message = error.message;
      }

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
          clearJellyseerrCredentials();
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
          <ConnectionStatus
            connectionStatus={connectionStatus}
            isTesting={isTesting}
            jellyseerrUrl={jellyseerrUrl}
            jellyseerrUsername={jellyseerrUsername}
            jellyseerrUseCustomHeaders={jellyseerrUseCustomHeaders}
            onTestConnection={testExistingConnection}
            onDisconnect={handleDisconnect}
            onToggleCustomHeaders={setJellyseerrUseCustomHeaders}
          />
        ) : (
          <ConnectionForm
            protocol={protocol}
            host={host}
            port={port}
            authMethod={authMethod}
            apiKey={apiKey}
            username={username}
            password={password}
            jellyfinPassword={jellyfinPassword}
            accentColor={accentColor}
            isTesting={isTesting}
            isLoading={isLoading}
            currentUserName={currentUser?.Name}
            activeServerUrl={activeServer?.url}
            onProtocolChange={setProtocol}
            onHostChange={setHost}
            onPortChange={setPort}
            onAuthMethodChange={setAuthMethod}
            onApiKeyChange={setApiKey}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onJellyfinPasswordChange={setJellyfinPassword}
            onTest={handleTestConnection}
            onConnect={handleConnect}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
