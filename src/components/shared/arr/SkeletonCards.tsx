import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/shared/ui';
import { colors, spacing, borderRadius } from '@/theme';

export function SkeletonListCard() {
  return (
    <View style={styles.listCard}>
      <Skeleton width={70} height={105} borderRadius={borderRadius.lg} />
      <View style={styles.listInfo}>
        <Skeleton width="70%" height={18} borderRadius={4} />
        <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

interface SkeletonGridCardProps {
  width: number;
}

export function SkeletonGridCard({ width }: SkeletonGridCardProps) {
  return (
    <View style={{ width }}>
      <Skeleton width={width} height={width * 1.5} borderRadius={borderRadius.lg} />
      <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
      <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
    </View>
  );
}

export function SkeletonQueueCard() {
  return (
    <View style={styles.queueCard}>
      <View style={styles.queueInner}>
        <Skeleton width={50} height={75} borderRadius={borderRadius.md} />
        <View style={styles.queueContent}>
          <Skeleton width="60%" height={16} borderRadius={4} />
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width="80%" height={8} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listCard: {
    flexDirection: 'row',
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  queueCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  queueInner: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  queueContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
