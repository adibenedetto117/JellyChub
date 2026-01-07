import { View, Text, Pressable } from 'react-native';
import { memo, useMemo, useCallback } from 'react';
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { getWatchProgress, formatEpisodeNumber } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  item: BaseItem;
  onPress: () => void;
  variant?: 'poster' | 'square' | 'backdrop';
  showProgress?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  customWidth?: number;
  customHeight?: number;
}

// Base sizes that get scaled by device type
const baseSizes = {
  poster: {
    small: { width: 100, height: 150 },
    medium: { width: 130, height: 195 },
    large: { width: 160, height: 240 },
  },
  square: {
    small: { width: 100, height: 100 },
    medium: { width: 130, height: 130 },
    large: { width: 160, height: 160 },
  },
  backdrop: {
    small: { width: 180, height: 101 },
    medium: { width: 240, height: 135 },
    large: { width: 320, height: 180 },
  },
};

function getScaledSizes(isTablet: boolean, isTV: boolean) {
  const scale = isTV ? 1.4 : isTablet ? 1.2 : 1;
  const result: typeof baseSizes = { poster: {}, square: {}, backdrop: {} } as any;

  for (const variant of Object.keys(baseSizes) as Array<keyof typeof baseSizes>) {
    for (const size of Object.keys(baseSizes[variant]) as Array<'small' | 'medium' | 'large'>) {
      result[variant][size] = {
        width: Math.round(baseSizes[variant][size].width * scale),
        height: Math.round(baseSizes[variant][size].height * scale),
      };
    }
  }
  return result;
}

const springConfig = { damping: 15, stiffness: 400 };

export const PosterCard = memo(function PosterCard({
  item,
  onPress,
  variant = 'poster',
  showProgress = true,
  showTitle = true,
  size = 'medium',
  customWidth,
  customHeight,
}: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const sizes = useMemo(() => getScaledSizes(isTablet, isTV), [isTablet, isTV]);
  const baseDimensions = sizes[variant][size];
  const dimensions = {
    width: customWidth ?? baseDimensions.width,
    height: customHeight ?? baseDimensions.height,
  };
  const progress = getWatchProgress(item);
  const hasProgress = showProgress && progress > 0 && progress < 100;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, springConfig);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, springConfig);
  }, [scale]);

  const imageType = variant === 'backdrop' ? 'Backdrop' : 'Primary';
  const imageTag = variant === 'backdrop'
    ? item.BackdropImageTags?.[0]
    : item.ImageTags?.Primary;

  const imageUrl = imageTag
    ? getImageUrl(item.Id, imageType, {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: imageTag,
      })
    : null;

  const subtitle = item.Type === 'Episode'
    ? formatEpisodeNumber(
        (item as { ParentIndexNumber?: number }).ParentIndexNumber,
        (item as { IndexNumber?: number }).IndexNumber
      )
    : item.ProductionYear?.toString();

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} className="mr-3">
      <Animated.View entering={FadeIn.duration(150)} style={animatedStyle}>
        <View
          className="rounded-xl overflow-hidden bg-surface"
          style={{ width: dimensions.width, height: dimensions.height }}
        >
          <CachedImage
            uri={imageUrl}
            style={{ width: dimensions.width, height: dimensions.height }}
            borderRadius={12}
            fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
            priority={size === 'large' ? 'high' : 'normal'}
          />

          {hasProgress && (
            <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
              <View
                className="h-full bg-accent"
                style={{ width: `${progress}%` }}
              />
            </View>
          )}
        </View>

        {showTitle && (
          <View style={{ width: dimensions.width, marginTop: isTablet ? 10 : 8 }}>
            <Text
              style={{ fontSize: fontSize.sm, fontWeight: '500', color: '#fff' }}
              numberOfLines={1}
            >
              {item.Name}
            </Text>
            {subtitle && (
              <Text style={{ fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)' }} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});
