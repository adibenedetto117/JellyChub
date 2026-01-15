import { useState, useEffect, useCallback } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { useSettingsStore } from '@/stores/settingsStore';
import { sonarrService } from '@/api';
import { colors } from '@/theme';
import {
  ConnectionInfo,
  ConnectionForm,
  QuickActionsSection,
  WelcomeSection,
  SettingsSection,
  DisconnectButton,
  styles,
  DEFAULT_PORT,
} from '@/components/shared/settings/sonarr';

export default function SonarrSettingsScreen() {
  const {
    sonarrUrl,
    sonarrApiKey,
    accentColor,
    sonarrConnectionStatus: storedConnectionStatus,
    sonarrUseCustomHeaders,
    setSonarrCredentials,
    clearSonarrCredentials,
    setSonarrConnectionStatus,
    setSonarrUseCustomHeaders,
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

  const parsed = parseUrl(sonarrUrl);
  const [protocol, setProtocol] = useState<'http' | 'https'>(parsed.protocol);
  const [host, setHost] = useState(parsed.host);
  const [port, setPort] = useState(parsed.port);
  const [apiKey, setApiKey] = useState(sonarrApiKey ?? '');
  const [isLoading, setIsLoading] = useState(false);

  const buildUrl = () => `${protocol}://${host.trim()}${port ? ':' + port : ''}`;

  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>(storedConnectionStatus);
  const [version, setVersion] = useState<string | null>(null);

  const isConnected = !!sonarrUrl && !!sonarrApiKey;

  useEffect(() => {
    if (isConnected) {
      testExistingConnection();
    }
  }, []);

  const testExistingConnection = useCallback(async () => {
    setIsTesting(true);
    try {
      const result = await sonarrService.testConnection();
      if (result.ok) {
        setConnectionStatus('connected');
        setSonarrConnectionStatus('connected');
        setVersion(result.version ?? null);
      } else {
        setConnectionStatus('error');
        setSonarrConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
      setSonarrConnectionStatus('error');
    } finally {
      setIsTesting(false);
    }
  }, [setSonarrConnectionStatus]);

  const handleTestConnection = useCallback(async () => {
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
      setSonarrCredentials(buildUrl(), apiKey.trim());
      const result = await sonarrService.testConnection();
      if (result.ok) {
        Alert.alert('Success', `Connected to Sonarr ${result.version ?? ''}`);
        setConnectionStatus('connected');
        setSonarrConnectionStatus('connected');
        setVersion(result.version ?? null);
      } else {
        Alert.alert('Error', result.error ?? 'Connection failed');
        setConnectionStatus('error');
        setSonarrConnectionStatus('error');
        clearSonarrCredentials();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to connect to server');
      setConnectionStatus('error');
      setSonarrConnectionStatus('error');
      clearSonarrCredentials();
    } finally {
      setIsTesting(false);
    }
  }, [host, apiKey, buildUrl, setSonarrCredentials, clearSonarrCredentials, setSonarrConnectionStatus]);

  const handleConnect = useCallback(async () => {
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
      setSonarrCredentials(fullUrl, apiKey.trim());

      const result = await sonarrService.testConnection();
      if (result.ok) {
        setVersion(result.version ?? null);
        setConnectionStatus('connected');
        setSonarrConnectionStatus('connected');
        Alert.alert('Success', 'Connected to Sonarr', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        clearSonarrCredentials();
        setSonarrConnectionStatus('error');
        Alert.alert('Error', result.error ?? 'Connection failed');
      }
    } catch (error: any) {
      clearSonarrCredentials();
      setSonarrConnectionStatus('error');
      Alert.alert('Error', error?.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  }, [host, apiKey, buildUrl, setSonarrCredentials, clearSonarrCredentials, setSonarrConnectionStatus]);

  const handleDisconnect = useCallback(() => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from Sonarr?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          clearSonarrCredentials();
          setProtocol('http');
          setHost('');
          setPort(DEFAULT_PORT);
          setApiKey('');
          setConnectionStatus('unknown');
          setVersion(null);
        },
      },
    ]);
  }, [clearSonarrCredentials]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Sonarr',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {isConnected ? (
          <View style={styles.content}>
            <ConnectionInfo
              sonarrUrl={sonarrUrl}
              connectionStatus={connectionStatus}
              version={version}
              isTesting={isTesting}
              accentColor={accentColor}
              onTest={testExistingConnection}
            />

            <QuickActionsSection />

            <SettingsSection
              accentColor={accentColor}
              useCustomHeaders={sonarrUseCustomHeaders}
              onCustomHeadersChange={setSonarrUseCustomHeaders}
            />

            <DisconnectButton onDisconnect={handleDisconnect} />
          </View>
        ) : (
          <View style={styles.content}>
            <WelcomeSection />

            <ConnectionForm
              protocol={protocol}
              host={host}
              port={port}
              apiKey={apiKey}
              isTesting={isTesting}
              isLoading={isLoading}
              onProtocolChange={setProtocol}
              onHostChange={setHost}
              onPortChange={setPort}
              onApiKeyChange={setApiKey}
              onTest={handleTestConnection}
              onConnect={handleConnect}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
