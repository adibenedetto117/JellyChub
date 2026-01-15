import React from 'react';
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && onPress && { opacity: 0.8 },
      ]}
    >
      <View style={[styles.iconBg, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    alignItems: 'center',
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  value: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  label: {
    fontSize: 10,
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
