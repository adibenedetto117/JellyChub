import { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { desktopConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks/useResponsive';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getWatchProgress, getDisplayName, getDisplayImageUrl, getDisplayYear } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  item: BaseItem;
  onPress: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  variant?: 'poster' | 'backdrop' | 'square';
  showProgress?: boolean;
  showTitle?: boolean;
  autoFocus?: boolean;
  tabIndex?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useDimensions(variant: 'poster' | 'backdrop' | 'square') {
  const responsive = useResponsive();
  return useMemo(() => {
    const baseWidth = responsive.horizontalItemWidth;
    switch (variant) {
      case 'poster':
        return { width: baseWidth, height: baseWidth * 1.5 };
      case 'backdrop':
        return { width: baseWidth * 1.75, height: baseWidth * 0.98 };
      case 'square':
        return { width: baseWidth, height: baseWidth };
      default:
        return { width: baseWidth, height: baseWidth * 1.5 };
    }
  }, [variant, responsive.horizontalItemWidth]);
}

export const DesktopPosterCard = memo(function DesktopPosterCard({
  item,
  onPress,
  onFocus,
  onBlur,
  variant = 'poster',
  showProgress = true,
  showTitle = true,
  autoFocus = false,
  tabIndex = 0,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const dimensions = useDimensions(variant);
  const progress = useMemo(() => getWatchProgress(item), [item.UserData, item.RunTimeTicks]);
  const hasProgress = showProgress && progress > 0 && progress < 100;

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
        ? `S${(item as any).ParentIndexNumber || '?'}E${(item as any).IndexNumber || '?'}`
        : getDisplayYear(item.ProductionYear, hideMedia)?.toString(),
    };
  }, [item.Id, item.ImageTags, item.BackdropImageTags, item.Name, item.Type, item.ProductionYear, variant, dimensions.width, dimensions.height, hideMedia]);

  useEffect(() => {
    const isActive = isHovered || isFocused;
    if (isActive) {
      scale.value = withTiming(desktopConstants.hoverScale, {
        duration: desktopConstants.hoverDuration,
      });
      borderOpacity.value = withTiming(1, {
        duration: desktopConstants.hoverDuration,
      });
    } else {
      scale.value = withTiming(1, {
        duration: desktopConstants.hoverDuration,
      });
      borderOpacity.value = withTiming(0, {
        duration: desktopConstants.hoverDuration,
      });
    }
  }, [isHovered, isFocused, scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const handleKeyDown = useCallback((e: any) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress();
    }
  }, [onPress]);

  const isActive = isHovered || isFocused;

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      // @ts-ignore - web props
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
      style={[styles.pressable, animatedStyle]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${displayName}${subtitle ? `, ${subtitle}` : ''}`}
      // @ts-ignore - web props
      tabIndex={tabIndex}
      autoFocus={autoFocus}
    >
      <View
        style={[
          styles.imageContainer,
          { width: dimensions.width, height: dimensions.height },
        ]}
      >
        <CachedImage
          uri={imageUrl}
          style={{ width: dimensions.width, height: dimensions.height }}
          borderRadius={8}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority={isActive ? 'high' : 'normal'}
        />

        {hasProgress && (
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: accentColor },
              ]}
            />
          </View>
        )}

        <Animated.View
          style={[
            styles.focusBorder,
            { borderColor: accentColor },
            borderStyle,
          ]}
        />
      </View>

      {showTitle && (
        <View style={[styles.textContainer, { width: dimensions.width }]}>
          <Text
            style={[
              styles.title,
              { color: isActive ? '#fff' : 'rgba(255,255,255,0.9)' },
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' },
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
    cursor: 'pointer',
  },
  imageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  progressFill: {
    height: '100%',
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 2,
  },
  textContainer: {
    marginTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
});
