import { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { getImageUrl } from '@/api';
import { tvConstants } from '@/utils/platform';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  item: BaseItem;
  onPress: () => void;
  onFocus?: () => void;
  variant?: 'poster' | 'backdrop';
  autoFocus?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function FocusableCard({
  item,
  onPress,
  onFocus,
  variant = 'poster',
  autoFocus = false,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const dimensions = variant === 'poster'
    ? { width: 180, height: 270 }
    : { width: 320, height: 180 };

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
      scale.value = withTiming(tvConstants.focusScale, {
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
  }, [isFocused]);

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
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={animatedStyle}
      hasTVPreferredFocus={autoFocus}
      className="mr-4"
    >
      <View
        style={{ width: dimensions.width, height: dimensions.height }}
        className="rounded-xl overflow-hidden bg-surface"
      >
        <CachedImage
          uri={imageUrl}
          style={{ width: dimensions.width, height: dimensions.height }}
          borderRadius={12}
          fallbackText={item.Name?.charAt(0)?.toUpperCase() || '?'}
          priority="high"
        />

        <Animated.View
          style={borderStyle}
          className="absolute inset-0 border-4 border-accent rounded-xl"
        />
      </View>

      <View style={{ width: dimensions.width }} className="mt-2">
        <Text
          className={`font-medium ${isFocused ? 'text-white' : 'text-text-secondary'}`}
          numberOfLines={1}
        >
          {item.Name}
        </Text>
        {item.ProductionYear && (
          <Text className="text-text-tertiary text-sm">
            {item.ProductionYear}
          </Text>
        )}
      </View>
    </AnimatedPressable>
  );
}
