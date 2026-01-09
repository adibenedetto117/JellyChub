import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { sonarrService } from '@/services';
import { colors } from '@/theme';

const DEFAULT_PORT = '8989';

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

  const testExistingConnection = async () => {
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
  };

  const handleDisconnect = () => {
    Alert.alert('Disconnect', 'Are you sure you want to disconnect from Sonarr?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: () => {
          clearSonarrCredentials(); // This also resets sonarrConnectionStatus in the store
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
          headerTitle: 'Sonarr',
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
                {version && connectionStatus === 'connected' && (
                  <Text style={styles.versionText}>v{version}</Text>
                )}
              </View>

              <View style={styles.infoRow}>
                <Ionicons name="server-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.infoText}>{sonarrUrl}</Text>
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

            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <Text style={styles.optionTitle}>Use Custom Headers</Text>
              </View>
              <Switch
                value={sonarrUseCustomHeaders}
                onValueChange={setSonarrUseCustomHeaders}
                trackColor={{ false: 'rgba(255,255,255,0.2)', true: accentColor + '80' }}
                thumbColor={sonarrUseCustomHeaders ? accentColor : '#f4f3f4'}
              />
            </View>

            <Pressable style={styles.disconnectButton} onPress={handleDisconnect}>
              <Text style={styles.disconnectButtonText}>Disconnect</Text>
            </Pressable>
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

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Sonarr API key"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              Find your API key in Sonarr Settings, General, API Key
            </Text>

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
  versionText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginLeft: 8,
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
  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 8,
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
