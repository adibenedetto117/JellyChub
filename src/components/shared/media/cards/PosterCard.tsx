import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { getWatchProgress, formatEpisodeNumber, getDisplayName, getDisplayImageUrl, getDisplayYear } from '@/utils';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import { tvConstants, isTV } from '@/utils/platform';
import { getScaledSizes, type CardVariant, type CardSize } from './cardSizes';
import { ProgressBar } from './ProgressBar';
import { TVFocusRing, TVShadowGlow } from './TVFocusRing';
import type { BaseItem } from '@/types/jellyfin';

export interface PosterCardProps {
  item: BaseItem;
  onPress: () => void;
  variant?: CardVariant;
  showProgress?: boolean;
  showTitle?: boolean;
  size?: CardSize;
  customWidth?: number;
  customHeight?: number;
  badge?: string;
  badgeColor?: string;
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const PosterCard = memo(function PosterCard({
  item,
  onPress,
  variant = 'poster',
  showProgress = true,
  showTitle = true,
  size = 'medium',
  customWidth,
  customHeight,
  badge,
  badgeColor,
  autoFocus = false,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
}: PosterCardProps) {
  const { isTablet, isTV: isResponsiveTV, fontSize } = useResponsive();
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const accentColor = useSettingsStore((s) => s.accentColor);

  const sizes = useMemo(() => getScaledSizes(isTablet, isResponsiveTV), [isTablet, isResponsiveTV]);
  const baseDimensions = sizes[variant][size];
  const dimensions = {
    width: customWidth ?? baseDimensions.width,
    height: customHeight ?? baseDimensions.height,
  };

  const progress = getWatchProgress(item);
  const hasProgress = showProgress && progress > 0 && progress < 100;
  const [isFocused, setIsFocused] = useState(false);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isTV && isFocused) {
      scale.value = withTiming(tvConstants.focusScale, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
      shadowOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
    } else if (isTV) {
      scale.value = withTiming(1, { duration: tvConstants.focusDuration });
      borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
      shadowOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
    }
  }, [isFocused, scale, borderOpacity, shadowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    if (!isTV && !reduceMotion) {
      scale.value = withTiming(0.97, { duration: 100 });
    }
  }, [scale, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion && !isTV) {
      scale.value = withTiming(1, { duration: 100 });
    }
  }, [scale, reduceMotion]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusProp?.();
  }, [onFocusProp]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlurProp?.();
  }, [onBlurProp]);

  const { imageUrl, displayName, subtitle } = useMemo(() => {
    let imageType: 'Backdrop' | 'Primary' = variant === 'backdrop' ? 'Backdrop' : 'Primary';
    let imageTag: string | undefined;
    let imageItemId = item.Id;

    if (variant === 'backdrop') {
      if (item.BackdropImageTags?.[0]) {
        imageTag = item.BackdropImageTags[0];
      } else if ((item as any).ParentBackdropImageTags?.[0] && (item as any).ParentBackdropItemId) {
        imageTag = (item as any).ParentBackdropImageTags[0];
        imageItemId = (item as any).ParentBackdropItemId;
      } else if ((item as any).SeriesId && (item as any).ParentBackdropImageTags?.[0]) {
        imageTag = (item as any).ParentBackdropImageTags[0];
        imageItemId = (item as any).SeriesId;
      } else if (item.ImageTags?.Primary) {
        imageType = 'Primary';
        imageTag = item.ImageTags.Primary;
      }
    } else {
      imageTag = item.ImageTags?.Primary;
    }

    const rawImageUrl = imageTag
      ? getImageUrl(imageItemId, imageType, {
          maxWidth: dimensions.width * 2,
          maxHeight: dimensions.height * 2,
          tag: imageTag,
        })
      : null;

    return {
      imageUrl: getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, imageType),
      displayName: getDisplayName(item, hideMedia),
      subtitle: item.Type === 'Episode'
        ? formatEpisodeNumber(
            (item as { ParentIndexNumber?: number }).ParentIndexNumber,
            (item as { IndexNumber?: number }).IndexNumber
          )
        : getDisplayYear(item.ProductionYear, hideMedia)?.toString(),
    };
  }, [item.Id, item.ImageTags, item.BackdropImageTags, item.Name, item.Type, item.ProductionYear, variant, dimensions.width, dimensions.height, hideMedia]);

  const accessibilityLabel = useMemo(() => {
    const parts = [displayName];
    if (item.Type) parts.push(item.Type);
    if (subtitle) parts.push(subtitle);
    if (hasProgress) parts.push(`${Math.round(progress)}% watched`);
    return parts.join(', ');
  }, [displayName, item.Type, subtitle, hasProgress, progress]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.pressable, animatedStyle]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens ${displayName}`}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={autoFocus}
    >
      {isTV && (
        <TVShadowGlow
          shadowOpacity={shadowOpacity}
          width={dimensions.width}
          height={dimensions.height}
          accentColor={accentColor}
        />
      )}

      <View
        style={[styles.imageContainer, { width: dimensions.width, height: dimensions.height }]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <CachedImage
          uri={imageUrl}
          style={{ width: dimensions.width, height: dimensions.height }}
          borderRadius={12}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority={size === 'large' ? 'high' : 'normal'}
        />

        {hasProgress && <ProgressBar progress={progress} color={accentColor} />}

        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor || accentColor }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}

        {isTV && <TVFocusRing borderOpacity={borderOpacity} accentColor={accentColor} />}
      </View>

      {showTitle && (
        <View
          style={{ width: dimensions.width, marginTop: isTablet ? 10 : 8 }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            style={[styles.title, { fontSize: fontSize.sm }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { fontSize: fontSize.xs, color: isTV && isFocused ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)' }
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  pressable: {
    marginRight: 12,
    alignItems: 'center',
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  title: {
    fontWeight: '500',
    color: '#fff',
  },
  subtitle: {
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
});
