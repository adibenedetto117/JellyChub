import { View, Text } from 'react-native';
import type { StatBoxProps } from './types';

export function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <View style={{ minWidth: 70, alignItems: 'center' }}>
      <Text style={{ color, fontSize: 24, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</Text>
    </View>
  );
}
