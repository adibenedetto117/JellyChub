import { useEffect, useState, useMemo, forwardRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { tvConstants } from '@/utils/platform';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import type { BaseItem } from '@/types/jellyfin';

const TV_ACCENT_GOLD = '#D4A84B';

interface Props {
  item: BaseItem;
  onPress: () => void;
  onFocus?: () => void;
  variant?: 'poster' | 'backdrop';
  autoFocus?: boolean;
  cardWidth?: number;
  cardHeight?: number;
  nextFocusUp?: number;
  nextFocusDown?: number;
  nextFocusLeft?: number;
  nextFocusRight?: number;
}

export const FocusableCard = forwardRef<View, Props>(function FocusableCard({
  item,
  onPress,
  onFocus,
  variant = 'poster',
  autoFocus = false,
  cardWidth,
  cardHeight,
  nextFocusUp,
  nextFocusDown,
  nextFocusLeft,
  nextFocusRight,
}, ref) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const dimensions = useMemo(() => {
    if (cardWidth && cardHeight) {
      return { width: cardWidth, height: cardHeight };
    }
    return variant === 'poster'
      ? { width: 200, height: 300 }
      : { width: 380, height: 214 };
  }, [variant, cardWidth, cardHeight]);

  const imageTag = variant === 'backdrop'
    ? item.BackdropImageTags?.[0]
    : item.ImageTags?.Primary;

  const imageType = variant === 'backdrop' ? 'Backdrop' : 'Primary';

  const imageUrl = imageTag
    ? getImageUrl(item.Id, imageType, {
        maxWidth: dimensions.width * 2,
        maxHeight: dimensions.height * 2,
        tag: imageTag,
      })
    : null;

  useEffect(() => {
    if (isFocused) {
      scale.value = withTiming(1.04, {
        duration: tvConstants.focusDuration,
      });
      borderOpacity.value = withTiming(1, {
        duration: tvConstants.focusDuration,
      });
    } else {
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

  const borderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        ref={ref}
        onPress={onPress}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.pressable}
        hasTVPreferredFocus={autoFocus}
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
        nextFocusLeft={nextFocusLeft}
        nextFocusRight={nextFocusRight}
      >
      <View
        style={[
          styles.cardContainer,
          { width: dimensions.width, height: dimensions.height },
        ]}
      >
        <CachedImage
          uri={imageUrl}
          style={{ width: dimensions.width, height: dimensions.height }}
          borderRadius={6}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority="high"
        />

        <Animated.View
          style={[
            styles.focusBorder,
            { borderColor: TV_ACCENT_GOLD },
            borderStyle,
          ]}
        />
      </View>

      <View style={[styles.textContainer, { width: dimensions.width }]}>
        <Text
          style={[
            styles.title,
            isFocused && styles.titleFocused,
          ]}
          numberOfLines={1}
        >
          {item.Name}
        </Text>
        {item.ProductionYear && (
          <Text style={styles.year}>
            {item.ProductionYear}
          </Text>
        )}
      </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  pressable: {
    marginRight: 20,
  },
  cardContainer: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#0c0c0c',
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    borderWidth: 3,
  },
  textContainer: {
    marginTop: 10,
  },
  title: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  titleFocused: {
    color: '#fff',
  },
  year: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
});
