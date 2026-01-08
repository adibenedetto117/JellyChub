import { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores';
import { CachedImage } from '@/components/ui/CachedImage';
import { getWatchProgress, getDisplayName, getDisplayYear } from '@/utils';
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
}

const DIMENSIONS = {
  poster: { width: 180, height: 270 },
  backdrop: { width: 320, height: 180 },
  square: { width: 180, height: 180 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TVPosterCard({
  item,
  onPress,
  onFocus,
  onBlur,
  variant = 'poster',
  showProgress = true,
  showTitle = true,
  autoFocus = false,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  const shadowOpacity = useSharedValue(0);

  const dimensions = DIMENSIONS[variant];
  const progress = getWatchProgress(item);
  const hasProgress = showProgress && progress > 0 && progress < 100;

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

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(tvConstants.focusScale, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
      shadowOpacity.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
    } else {
      scale.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(0, {
        duration: tvConstants.focusDuration,
      });
      shadowOpacity.value = withTiming(0, {
        duration: tvConstants.focusDuration,
      });
    }
  }, [isFocused, scale, borderOpacity, shadowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: shadowOpacity.value,
  }));

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  const displayName = getDisplayName(item, hideMedia);
  const subtitle = item.Type === 'Episode'
    ? `S${(item as any).ParentIndexNumber || '?'}E${(item as any).IndexNumber || '?'}`
    : getDisplayYear(item.ProductionYear, hideMedia)?.toString();

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[styles.pressable, animatedStyle]}
      hasTVPreferredFocus={autoFocus}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${displayName}${subtitle ? `, ${subtitle}` : ''}`}
    >
      <Animated.View
        style={[
          styles.shadowContainer,
          {
            width: dimensions.width + 20,
            height: dimensions.height + 20,
            shadowColor: accentColor,
          },
          shadowStyle,
        ]}
      />

      <View
        style={[
          styles.imageContainer,
          { width: dimensions.width, height: dimensions.height },
        ]}
      >
        <CachedImage
          uri={imageUrl}
          style={{ width: dimensions.width, height: dimensions.height }}
          borderRadius={12}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority="high"
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
              { color: isFocused ? '#fff' : 'rgba(255,255,255,0.9)' },
            ]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: isFocused ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.5)' },
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
}

const styles = StyleSheet.create({
  pressable: {
    marginRight: 16,
    alignItems: 'center',
  },
  shadowContainer: {
    position: 'absolute',
    top: -10,
    left: -10,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
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
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
    borderWidth: tvConstants.focusRingWidth,
  },
  textContainer: {
    marginTop: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
});
