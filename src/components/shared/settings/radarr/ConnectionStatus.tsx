import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface ConnectionStatusProps {
  connectionStatus: 'unknown' | 'connected' | 'error';
  isTesting: boolean;
  version: string | null;
  serverUrl: string;
}

export function ConnectionStatus({ connectionStatus, isTesting, version, serverUrl }: ConnectionStatusProps) {
  const getStatusColor = () => {
    if (connectionStatus === 'connected') return '#22c55e';
    if (connectionStatus === 'error') return '#ef4444';
    return '#f59e0b';
  };

  const getStatusText = () => {
    if (isTesting) return 'Checking...';
    if (connectionStatus === 'connected') return 'Connected';
    if (connectionStatus === 'error') return 'Connection Error';
    return 'Unknown';
  };

  return (
    <View style={styles.card}>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
        <Text style={styles.statusText}>{getStatusText()}</Text>
        {version && connectionStatus === 'connected' && (
          <Text style={styles.versionText}>v{version}</Text>
        )}
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="server-outline" size={16} color="rgba(255,255,255,0.5)" />
        <Text style={styles.infoText}>{serverUrl}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
