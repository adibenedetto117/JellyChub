import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/shared/ui';
import { colors, spacing, borderRadius } from '@/theme';

interface MovieGridSkeletonProps {
  cardWidth: number;
  numColumns: number;
  count?: number;
}

export function MovieGridSkeleton({ cardWidth, numColumns, count = 9 }: MovieGridSkeletonProps) {
  const textAreaHeight = 52;
  const cardHeight = cardWidth * 1.5 + textAreaHeight;

  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width: cardWidth,
            height: cardHeight,
            marginRight: i % numColumns < numColumns - 1 ? spacing[2] : 0,
            marginBottom: spacing[3]
          }}
        >
          <Skeleton width={cardWidth} height={cardWidth * 1.5} borderRadius={12} />
          <Skeleton width="80%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      ))}
    </View>
  );
}

interface QueueListSkeletonProps {
  count?: number;
}

export function QueueListSkeleton({ count = 4 }: QueueListSkeletonProps) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonQueueCard}>
          <Skeleton width="70%" height={16} borderRadius={4} />
          <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          <Skeleton width="100%" height={6} borderRadius={3} style={{ marginTop: 12 }} />
        </View>
      ))}
    </View>
  );
}

interface SearchListSkeletonProps {
  count?: number;
}

export function SearchListSkeleton({ count = 5 }: SearchListSkeletonProps) {
  return (
    <View style={styles.skeletonList}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skeletonSearchCard}>
          <Skeleton width={70} height={105} borderRadius={8} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Skeleton width="80%" height={14} borderRadius={4} />
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            <Skeleton width="100%" height={10} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
  },
  skeletonList: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  skeletonQueueCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  skeletonSearchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
});
