import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { MEDIA_STATUS } from '@/types/jellyseerr';

interface Props {
  mediaStatus: number;
  releaseDate?: string;
  delay?: number;
}

function getStatusInfo(mediaStatus: number, isNotYetReleased: boolean) {
  if (mediaStatus === MEDIA_STATUS.AVAILABLE) {
    return { icon: 'checkmark-done-circle', label: 'Available in Library', color: '#22c55e' };
  }
  if (mediaStatus === MEDIA_STATUS.PARTIALLY_AVAILABLE) {
    return { icon: 'pie-chart', label: 'Partially Available', color: '#f97316' };
  }
  if (mediaStatus === MEDIA_STATUS.PENDING) {
    return { icon: 'time', label: 'Request Pending', color: '#fbbf24' };
  }
  if (mediaStatus === MEDIA_STATUS.PROCESSING && isNotYetReleased) {
    return { icon: 'time', label: 'Requested', color: '#fbbf24' };
  }
  if (mediaStatus === MEDIA_STATUS.PROCESSING) {
    return { icon: 'sync', label: 'Processing', color: '#8b5cf6' };
  }
  return null;
}

export function MediaStatusBanner({ mediaStatus, releaseDate, delay = 100 }: Props) {
  const isNotYetReleased = releaseDate ? new Date(releaseDate) > new Date() : false;
  const statusInfo = getStatusInfo(mediaStatus, isNotYetReleased);

  if (!statusInfo) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <LinearGradient
        colors={[`${statusInfo.color}20`, `${statusInfo.color}08`]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
        <Text style={[styles.text, { color: statusInfo.color }]}>{statusInfo.label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
