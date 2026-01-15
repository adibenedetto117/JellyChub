import { memo, ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'small' | 'medium' | 'large';

interface BadgeProps {
  label?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  iconName?: string;
  dot?: boolean;
  outline?: boolean;
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  default: {
    bg: colors.surface.elevated,
    text: colors.text.secondary,
    border: colors.surface.elevated,
  },
  primary: {
    bg: colors.accent.primary + '20',
    text: colors.accent.primary,
    border: colors.accent.primary,
  },
  success: {
    bg: colors.status.success + '20',
    text: colors.status.success,
    border: colors.status.success,
  },
  warning: {
    bg: colors.status.warning + '20',
    text: colors.status.warning,
    border: colors.status.warning,
  },
  error: {
    bg: colors.status.error + '20',
    text: colors.status.error,
    border: colors.status.error,
  },
  info: {
    bg: colors.status.info + '20',
    text: colors.status.info,
    border: colors.status.info,
  },
};

const sizeStyles: Record<BadgeSize, { container: ViewStyle; text: TextStyle; icon: number; dot: number }> = {
  small: {
    container: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    text: { fontSize: 10 },
    icon: 10,
    dot: 6,
  },
  medium: {
    container: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    text: { fontSize: 12 },
    icon: 12,
    dot: 8,
  },
  large: {
    container: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    text: { fontSize: 14 },
    icon: 16,
    dot: 10,
  },
};

export const Badge = memo(function Badge({
  label,
  variant = 'default',
  size = 'medium',
  icon,
  iconName,
  dot = false,
  outline = false,
  style,
}: BadgeProps) {
  const colorConfig = variantColors[variant];
  const sizeConfig = sizeStyles[size];

  const containerStyle: ViewStyle = {
    ...sizeConfig.container,
    backgroundColor: outline ? 'transparent' : colorConfig.bg,
    borderWidth: outline ? 1 : 0,
    borderColor: colorConfig.border,
  };

  if (dot && !label && !icon && !iconName) {
    return (
      <View
        style={[
          styles.dot,
          { width: sizeConfig.dot, height: sizeConfig.dot, backgroundColor: colorConfig.text },
          style,
        ]}
      />
    );
  }

  const renderIcon = () => {
    if (icon) return icon;
    if (iconName) {
      return <Ionicons name={iconName as any} size={sizeConfig.icon} color={colorConfig.text} />;
    }
    return null;
  };

  const iconElement = renderIcon();

  return (
    <View style={[styles.container, containerStyle, style]}>
      {dot && (
        <View
          style={[
            styles.dotInline,
            { width: sizeConfig.dot, height: sizeConfig.dot, backgroundColor: colorConfig.text },
          ]}
        />
      )}
      {iconElement && <View style={styles.icon}>{iconElement}</View>}
      {label && (
        <Text style={[styles.text, sizeConfig.text, { color: colorConfig.text }]}>
          {label}
        </Text>
      )}
    </View>
  );
});

interface CountBadgeProps {
  count: number;
  maxCount?: number;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

export const CountBadge = memo(function CountBadge({
  count,
  maxCount = 99,
  variant = 'error',
  size = 'small',
  style,
}: CountBadgeProps) {
  if (count <= 0) return null;

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <Badge
      label={displayCount}
      variant={variant}
      size={size}
      style={style ? { ...styles.countBadge, ...style } : styles.countBadge}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    borderRadius: 999,
  },
  dotInline: {
    borderRadius: 999,
  },
  icon: {},
  text: {
    fontWeight: '600',
  },
  countBadge: {
    minWidth: 18,
    justifyContent: 'center',
  },
});
