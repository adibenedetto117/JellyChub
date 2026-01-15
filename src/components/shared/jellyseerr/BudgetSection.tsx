import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface BudgetSectionProps {
  budget: number;
  revenue?: number;
  delay?: number;
}

export const BudgetSection = memo(function BudgetSection({
  budget,
  revenue,
  delay = 250,
}: BudgetSectionProps) {
  if (budget <= 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Ionicons name="wallet-outline" size={18} color={colors.text.secondary} />
          <View style={styles.textContainer}>
            <Text style={styles.label}>Budget</Text>
            <Text style={styles.value}>${(budget / 1000000).toFixed(0)}M</Text>
          </View>
        </View>
        {revenue !== undefined && revenue > 0 && (
          <View style={styles.item}>
            <Ionicons name="trending-up" size={18} color="#22c55e" />
            <View style={styles.textContainer}>
              <Text style={styles.label}>Revenue</Text>
              <Text style={[styles.value, { color: '#22c55e' }]}>${(revenue / 1000000).toFixed(0)}M</Text>
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: colors.surface.elevated,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  textContainer: {
    gap: 2,
  },
  label: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  value: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
