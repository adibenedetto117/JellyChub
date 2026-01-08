import { useState, useCallback } from 'react';
import { View, Text, Pressable, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { tvConstants } from '@/utils/platform';
import { useSettingsStore } from '@/stores/settingsStore';

type IconName = keyof typeof Ionicons.glyphMap;

export type TVButtonSize = 'small' | 'medium' | 'large';

interface Props {
  /** Handler called when button is pressed */
  onPress: () => void;
  /** Optional icon from Ionicons */
  icon?: IconName;
  /** Optional text label */
  label?: string;
  /** Button size variant */
  size?: TVButtonSize;
  /** If true, this button receives initial focus */
  autoFocus?: boolean;
  /** Unique identifier for focus management */
  focusKey?: string;
  /** Called when button receives focus */
  onFocus?: () => void;
  /** Called when button loses focus */
  onBlur?: () => void;
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is currently active/selected */
  active?: boolean;
  /** Additional container styles */
  style?: ViewStyle;
  /** Additional label styles */
  labelStyle?: TextStyle;
  /** Accessibility label for screen readers */
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Size configurations for TV buttons
 */
const SIZE_CONFIG = {
  small: {
    size: tvConstants.smallButtonSize,
    iconSize: 24,
    fontSize: 14,
    padding: 12,
  },
  medium: {
    size: tvConstants.seekButtonSize,
    iconSize: 32,
    fontSize: 16,
    padding: 16,
  },
  large: {
    size: tvConstants.controlButtonSize,
    iconSize: 40,
    fontSize: 18,
    padding: 20,
  },
} as const;

/**
 * A button component optimized for TV remote navigation.
 * Features visible focus states, proper sizing for 10-foot UI,
 * and scale animation on focus.
 *
 * @example
 * ```tsx
 * <TVFocusableButton
 *   icon="play"
 *   onPress={handlePlay}
 *   size="large"
 *   autoFocus
 *   accessibilityLabel="Play video"
 * />
 *
 * <TVFocusableButton
 *   label="Settings"
 *   icon="settings-outline"
 *   onPress={openSettings}
 *   size="medium"
 * />
 * ```
 */
export function TVFocusableButton({
  onPress,
  icon,
  label,
  size = 'medium',
  autoFocus = false,
  focusKey,
  onFocus,
  onBlur,
  disabled = false,
  active = false,
  style,
  labelStyle,
  accessibilityLabel,
}: Props) {
  const [isFocused, setIsFocused] = useState(false);
  const accentColor = useSettingsStore((s) => s.accentColor);

  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);
  const backgroundOpacity = useSharedValue(0);

  const config = SIZE_CONFIG[size];

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    scale.value = withTiming(tvConstants.focusScale, {
      duration: tvConstants.focusDuration,
    });
    borderOpacity.value = withTiming(1, {
      duration: tvConstants.focusDuration,
    });
    backgroundOpacity.value = withTiming(0.2, {
      duration: tvConstants.focusDuration,
    });
    onFocus?.();
  }, [onFocus, scale, borderOpacity, backgroundOpacity]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    scale.value = withTiming(1, {
      duration: tvConstants.focusDuration,
    });
    borderOpacity.value = withTiming(0, {
      duration: tvConstants.focusDuration,
    });
    backgroundOpacity.value = withTiming(0, {
      duration: tvConstants.focusDuration,
    });
    onBlur?.();
  }, [onBlur, scale, borderOpacity, backgroundOpacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  // Determine colors based on state
  const iconColor = disabled
    ? '#666666'
    : isFocused || active
    ? '#FFFFFF'
    : '#CCCCCC';

  const textColor = disabled
    ? '#666666'
    : isFocused || active
    ? '#FFFFFF'
    : '#AAAAAA';

  // Content layout: icon only, label only, or both
  const hasIcon = !!icon;
  const hasLabel = !!label;
  const isIconOnly = hasIcon && !hasLabel;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={autoFocus}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{
        disabled,
        selected: active,
      }}
      style={[animatedContainerStyle, style]}
    >
      <View
        style={[
          {
            minWidth: isIconOnly ? config.size : undefined,
            minHeight: config.size,
            paddingHorizontal: hasLabel ? config.padding : 0,
            paddingVertical: isIconOnly ? 0 : config.padding / 2,
            borderRadius: isIconOnly ? config.size / 2 : 12,
          },
        ]}
        className="items-center justify-center flex-row bg-surface/50 overflow-hidden"
      >
        {/* Focus background highlight */}
        <Animated.View
          style={[
            animatedBackgroundStyle,
            {
              ...StyleSheet.absoluteFillObject,
              backgroundColor: accentColor,
            },
          ]}
        />

        {/* Content */}
        {hasIcon && (
          <Ionicons
            name={icon}
            size={config.iconSize}
            color={iconColor}
            style={hasLabel ? { marginRight: 8 } : undefined}
          />
        )}
        {hasLabel && (
          <Text
            style={[
              {
                fontSize: config.fontSize,
                fontWeight: '600',
                color: textColor,
              },
              labelStyle,
            ]}
          >
            {label}
          </Text>
        )}

        {/* Focus ring border */}
        <Animated.View
          style={[
            animatedBorderStyle,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderWidth: tvConstants.focusRingWidth,
              borderColor: accentColor,
              borderRadius: isIconOnly ? config.size / 2 : 12,
            },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
}
