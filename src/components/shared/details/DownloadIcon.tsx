import { View } from 'react-native';

interface DownloadIconProps {
  size?: number;
  color?: string;
}

export function DownloadIcon({ size = 22, color = '#fff' }: DownloadIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.55, height: size * 0.35, borderWidth: 2, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
      <View style={{ position: 'absolute', top: 0, width: 2, height: size * 0.45, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: size * 0.3, width: 0, height: 0, borderLeftWidth: size * 0.12, borderRightWidth: size * 0.12, borderTopWidth: size * 0.12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
    </View>
  );
}
