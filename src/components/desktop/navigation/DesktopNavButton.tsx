import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, Pressable, ViewStyle, TextStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores/settingsStore';

type IconName = keyof typeof Ionicons.glyphMap;

export type DesktopButtonSize = 'small' | 'medium' | 'large';

interface Props {
  onPress: () => void;
  icon?: IconName;
  iconFilled?: IconName;
  label?: string;
  size?: DesktopButtonSize;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  active?: boolean;
  isExpanded?: boolean;
  style?: ViewStyle;
  labelStyle?: TextStyle;
  accessibilityLabel?: string;
  tabIndex?: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SIZE_CONFIG = {
  small: {
    height: 36,
    iconSize: 18,
    fontSize: 13,
    padding: 8,
    borderRadius: 8,
  },
  medium: {
    height: 44,
    iconSize: 22,
    fontSize: 14,
    padding: 12,
    borderRadius: 10,
  },
  large: {
    height: 52,
    iconSize: 26,
    fontSize: 16,
    padding: 14,
    borderRadius: 12,
  },
} as const;

const ANIMATION_DURATION = 150;

export function DesktopNavButton({
  onPress,
  icon,
  iconFilled,
  label,
  size = 'medium',
  onFocus,
  onBlur,
  disabled = false,
  active = false,
  isExpanded = true,
  style,
  labelStyle,
  accessibilityLabel,
  tabIndex = 0,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const buttonRef = useRef<View>(null);

  const backgroundOpacity = useSharedValue(active ? 1 : 0);
  const scale = useSharedValue(1);

  const config = SIZE_CONFIG[size];

  useEffect(() => {
    if (active) {
      backgroundOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
    } else if (isHovered || isFocused) {
      backgroundOpacity.value = withTiming(0.15, { duration: ANIMATION_DURATION });
    } else {
      backgroundOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
    }
  }, [active, isHovered, isFocused, backgroundOpacity]);

  const handleHoverIn = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleHoverOut = useCallback(() => {
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

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.97, { duration: 100 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 100 });
  }, [scale]);

  const handleKeyDown = useCallback((e: any) => {
    if (e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ' ') {
      e.preventDefault();
      onPress();
    }
  }, [onPress]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
    backgroundColor: accentColor,
  }));

  const isHighlighted = active || isHovered || isFocused;
  const currentIcon = isHighlighted && iconFilled ? iconFilled : icon;
  const iconColor = disabled
    ? '#666666'
    : isHighlighted
    ? '#FFFFFF'
    : 'rgba(255,255,255,0.7)';
  const textColor = disabled
    ? '#666666'
    : isHighlighted
    ? '#FFFFFF'
    : 'rgba(255,255,255,0.7)';

  return (
    <AnimatedPressable
      ref={buttonRef}
      onPress={disabled ? undefined : onPress}
      onHoverIn={handleHoverIn}
      onHoverOut={handleHoverOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{
        disabled,
        selected: active,
      }}
      style={[animatedContainerStyle, styles.button, style]}
      // @ts-ignore - tabIndex is supported on web
      tabIndex={disabled ? -1 : tabIndex}
    >
      <View
        style={[
          styles.innerContainer,
          {
            height: config.height,
            paddingHorizontal: config.padding,
            borderRadius: config.borderRadius,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.background,
            { borderRadius: config.borderRadius },
            animatedBackgroundStyle,
          ]}
        />

        {currentIcon && (
          <View style={styles.iconContainer}>
            <Ionicons
              name={currentIcon}
              size={config.iconSize}
              color={iconColor}
            />
          </View>
        )}

        {isExpanded && label && (
          <Text
            style={[
              styles.label,
              {
                fontSize: config.fontSize,
                color: textColor,
                fontWeight: active ? '600' : '500',
                marginLeft: currentIcon ? 12 : 0,
              },
              labelStyle,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}

        {isFocused && (
          <View
            style={[
              styles.focusRing,
              {
                borderRadius: config.borderRadius,
                borderColor: accentColor,
              },
            ]}
          />
        )}
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginBottom: 4,
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    flex: 1,
  },
  focusRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
