import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface InfoChipProps {
  icon: string;
  label: string;
  iconColor?: string;
  backgroundColor?: string;
}

export function InfoChip({ icon, label, iconColor, backgroundColor }: InfoChipProps) {
  return (
    <View style={[styles.container, backgroundColor && { backgroundColor }]}>
      <Ionicons name={icon as any} size={14} color={iconColor || colors.text.secondary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.default,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  label: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
