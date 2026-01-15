import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/shared/ui';
import { colors, spacing, borderRadius } from '@/theme';

export function SkeletonListCard() {
  return (
    <View style={styles.skeletonListCard}>
      <Skeleton width={70} height={105} borderRadius={12} />
      <View style={styles.skeletonListInfo}>
        <Skeleton width="75%" height={18} borderRadius={4} />
        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={6} borderRadius={3} style={{ marginTop: 12 }} />
        <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonGridCard({ width }: { width: number }) {
  const height = width * 1.5;
  return (
    <View style={[styles.gridCard, { width }]}>
      <Skeleton width={width - 8} height={height} borderRadius={16} />
      <View style={{ marginTop: 10, gap: 6 }}>
        <Skeleton width="85%" height={14} borderRadius={4} />
        <Skeleton width="50%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonQueueCard() {
  return (
    <View style={styles.queueCard}>
      <View style={styles.skeletonQueueInner}>
        <Skeleton width={60} height={90} borderRadius={8} />
        <View style={styles.skeletonQueueContent}>
          <Skeleton width="60%" height={16} borderRadius={4} />
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width="35%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonListCard: {
    flexDirection: 'row',
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  skeletonListInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gridCard: {
    padding: spacing[1],
  },
  queueCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  skeletonQueueInner: {
    flexDirection: 'row',
    gap: spacing[3],
    padding: spacing[4],
  },
  skeletonQueueContent: {
    flex: 1,
    justifyContent: 'center',
  },
});
