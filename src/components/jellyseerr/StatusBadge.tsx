import { View, Text, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { RequestStatus, MediaStatus } from '@/types/jellyseerr';
import { REQUEST_STATUS, MEDIA_STATUS } from '@/types/jellyseerr';

interface Props {
  status: RequestStatus | MediaStatus;
  type: 'request' | 'media';
  size?: 'small' | 'medium';
  variant?: 'default' | 'overlay'; // overlay for use on images
  mediaType?: 'movie' | 'tv'; // Used to determine if "Partial" should show as "Available" for movies
}

const requestStatusConfig: Record<RequestStatus, { label: string; color: string; bgColor: string; solidBg: string; icon: string }> = {
  [REQUEST_STATUS.PENDING]: { label: 'Pending', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)', solidBg: '#78350f', icon: 'time-outline' },
  [REQUEST_STATUS.APPROVED]: { label: 'Approved', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)', solidBg: '#1e3a8a', icon: 'checkmark-circle-outline' },
  [REQUEST_STATUS.DECLINED]: { label: 'Declined', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', solidBg: '#7f1d1d', icon: 'close-circle-outline' },
  [REQUEST_STATUS.AVAILABLE]: { label: 'Available', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', solidBg: '#14532d', icon: 'checkmark-done-outline' },
  [REQUEST_STATUS.PARTIALLY_AVAILABLE]: { label: 'Partial', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', solidBg: '#7c2d12', icon: 'pie-chart-outline' },
};

const mediaStatusConfig: Record<MediaStatus, { label: string; color: string; bgColor: string; solidBg: string; icon: string }> = {
  [MEDIA_STATUS.UNKNOWN]: { label: '', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)', solidBg: '#374151', icon: '' },
  [MEDIA_STATUS.PENDING]: { label: 'Requested', color: '#fbbf24', bgColor: 'rgba(251, 191, 36, 0.15)', solidBg: '#78350f', icon: 'time-outline' },
  [MEDIA_STATUS.PROCESSING]: { label: 'Processing', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.15)', solidBg: '#4c1d95', icon: 'sync-outline' },
  [MEDIA_STATUS.PARTIALLY_AVAILABLE]: { label: 'Partial', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.15)', solidBg: '#7c2d12', icon: 'pie-chart-outline' },
  [MEDIA_STATUS.AVAILABLE]: { label: 'Available', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.15)', solidBg: '#14532d', icon: 'checkmark-done-outline' },
};

export const StatusBadge = memo(function StatusBadge({ status, type, size = 'small', variant = 'default', mediaType }: Props) {
  let config = type === 'request'
    ? requestStatusConfig[status as RequestStatus]
    : mediaStatusConfig[status as MediaStatus];

  if (!config || !config.label) return null;

  // For movies, show "Available" instead of "Partial" since partial only makes sense for TV shows
  const isPartialStatus = (type === 'request' && status === REQUEST_STATUS.PARTIALLY_AVAILABLE) ||
    (type === 'media' && status === MEDIA_STATUS.PARTIALLY_AVAILABLE);

  if (isPartialStatus && mediaType === 'movie') {
    // Use Available config instead
    config = type === 'request'
      ? requestStatusConfig[REQUEST_STATUS.AVAILABLE]
      : mediaStatusConfig[MEDIA_STATUS.AVAILABLE];
  }

  const isSmall = size === 'small';
  const isOverlay = variant === 'overlay';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: isOverlay ? config.solidBg : config.bgColor,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 3 : 5,
        },
      ]}
    >
      {isOverlay && config.icon && (
        <Ionicons name={config.icon as any} size={isSmall ? 10 : 12} color={config.color} style={{ marginRight: 3 }} />
      )}
      <Text
        style={{
          color: config.color,
          fontWeight: '600',
          fontSize: isSmall ? 10 : 12,
        }}
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
    borderRadius: 6,
  },
});
