import { View, Text, Pressable, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { JELLYSEERR_PURPLE } from './constants';
import { styles } from './styles';

interface ConnectionStatusProps {
  connectionStatus: 'unknown' | 'connected' | 'error';
  isTesting: boolean;
  jellyseerrUrl: string | null;
  jellyseerrUsername: string | null;
  jellyseerrUseCustomHeaders: boolean;
  onTestConnection: () => void;
  onDisconnect: () => void;
  onToggleCustomHeaders: (value: boolean) => void;
}

export function ConnectionStatus({
  connectionStatus,
  isTesting,
  jellyseerrUrl,
  jellyseerrUsername,
  jellyseerrUseCustomHeaders,
  onTestConnection,
  onDisconnect,
  onToggleCustomHeaders,
}: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (connectionStatus === 'connected') return '#22c55e';
    if (connectionStatus === 'error') return '#ef4444';
    return '#f59e0b';
  };

  const getStatusBackground = () => {
    if (connectionStatus === 'connected') return 'rgba(34, 197, 94, 0.15)';
    if (connectionStatus === 'error') return 'rgba(239, 68, 68, 0.15)';
    return 'rgba(245, 158, 11, 0.15)';
  };

  const getStatusText = () => {
    if (isTesting) return 'Checking...';
    if (connectionStatus === 'connected') return 'Connected';
    if (connectionStatus === 'error') return 'Error';
    return 'Unknown';
  };

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Connection Status</Text>
          <View style={[styles.statusPill, { backgroundColor: getStatusBackground() }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={[styles.statusPillText, { color: getStatusColor() }]}>
              {getStatusText()}
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

      <Pressable style={styles.testButton} onPress={onTestConnection} disabled={isTesting}>
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
          onValueChange={onToggleCustomHeaders}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: JELLYSEERR_PURPLE + '80' }}
          thumbColor={jellyseerrUseCustomHeaders ? JELLYSEERR_PURPLE : '#f4f3f4'}
        />
      </View>

      <View style={styles.dangerZone}>
        <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
        <Pressable style={styles.disconnectButton} onPress={onDisconnect}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.disconnectButtonText}>Disconnect from Jellyseerr</Text>
        </Pressable>
      </View>
    </View>
  );
}
