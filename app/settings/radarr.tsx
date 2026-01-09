import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService } from '@/services';
import { colors } from '@/theme';

export default function RadarrSettingsScreen() {
  const {
    radarrUrl,
    radarrApiKey,
    accentColor,
    setRadarrCredentials,
    clearRadarrCredentials,
  } = useSettingsStore();

  const [url, setUrl] = useState(radarrUrl ?? '');
  const [apiKey, setApiKey] = useState(radarrApiKey ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
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
        setVersion(result.version ?? null);
      } else {
        setConnectionStatus('error');
      }
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

    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsTesting(true);
    try {
      setRadarrCredentials(url.trim(), apiKey.trim());
      const result = await radarrService.testConnection();
      if (result.ok) {
        Alert.alert('Success', `Connected to Radarr ${result.version ?? ''}`);
        setConnectionStatus('connected');
        setVersion(result.version ?? null);
      } else {
        Alert.alert('Error', result.error ?? 'Connection failed');
        setConnectionStatus('error');
        clearRadarrCredentials();
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to connect to server');
      setConnectionStatus('error');
      clearRadarrCredentials();
    } finally {
      setIsTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    if (!apiKey.trim()) {
      Alert.alert('Error', 'Please enter an API key');
      return;
    }

    setIsLoading(true);
    try {
      const cleanUrl = url.trim().replace(/\/$/, '');
      setRadarrCredentials(cleanUrl, apiKey.trim());

      const result = await radarrService.testConnection();
      if (result.ok) {
        setVersion(result.version ?? null);
        setConnectionStatus('connected');
        Alert.alert('Success', 'Connected to Radarr', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        clearRadarrCredentials();
        Alert.alert('Error', result.error ?? 'Connection failed');
      }
    } catch (error: any) {
      clearRadarrCredentials();
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
          setUrl('');
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
                <Text style={styles.infoText}>{radarrUrl}</Text>
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
            <TextInput
              style={styles.input}
              placeholder="http://localhost:7878"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <Text style={styles.label}>API Key</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your Radarr API key"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={apiKey}
              onChangeText={setApiKey}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
            />
            <Text style={styles.hint}>
              Find your API key in Radarr Settings → General → API Key
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
});
