import { memo, ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '@/theme';

type DividerOrientation = 'horizontal' | 'vertical';
type DividerVariant = 'solid' | 'dashed' | 'dotted';

interface DividerProps {
  orientation?: DividerOrientation;
  variant?: DividerVariant;
  color?: string;
  thickness?: number;
  spacing?: number;
  label?: string;
  labelPosition?: 'left' | 'center' | 'right';
  style?: ViewStyle;
}

export const Divider = memo(function Divider({
  orientation = 'horizontal',
  variant = 'solid',
  color = colors.surface.elevated,
  thickness = 1,
  spacing = 0,
  label,
  labelPosition = 'center',
  style,
}: DividerProps) {
  const isHorizontal = orientation === 'horizontal';

  const lineStyle: ViewStyle = {
    backgroundColor: variant === 'solid' ? color : 'transparent',
    borderColor: color,
    borderStyle: variant as ViewStyle['borderStyle'],
  };

  if (isHorizontal) {
    lineStyle.height = thickness;
    lineStyle.borderTopWidth = variant !== 'solid' ? thickness : 0;
  } else {
    lineStyle.width = thickness;
    lineStyle.borderLeftWidth = variant !== 'solid' ? thickness : 0;
  }

  const containerStyle: ViewStyle = isHorizontal
    ? { marginVertical: spacing, flexDirection: 'row', alignItems: 'center' }
    : { marginHorizontal: spacing };

  if (label && isHorizontal) {
    return (
      <View style={[containerStyle, style]}>
        {labelPosition !== 'left' && (
          <View style={[styles.line, lineStyle, { flex: labelPosition === 'center' ? 1 : 0.2 }]} />
        )}
        <Text style={[styles.label, { marginHorizontal: 12 }]}>{label}</Text>
        {labelPosition !== 'right' && (
          <View style={[styles.line, lineStyle, { flex: labelPosition === 'center' ? 1 : 0.2 }]} />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        isHorizontal ? styles.horizontal : styles.vertical,
        lineStyle,
        containerStyle,
        style,
      ]}
    />
  );
});

interface SectionDividerProps {
  title: string;
  action?: ReactNode;
  style?: ViewStyle;
}

export const SectionDivider = memo(function SectionDivider({
  title,
  action,
  style,
}: SectionDividerProps) {
  return (
    <View style={[styles.sectionContainer, style]}>
      <View style={styles.sectionLine} />
      <View style={styles.sectionContent}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action && <View style={styles.sectionAction}>{action}</View>}
      </View>
      <View style={styles.sectionLine} />
    </View>
  );
});

const styles = StyleSheet.create({
  horizontal: {
    width: '100%',
  },
  vertical: {
    height: '100%',
  },
  line: {
    flex: 1,
  },
  label: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surface.elevated,
  },
  sectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionAction: {},
});
