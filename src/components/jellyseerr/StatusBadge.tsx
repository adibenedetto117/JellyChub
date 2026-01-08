import { View, Text, StyleSheet } from 'react-native';
import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { RequestStatus, MediaStatus } from '@/types/jellyseerr';
import { REQUEST_STATUS, MEDIA_STATUS } from '@/types/jellyseerr';

interface Props {
  status: RequestStatus | MediaStatus;
  type: 'request' | 'media';
  size?: 'small' | 'medium';
  variant?: 'default' | 'overlay';
  mediaType?: 'movie' | 'tv';
}

const requestStatusConfig: Record<RequestStatus, { label: string; color: string; bgColor: string; gradientColors: [string, string]; icon: string }> = {
  [REQUEST_STATUS.PENDING]: {
    label: 'Pending',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    gradientColors: ['#92400e', '#78350f'],
    icon: 'time-outline',
  },
  [REQUEST_STATUS.APPROVED]: {
    label: 'Approved',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    gradientColors: ['#1e40af', '#1e3a8a'],
    icon: 'checkmark-circle-outline',
  },
  [REQUEST_STATUS.DECLINED]: {
    label: 'Declined',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    gradientColors: ['#991b1b', '#7f1d1d'],
    icon: 'close-circle-outline',
  },
  [REQUEST_STATUS.AVAILABLE]: {
    label: 'Available',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    gradientColors: ['#166534', '#14532d'],
    icon: 'checkmark-done-outline',
  },
  [REQUEST_STATUS.PARTIALLY_AVAILABLE]: {
    label: 'Partial',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    gradientColors: ['#9a3412', '#7c2d12'],
    icon: 'pie-chart-outline',
  },
};

const mediaStatusConfig: Record<MediaStatus, { label: string; color: string; bgColor: string; gradientColors: [string, string]; icon: string }> = {
  [MEDIA_STATUS.UNKNOWN]: {
    label: '',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    gradientColors: ['#4b5563', '#374151'],
    icon: '',
  },
  [MEDIA_STATUS.PENDING]: {
    label: 'Requested',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.15)',
    gradientColors: ['#92400e', '#78350f'],
    icon: 'time-outline',
  },
  [MEDIA_STATUS.PROCESSING]: {
    label: 'Processing',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    gradientColors: ['#5b21b6', '#4c1d95'],
    icon: 'sync-outline',
  },
  [MEDIA_STATUS.PARTIALLY_AVAILABLE]: {
    label: 'Partial',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    gradientColors: ['#9a3412', '#7c2d12'],
    icon: 'pie-chart-outline',
  },
  [MEDIA_STATUS.AVAILABLE]: {
    label: 'Available',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    gradientColors: ['#166534', '#14532d'],
    icon: 'checkmark-done-outline',
  },
};

export const StatusBadge = memo(function StatusBadge({ status, type, size = 'small', variant = 'default', mediaType }: Props) {
  let config = type === 'request'
    ? requestStatusConfig[status as RequestStatus]
    : mediaStatusConfig[status as MediaStatus];

  if (!config || !config.label) return null;

  const isPartialStatus = (type === 'request' && status === REQUEST_STATUS.PARTIALLY_AVAILABLE) ||
    (type === 'media' && status === MEDIA_STATUS.PARTIALLY_AVAILABLE);

  if (isPartialStatus && mediaType === 'movie') {
    config = type === 'request'
      ? requestStatusConfig[REQUEST_STATUS.AVAILABLE]
      : mediaStatusConfig[MEDIA_STATUS.AVAILABLE];
  }

  const isSmall = size === 'small';
  const isOverlay = variant === 'overlay';

  if (isOverlay) {
    return (
      <LinearGradient
        colors={config.gradientColors}
        style={[
          styles.badge,
          styles.overlayBadge,
          {
            paddingHorizontal: isSmall ? 8 : 10,
            paddingVertical: isSmall ? 4 : 6,
          },
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {config.icon && (
          <Ionicons name={config.icon as any} size={isSmall ? 10 : 12} color={config.color} style={styles.icon} />
        )}
        <Text
          style={[
            styles.text,
            {
              color: config.color,
              fontSize: isSmall ? 10 : 12,
            },
          ]}
        >
          {config.label}
        </Text>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: isSmall ? 8 : 12,
          paddingVertical: isSmall ? 4 : 6,
        },
      ]}
    >
      {config.icon && (
        <Ionicons name={config.icon as any} size={isSmall ? 10 : 12} color={config.color} style={styles.icon} />
      )}
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: isSmall ? 10 : 12,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  overlayBadge: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '700',
  },
});
