import { memo, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  padding?: 'none' | 'small' | 'medium' | 'large';
}

const paddingSizes = {
  none: 0,
  small: 8,
  medium: 16,
  large: 24,
};

const variantStyles: Record<CardVariant, ViewStyle> = {
  default: {
    backgroundColor: colors.surface.default,
  },
  elevated: {
    backgroundColor: colors.surface.elevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.surface.elevated,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
};

export const Card = memo(function Card({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  style,
  padding = 'medium',
}: CardProps) {
  const cardStyle = [
    styles.base,
    variantStyles[variant],
    { padding: paddingSizes[padding] },
    disabled && styles.disabled,
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          cardStyle,
          pressed && styles.pressed,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
});

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  style?: ViewStyle;
}

export const CardHeader = memo(function CardHeader({
  title,
  subtitle,
  action,
  style,
}: CardHeaderProps) {
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      {action && <View style={styles.headerAction}>{action}</View>}
    </View>
  );
});

interface CardContentProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const CardContent = memo(function CardContent({ children, style }: CardContentProps) {
  return <View style={[styles.content, style]}>{children}</View>;
});

interface CardFooterProps {
  children: ReactNode;
  style?: ViewStyle;
}

export const CardFooter = memo(function CardFooter({ children, style }: CardFooterProps) {
  return <View style={[styles.footer, style]}>{children}</View>;
});

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  headerAction: {},
  title: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  content: {},
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.surface.elevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
