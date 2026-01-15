import { View, Text, Pressable, ActivityIndicator, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { ConnectionStatus } from './ConnectionStatus';

interface ConnectedViewProps {
  connectionStatus: 'unknown' | 'connected' | 'error';
  isTesting: boolean;
  version: string | null;
  serverUrl: string;
  accentColor: string;
  useCustomHeaders: boolean;
  onTestConnection: () => void;
  onToggleCustomHeaders: (value: boolean) => void;
  onDisconnect: () => void;
}

export function ConnectedView({
  connectionStatus,
  isTesting,
  version,
  serverUrl,
  accentColor,
  useCustomHeaders,
  onTestConnection,
  onToggleCustomHeaders,
  onDisconnect,
}: ConnectedViewProps) {
  return (
    <View style={styles.content}>
      <ConnectionStatus
        connectionStatus={connectionStatus}
        isTesting={isTesting}
        version={version}
        serverUrl={serverUrl}
      />

      <Pressable style={styles.testButton} onPress={onTestConnection} disabled={isTesting}>
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
          value={useCustomHeaders}
          onValueChange={onToggleCustomHeaders}
          trackColor={{ false: 'rgba(255,255,255,0.2)', true: accentColor + '80' }}
          thumbColor={useCustomHeaders ? accentColor : '#f4f3f4'}
        />
      </View>

      <Pressable style={styles.disconnectButton} onPress={onDisconnect}>
        <Text style={styles.disconnectButtonText}>Disconnect</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
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
});
