import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

interface Props {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const Button = memo(function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
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

  const variants = {
    primary: 'bg-accent',
    secondary: 'bg-surface',
    ghost: 'bg-transparent',
  };

  const textVariants = {
    primary: 'text-white',
    secondary: 'text-white',
    ghost: 'text-accent',
  };

  const sizes = {
    small: 'py-2 px-4',
    medium: 'py-3 px-6',
    large: 'py-4 px-8',
  };

  const textSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg',
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={animatedStyle}
      className={`
        rounded-xl items-center justify-center flex-row
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50' : ''}
      `}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : (
        <>
          {icon && <View className="mr-2">{icon}</View>}
          <Text className={`font-semibold ${textVariants[variant]} ${textSizes[size]}`}>
            {title}
          </Text>
        </>
      )}
    </AnimatedPressable>
  );
});
