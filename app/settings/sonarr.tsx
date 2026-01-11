import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { sonarrService } from '@/services';
import { colors, spacing, borderRadius } from '@/theme';

const DEFAULT_PORT = '8989';
const SONARR_BLUE = '#35c5f4';
const SONARR_DARK = '#1a3a4a';
const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

interface ConnectionInfoProps {
  sonarrUrl: string | null;
  connectionStatus: 'unknown' | 'connected' | 'error';
  version: string | null;
  isTesting: boolean;
  accentColor: string;
  onTest: () => void;
}

const ConnectionInfo = memo(function ConnectionInfo({
  sonarrUrl,
  connectionStatus,
  version,
  isTesting,
  accentColor,
  onTest,
}: ConnectionInfoProps) {
  const getStatusIcon = () => {
    if (isTesting) return 'sync';
    if (connectionStatus === 'connected') return 'checkmark-circle';
    if (connectionStatus === 'error') return 'alert-circle';
    return 'help-circle';
  };

  const getStatusColor = () => {
    if (connectionStatus === 'connected') return colors.status.success;
    if (connectionStatus === 'error') return colors.status.error;
    return colors.status.warning;
  };

  return (
    <Animated.View entering={FadeInDown.delay(100).springify()}>
      <View style={styles.connectionCard}>
        <LinearGradient
          colors={[`${getStatusColor()}15`, 'transparent']}
          style={styles.connectionGradient}
        />
        <View style={styles.connectionHeader}>
          <View style={[styles.statusIconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
            <Ionicons name={getStatusIcon() as any} size={24} color={getStatusColor()} />
          </View>
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionTitle}>
              {isTesting ? 'Testing...' : connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'error' ? 'Connection Error' : 'Unknown Status'}
            </Text>
            {version && connectionStatus === 'connected' && (
              <Text style={styles.connectionVersion}>Sonarr v{version}</Text>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.refreshButton, { opacity: pressed ? 0.7 : 1 }]}
            onPress={onTest}
            disabled={isTesting}
          >
            {isTesting ? (
              <ActivityIndicator color={accentColor} size="small" />
            ) : (
              <Ionicons name="refresh-outline" size={20} color={accentColor} />
            )}
          </Pressable>
        </View>
        <View style={styles.serverUrlRow}>
          <Ionicons name="server-outline" size={14} color={colors.text.muted} />
          <Text style={styles.serverUrl} numberOfLines={1}>{sonarrUrl}</Text>
        </View>
      </View>
    </Animated.View>
  );
});

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  delay?: number;
}

