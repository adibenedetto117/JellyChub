import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo, useMemo, useCallback, useState, useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { getWatchProgress, formatEpisodeNumber, getDisplayName, getDisplayImageUrl, getDisplayYear, haptics } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import { tvConstants, isTV } from '@/utils/platform';
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
  // TV focus props
  autoFocus?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
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

// Spring config defined outside component to prevent recreation
const SPRING_CONFIG = { damping: 15, stiffness: 400 };

// Create animated pressable for TV focus support
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
  autoFocus = false,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
}: Props) {
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

  // TV focus state
  const [isFocused, setIsFocused] = useState(false);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  // Handle TV focus state changes
  useEffect(() => {
    if (isTV && isFocused) {
      scale.value = withTiming(tvConstants.focusScale, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
    } else if (isTV) {
      scale.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(0, {
        duration: tvConstants.focusDuration,
      });
    }
  }, [isFocused, scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  // Mobile press handlers (not used on TV)
  const handlePressIn = useCallback(() => {
    if (!isTV) {
      haptics.light();
      if (!reduceMotion) {
        scale.value = withSpring(0.95, SPRING_CONFIG);
      }
    }
  }, [scale, reduceMotion]);

  const handlePressOut = useCallback(() => {
    if (!reduceMotion && !isTV) {
      scale.value = withSpring(1, SPRING_CONFIG);
    }
  }, [scale, reduceMotion]);

  // TV focus handlers
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocusProp?.();
  }, [onFocusProp]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlurProp?.();
  }, [onBlurProp]);

  const { imageUrl, displayName, subtitle } = useMemo(() => {
    const imageType = variant === 'backdrop' ? 'Backdrop' : 'Primary';
    const imageTag = variant === 'backdrop'
      ? item.BackdropImageTags?.[0]
      : item.ImageTags?.Primary;

    const rawImageUrl = imageTag
      ? getImageUrl(item.Id, imageType, {
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
    if (item.Type) {
      parts.push(item.Type);
    }
    if (subtitle) {
      parts.push(subtitle);
    }
    if (hasProgress) {
      parts.push(`${Math.round(progress)}% watched`);
    }
    return parts.join(', ');
  }, [displayName, item.Type, subtitle, hasProgress, progress]);

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[posterStyles.pressable, animatedStyle]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={`Opens ${displayName}`}
      // @ts-ignore - TV-specific prop
      hasTVPreferredFocus={autoFocus}
    >
      <View
        style={[posterStyles.imageContainer, { width: dimensions.width, height: dimensions.height }]}
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

        {hasProgress && (
          <View
            style={posterStyles.progressTrack}
            accessible={false}
          >
            <View style={[posterStyles.progressFill, { width: `${progress}%` }]} />
          </View>
        )}

        {/* TV Focus ring */}
        {isTV && (
          <Animated.View
            style={[
              posterStyles.focusRing,
              { borderColor: accentColor },
              borderAnimatedStyle,
            ]}
            pointerEvents="none"
          />
        )}
      </View>

      {showTitle && (
        <View
          style={{ width: dimensions.width, marginTop: isTablet ? 10 : 8 }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <Text
            style={{
              fontSize: fontSize.sm,
              fontWeight: '500',
              color: isTV && isFocused ? '#fff' : '#fff',
            }}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {subtitle && (
            <Text
              style={{
                fontSize: fontSize.xs,
                color: isTV && isFocused ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
              }}
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

// Static styles to prevent recreation on each render
const posterStyles = StyleSheet.create({
  pressable: {
    marginRight: 12,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1', // accent color fallback
  },
  focusRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: tvConstants.focusRingWidth,
  },
});
