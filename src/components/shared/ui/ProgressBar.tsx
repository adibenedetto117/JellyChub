import { memo, useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { colors } from '@/theme';

type ProgressBarSize = 'small' | 'medium' | 'large';
type ProgressBarVariant = 'default' | 'success' | 'warning' | 'error' | 'gradient';

interface ProgressBarProps {
  progress: number;
  size?: ProgressBarSize;
  variant?: ProgressBarVariant;
  showLabel?: boolean;
  labelPosition?: 'inside' | 'right' | 'top';
  animated?: boolean;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
}

const sizeConfig: Record<ProgressBarSize, { height: number; borderRadius: number; fontSize: number }> = {
  small: { height: 4, borderRadius: 2, fontSize: 10 },
  medium: { height: 8, borderRadius: 4, fontSize: 12 },
  large: { height: 12, borderRadius: 6, fontSize: 14 },
};

const variantColors: Record<ProgressBarVariant, string> = {
  default: colors.accent.primary,
  success: colors.status.success,
  warning: colors.status.warning,
  error: colors.status.error,
  gradient: colors.accent.primary,
};

export const ProgressBar = memo(function ProgressBar({
  progress,
  size = 'medium',
  variant = 'default',
  showLabel = false,
  labelPosition = 'right',
  animated = true,
  color,
  trackColor = colors.surface.elevated,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const animatedProgress = useSharedValue(0);
  const config = sizeConfig[size];
  const progressColor = color || variantColors[variant];

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(clampedProgress, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated, animatedProgress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const renderLabel = () => {
    if (!showLabel) return null;
    return (
      <Text style={[styles.label, { fontSize: config.fontSize }]}>
        {Math.round(clampedProgress)}%
      </Text>
    );
  };

  const trackStyle: ViewStyle = {
    height: config.height,
    borderRadius: config.borderRadius,
    backgroundColor: trackColor,
  };

  const barStyle: ViewStyle = {
    height: '100%',
    borderRadius: config.borderRadius,
    backgroundColor: progressColor,
  };

  if (labelPosition === 'top') {
    return (
      <View style={style}>
        <View style={styles.topLabelContainer}>
          {renderLabel()}
        </View>
        <View style={trackStyle}>
          <Animated.View style={[barStyle, progressStyle]} />
        </View>
      </View>
    );
  }

  if (labelPosition === 'inside' && size === 'large') {
    return (
      <View style={[trackStyle, styles.insideContainer, style]}>
        <Animated.View style={[barStyle, progressStyle]} />
        <View style={styles.insideLabelContainer}>
          {renderLabel()}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[trackStyle, styles.track]}>
        <Animated.View style={[barStyle, progressStyle]} />
      </View>
      {showLabel && labelPosition === 'right' && (
        <View style={styles.rightLabelContainer}>
          {renderLabel()}
        </View>
      )}
    </View>
  );
});

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  variant?: ProgressBarVariant;
  showLabel?: boolean;
  animated?: boolean;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
}

export const CircularProgress = memo(function CircularProgress({
  progress,
  size = 48,
  strokeWidth = 4,
  variant = 'default',
  showLabel = false,
  animated = true,
  color,
  trackColor = colors.surface.elevated,
  style,
}: CircularProgressProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const animatedProgress = useSharedValue(0);
  const progressColor = color || variantColors[variant];


  useEffect(() => {
    if (animated) {
      animatedProgress.value = withSpring(clampedProgress, { damping: 15 });
    } else {
      animatedProgress.value = clampedProgress;
    }
  }, [clampedProgress, animated, animatedProgress]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <View style={styles.circularContainer}>
        <View
          style={[
            styles.circularTrack,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: trackColor,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.circularProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: progressColor,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: `${(clampedProgress / 100) * 360 - 90}deg` }],
            },
          ]}
        />
        {showLabel && (
          <Text style={[styles.circularLabel, { fontSize: size * 0.25 }]}>
            {Math.round(clampedProgress)}%
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
  },
  label: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
  topLabelContainer: {
    marginBottom: 4,
    alignItems: 'flex-end',
  },
  rightLabelContainer: {
    marginLeft: 8,
    minWidth: 36,
    alignItems: 'flex-end',
  },
  insideContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  insideLabelContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTrack: {
    position: 'absolute',
  },
  circularProgress: {
    position: 'absolute',
  },
  circularLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
