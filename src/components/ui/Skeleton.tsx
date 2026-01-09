import { View, ViewStyle, StyleProp } from 'react-native';
import { memo } from 'react';

// Static skeleton - no animations for maximum performance

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton = memo(function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  // Static skeleton - no animation for maximum performance
  return (
    <View
      style={[
        {
          width: typeof width === 'number' ? width : undefined,
          height: typeof height === 'number' ? height : undefined,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: '#374151',
          opacity: 0.4,
        },
        typeof width === 'string' && { width: width as any },
        typeof height === 'string' && { height: height as any },
        style,
      ]}
    />
  );
});

interface SkeletonCardProps {
  width: number;
  height: number;
  showTitle?: boolean;
}

export const SkeletonCard = memo(function SkeletonCard({
  width,
  height,
  showTitle = true,
}: SkeletonCardProps) {
  return (
    <View style={{ marginRight: 12 }}>
      <Skeleton width={width} height={height} borderRadius={12} />
      {showTitle && (
        <View style={{ marginTop: 8 }}>
          <Skeleton width={width * 0.8} height={14} borderRadius={4} />
          <View style={{ marginTop: 4 }}>
            <Skeleton width={width * 0.5} height={12} borderRadius={4} />
          </View>
        </View>
      )}
    </View>
  );
});

interface SkeletonGridProps {
  count?: number;
  itemWidth: number;
  itemHeight: number;
  showTitle?: boolean;
}

export const SkeletonGrid = memo(function SkeletonGrid({
  count = 6,
  itemWidth,
  itemHeight,
  showTitle = true,
}: SkeletonGridProps) {
  // No animation - static skeleton for performance
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 }}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={{ width: '33.33%', padding: 4 }}>
          <SkeletonCard width={itemWidth} height={itemHeight} showTitle={showTitle} />
        </View>
      ))}
    </View>
  );
});

interface SkeletonRowProps {
  title?: boolean;
  cardWidth?: number;
  cardHeight?: number;
  count?: number;
  isSquare?: boolean;
}

export const SkeletonRow = memo(function SkeletonRow({
  title = true,
  cardWidth = 120,
  cardHeight = 180,
  count = 5,
  isSquare = false,
}: SkeletonRowProps) {
  const actualHeight = isSquare ? cardWidth : cardHeight;

  // No animation - static skeleton for performance
  return (
    <View style={{ marginBottom: 24 }}>
      {title && (
        <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
          <Skeleton width={140} height={20} borderRadius={4} />
        </View>
      )}
      <View style={{ flexDirection: 'row', paddingLeft: 16 }}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={index} width={cardWidth} height={actualHeight} showTitle />
        ))}
      </View>
    </View>
  );
});

interface SkeletonContinueWatchingProps {
  count?: number;
}

export const SkeletonContinueWatching = memo(function SkeletonContinueWatching({
  count = 3,
}: SkeletonContinueWatchingProps) {
  // No animation - static skeleton for performance
  return (
    <View style={{ marginBottom: 24 }}>
      <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
        <Skeleton width={160} height={20} borderRadius={4} />
      </View>
      <View style={{ flexDirection: 'row', paddingLeft: 16 }}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={{ marginRight: 12 }}>
            <Skeleton width={200} height={112} borderRadius={12} />
            <View style={{ marginTop: 8 }}>
              <Skeleton width={160} height={14} borderRadius={4} />
              <View style={{ marginTop: 6 }}>
                <Skeleton width={180} height={4} borderRadius={2} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

interface SkeletonSearchResultsProps {
  count?: number;
}

export const SkeletonSearchResults = memo(function SkeletonSearchResults({
  count = 8,
}: SkeletonSearchResultsProps) {
  // No animation - static skeleton for performance
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            marginBottom: 8,
          }}
        >
          <Skeleton width={48} height={48} borderRadius={8} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Skeleton width="70%" height={16} borderRadius={4} />
            <View style={{ marginTop: 6 }}>
              <Skeleton width="50%" height={12} borderRadius={4} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
});