const QuickAction = memo(function QuickAction({ icon, label, onPress, color = SONARR_BLUE, delay = 0 }: QuickActionProps) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.quickActionWrapper}>
      <Pressable
        style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onPress}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      </Pressable>
    </Animated.View>
  );
});

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

            <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <QuickAction
                icon="library"
                label="Manage Series"
                onPress={() => router.push('/settings/sonarr-manage')}
                delay={200}
              />
              <QuickAction
                icon="calendar"
                label="View Calendar"
                onPress={() => router.push('/settings/sonarr-calendar')}
                delay={250}
              />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
              <Text style={styles.sectionTitle}>Settings</Text>
              <View style={styles.settingCard}>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Ionicons name="code-slash" size={20} color={colors.text.secondary} />
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>Custom Headers</Text>
                      <Text style={styles.settingSubtitle}>Use Jellyfin custom headers</Text>
                    </View>
                  </View>
                  <Switch
                    value={sonarrUseCustomHeaders}
                    onValueChange={setSonarrUseCustomHeaders}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: accentColor + '80' }}
                    thumbColor={sonarrUseCustomHeaders ? accentColor : '#f4f3f4'}
                  />
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).springify()}>
              <Pressable
                style={({ pressed }) => [styles.disconnectButton, { opacity: pressed ? 0.8 : 1 }]}
                onPress={handleDisconnect}
              >
                <Ionicons name="log-out-outline" size={18} color={colors.status.error} />
                <Text style={styles.disconnectButtonText}>Disconnect from Sonarr</Text>
              </Pressable>
            </Animated.View>
          </View>
        ) : (
          <View style={styles.content}>
            <Animated.View entering={FadeIn.duration(400)} style={styles.welcomeSection}>
              <LinearGradient colors={SONARR_GRADIENT} style={styles.welcomeIcon}>
                <Ionicons name="tv" size={40} color="#fff" />
              </LinearGradient>
              <Text style={styles.welcomeTitle}>Connect to Sonarr</Text>
              <Text style={styles.welcomeSubtitle}>
                Manage your TV series library and automate downloads
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(100).springify()}>
              <Text style={styles.label}>Server Address</Text>
              <View style={styles.urlRow}>
                <View style={styles.protocolPicker}>
                  <Pressable
                    style={[styles.protocolOption, protocol === 'http' && styles.protocolOptionActive]}
                    onPress={() => setProtocol('http')}
                  >
                    <Text style={[styles.protocolOptionText, protocol === 'http' && styles.protocolOptionTextActive]}>http</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.protocolOption, protocol === 'https' && styles.protocolOptionActive]}
                    onPress={() => setProtocol('https')}
                  >
                    <Text style={[styles.protocolOptionText, protocol === 'https' && styles.protocolOptionTextActive]}>https</Text>
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.input, styles.hostInput]}
                  placeholder="192.168.1.100 or hostname"
                  placeholderTextColor={colors.text.muted}
                  value={host}
                  onChangeText={setHost}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                <TextInput
                  style={[styles.input, styles.portInput]}
                  placeholder={DEFAULT_PORT}
                  placeholderTextColor={colors.text.muted}
                  value={port}
                  onChangeText={setPort}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="number-pad"
                />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(150).springify()}>
              <Text style={styles.label}>API Key</Text>
              <View style={styles.apiKeyContainer}>
                <Ionicons name="key-outline" size={18} color={colors.text.muted} style={styles.apiKeyIcon} />
                <TextInput
                  style={styles.apiKeyInput}
                  placeholder="Enter your Sonarr API key"
                  placeholderTextColor={colors.text.muted}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
              </View>
              <View style={styles.hintRow}>
                <Ionicons name="information-circle-outline" size={14} color={colors.text.muted} />
                <Text style={styles.hint}>
                  Settings &gt; General &gt; Security &gt; API Key
                </Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.delay(200).springify()} style={styles.buttonRow}>
              <Pressable
                style={({ pressed }) => [styles.testUrlButton, { opacity: pressed ? 0.8 : 1, borderColor: SONARR_BLUE }]}
                onPress={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <ActivityIndicator color={SONARR_BLUE} size="small" />
                ) : (
                  <>
                    <Ionicons name="flash-outline" size={18} color={SONARR_BLUE} />
                    <Text style={[styles.testUrlButtonText, { color: SONARR_BLUE }]}>Test</Text>
                  </>
                )}
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.connectButton, { opacity: pressed ? 0.9 : 1 }]}
                onPress={handleConnect}
                disabled={isLoading}
              >
                <LinearGradient colors={SONARR_GRADIENT} style={styles.connectGradient}>
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="link" size={18} color="#fff" />
                      <Text style={styles.connectButtonText}>Connect</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
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
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    marginBottom: spacing[4],
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  welcomeTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  welcomeSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: spacing[4],
  },
  connectionCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  connectionGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  connectionInfo: {
    flex: 1,
  },
  connectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  connectionVersion: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serverUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[2],
  },
  serverUrl: {
    color: colors.text.secondary,
    fontSize: 13,
    flex: 1,
    fontFamily: 'monospace',
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[3],
    marginLeft: spacing[1],
  },
  quickActionWrapper: {
    marginBottom: spacing[2],
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  quickActionLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing[3],
  },
  settingTextContainer: {
    marginLeft: spacing[3],
  },
  settingTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  settingSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${colors.status.error}15`,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing[4],
    gap: spacing[2],
    marginTop: spacing[4],
  },
  disconnectButtonText: {
    color: colors.status.error,
    fontSize: 15,
    fontWeight: '600',
  },
  label: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing[2],
    marginTop: spacing[4],
    marginLeft: spacing[1],
  },
  input: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    color: '#fff',
    fontSize: 15,
  },
  urlRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'stretch',
  },
  protocolPicker: {
    flexDirection: 'column',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  protocolOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    alignItems: 'center',
  },
  protocolOptionActive: {
    backgroundColor: SONARR_BLUE,
  },
  protocolOptionText: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  protocolOptionTextActive: {
    color: '#fff',
  },
  hostInput: {
    flex: 1,
  },
  portInput: {
    width: 72,
    textAlign: 'center',
  },
  apiKeyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
  },
  apiKeyIcon: {
    marginRight: spacing[2],
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: spacing[3],
    color: '#fff',
    fontSize: 15,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[2],
    paddingLeft: spacing[1],
  },
  hint: {
    color: colors.text.muted,
    fontSize: 12,
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[6],
  },
  testUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 2,
    gap: spacing[2],
  },
  testUrlButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  connectButton: {
    flex: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  connectGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
