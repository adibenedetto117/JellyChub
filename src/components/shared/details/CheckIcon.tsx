import { View } from 'react-native';

interface CheckIconProps {
  size?: number;
  color?: string;
}

export function CheckIcon({ size = 22, color = '#22c55e' }: CheckIconProps) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.55, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.1 }} />
    </View>
  );
}
