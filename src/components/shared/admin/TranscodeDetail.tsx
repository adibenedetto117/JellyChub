import { View, Text } from 'react-native';
import type { TranscodeDetailProps } from './types';

export function TranscodeDetail({ label, value, direct }: TranscodeDetailProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}: </Text>
      <Text style={{ color: direct ? '#22c55e' : '#fff', fontSize: 11, fontWeight: '500' }}>{value}</Text>
      {direct && <Text style={{ color: '#22c55e', fontSize: 9, marginLeft: 4 }}>(direct)</Text>}
    </View>
  );
}
