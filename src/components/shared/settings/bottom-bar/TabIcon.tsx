import { View, Text } from 'react-native';

export const TAB_ICON_MAP: Record<string, string> = {
  film: '\u25B6',
  tv: '\u25A3',
  'musical-notes': '\u266B',
  videocam: '\u25B6',
  book: '\u25AF',
  headset: '\u266B',
  home: '\u2302',
  folder: '\u25A6',
  list: '\u2630',
  library: '\u25A6',
  star: '\u2606',
  heart: '\u2665',
  shield: '\u2318',
  download: '\u2193',
  search: '\u26B2',
  settings: '\u2699',
  more: '\u2026',
  radio: '\u25CE',
};

interface TabIconProps {
  icon: string;
  size?: number;
  isActive?: boolean;
  accentColor: string;
}

export function TabIcon({ icon, size = 36, isActive = true, accentColor }: TabIconProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: isActive ? accentColor : 'rgba(255,255,255,0.1)',
      }}
    >
      <Text
        style={{
          fontSize: size * 0.44,
          color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      >
        {TAB_ICON_MAP[icon] ?? '?'}
      </Text>
    </View>
  );
}
