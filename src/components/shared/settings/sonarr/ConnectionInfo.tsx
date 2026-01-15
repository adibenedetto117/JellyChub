import { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';
import { styles } from './styles';

interface ConnectionInfoProps {
  sonarrUrl: string | null;
  connectionStatus: 'unknown' | 'connected' | 'error';
  version: string | null;
  isTesting: boolean;
  accentColor: string;
  onTest: () => void;
}

export const ConnectionInfo = memo(function ConnectionInfo({
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
