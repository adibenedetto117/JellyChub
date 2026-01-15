import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';

interface StatCardProps {
  label: string;
  value: number;
  icon: string;
  color: string;
  onPress?: () => void;
}

export function StatCard({ label, value, icon, color, onPress }: StatCardProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.statCard, pressed && onPress && { opacity: 0.8 }]}>
      <View style={[styles.statIconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statCard: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
