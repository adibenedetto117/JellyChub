import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';
import { TabIcon } from './TabIcon';

export type TabPlacement = 'bottomBar' | 'more' | 'hidden';

interface TabPlacementRowProps {
  icon: string;
  title: string;
  placement: TabPlacement;
  accentColor: string;
  onPlacementChange: (placement: TabPlacement) => void;
}

const PLACEMENTS: { value: TabPlacement; label: string }[] = [
  { value: 'bottomBar', label: 'Bar' },
  { value: 'more', label: 'More' },
  { value: 'hidden', label: 'Hide' },
];

export function TabPlacementRow({
  icon,
  title,
  placement,
  accentColor,
  onPlacementChange,
}: TabPlacementRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.default,
      }}
    >
      <View style={{ marginRight: 10 }}>
        <TabIcon
          icon={icon}
          size={36}
          isActive={placement !== 'hidden'}
          accentColor={accentColor}
        />
      </View>
      <Text style={{ flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' }}>
        {title}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: 2,
        }}
      >
        {PLACEMENTS.map((p) => (
          <Pressable
            key={p.value}
            onPress={() => onPlacementChange(p.value)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 6,
              backgroundColor: placement === p.value ? accentColor : 'transparent',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '500',
                color: placement === p.value ? '#fff' : 'rgba(255,255,255,0.5)',
              }}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
