import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService } from '@/api';
import { colors } from '@/theme';
import { ConnectionForm, ConnectedView } from '@/components/shared/settings/radarr';

const DEFAULT_PORT = '7878';

export default function RadarrSettingsScreen() {
  const {
    radarrUrl,
    radarrApiKey,
    accentColor,
    radarrConnectionStatus: storedConnectionStatus,
    radarrUseCustomHeaders,
    setRadarrCredentials,
    clearRadarrCredentials,
    setRadarrConnectionStatus,
    setRadarrUseCustomHeaders,
  } = useSettingsStore();

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

  const parsed = parseUrl(radarrUrl);
  const [protocol, setProtocol] = useState<'http' | 'https'>(parsed.protocol);
  const [host, setHost] = useState(parsed.host);
  const [port, setPort] = useState(parsed.port);
  const [apiKey, setApiKey] = useState(radarrApiKey ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const buildUrl = () => `${protocol}://${host.trim()}${port ? ':' + port : ''}`;
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>(storedConnectionStatus);
  const [version, setVersion] = useState<string | null>(null);

  const isConnected = !!radarrUrl && !!radarrApiKey;

  useEffect(() => {
    if (isConnected) {
      testExistingConnection();
    }
  }, []);

  const testExistingConnection = async () => {
    setIsTesting(true);
    try {
      const result = await radarrService.testConnection();
      if (result.ok) {
        setConnectionStatus('connected');
        setRadarrConnectionStatus('connected');
        setVersion(result.version ?? null);
      } else {
        setConnectionStatus('error');
        setRadarrConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
      setRadarrConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server hostname');
      return;
    }

    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsTesting(true);
    try {
      setRadarrCredentials(buildUrl(), apiKey.trim());
      const result = await radarrService.testConnection();
      if (result.ok) {
        Alert.alert('Success', `Connected to Radarr ${result.version ?? ''}`);
        setConnectionStatus('connected');
        setRadarrConnectionStatus('connected');
        setVersion(result.version ?? null);
      } else {
        Alert.alert('Error', result.error ?? 'Connection failed');
        setConnectionStatus('error');
        setRadarrConnectionStatus('error');
        clearRadarrCredentials();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to connect to server');
      setConnectionStatus('error');
      setRadarrConnectionStatus('error');
      clearRadarrCredentials();
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!host.trim()) {
      Alert.alert('Error', 'Please enter a server hostname');
      return;
    }

    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsLoading(true);
    try {
      const fullUrl = buildUrl();
      setRadarrCredentials(fullUrl, apiKey.trim());

      const result = await radarrService.testConnection();
      if (result.ok) {
        setVersion(result.version ?? null);
        setConnectionStatus('connected');
        setRadarrConnectionStatus('connected');
        Alert.alert('Success', 'Connected to Radarr', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        clearRadarrCredentials();
        setRadarrConnectionStatus('error');
        Alert.alert('Error', result.error ?? 'Connection failed');
      }
    } catch (error: any) {
      clearRadarrCredentials();
      setRadarrConnectionStatus('error');
      Alert.alert('Error', error?.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from Radarr?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          clearRadarrCredentials();
          setProtocol('http');
          setHost('');
          setPort(DEFAULT_PORT);
          setApiKey('');
          setConnectionStatus('unknown');
          setVersion(null);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Radarr',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        {isConnected ? (
          <ConnectedView
            connectionStatus={connectionStatus}
            isTesting={isTesting}
            version={version}
            serverUrl={radarrUrl!}
            accentColor={accentColor}
            useCustomHeaders={radarrUseCustomHeaders}
            onTestConnection={testExistingConnection}
            onToggleCustomHeaders={setRadarrUseCustomHeaders}
            onDisconnect={handleDisconnect}
          />
        ) : (
          <ConnectionForm
            protocol={protocol}
            host={host}
            port={port}
            apiKey={apiKey}
            defaultPort={DEFAULT_PORT}
            accentColor={accentColor}
            isLoading={isLoading}
            isTesting={isTesting}
            onProtocolChange={setProtocol}
            onHostChange={setHost}
            onPortChange={setPort}
            onApiKeyChange={setApiKey}
            onTestConnection={handleTestConnection}
            onConnect={handleConnect}
          />
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
});
