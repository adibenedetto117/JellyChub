import { Pressable, Text, ActivityIndicator, View, StyleSheet, ViewStyle } from 'react-native';
import { memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'link';
type ButtonSize = 'small' | 'medium' | 'large';

interface Props {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconName?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: colors.accent.primary },
  secondary: { backgroundColor: colors.surface.default },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.status.error },
  outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.accent.primary },
  link: { backgroundColor: 'transparent' },
};

const textColors: Record<ButtonVariant, string> = {
  primary: '#fff',
  secondary: '#fff',
  ghost: colors.accent.primary,
  danger: '#fff',
  outline: colors.accent.primary,
  link: colors.accent.primary,
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  small: { paddingVertical: 8, paddingHorizontal: 16 },
  medium: { paddingVertical: 12, paddingHorizontal: 24 },
  large: { paddingVertical: 16, paddingHorizontal: 32 },
};

const textSizes: Record<ButtonSize, number> = {
  small: 13,
  medium: 15,
  large: 17,
};

const iconSizes: Record<ButtonSize, number> = {
  small: 16,
  medium: 18,
  large: 22,
};

export const Button = memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  iconName,
  iconPosition = 'left',
  fullWidth = false,
  style,
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const textColor = textColors[variant];
  const iconSize = iconSizes[size];

  const renderIcon = () => {
    if (icon) return icon;
    if (iconName) {
      return <Ionicons name={iconName as any} size={iconSize} color={textColor} />;
    }
    return null;
  };

  const iconElement = renderIcon();

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size={size === 'large' ? 'small' : 'small'} />
      ) : (
        <>
          {iconPosition === 'left' && iconElement && (
            <View style={styles.iconLeft}>{iconElement}</View>
          )}
          <Text
            style={[
              styles.text,
              { color: textColor, fontSize: textSizes[size] },
              variant === 'link' && styles.linkText,
            ]}
          >
            {title}
          </Text>
          {iconPosition === 'right' && iconElement && (
            <View style={styles.iconRight}>{iconElement}</View>
          )}
        </>
      )}
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
