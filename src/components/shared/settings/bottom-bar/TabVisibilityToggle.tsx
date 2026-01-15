import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';
import { TabIcon } from './TabIcon';

interface TabVisibilityToggleProps {
  icon: string;
  title: string;
  subtitle: string;
  isSelected: boolean;
  accentColor: string;
  onToggle: () => void;
}

export function TabVisibilityToggle({
  icon,
  title,
  subtitle,
  isSelected,
  accentColor,
  onToggle,
}: TabVisibilityToggleProps) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.surface.default,
      }}
    >
      <View style={{ marginRight: 12 }}>
        <TabIcon icon={icon} size={40} isActive={isSelected} accentColor={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>{title}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{subtitle}</Text>
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderColor: isSelected ? accentColor : 'rgba(255,255,255,0.3)',
          backgroundColor: isSelected ? accentColor : 'transparent',
        }}
      >
        {isSelected && <Text style={{ color: '#fff', fontSize: 14 }}>✓</Text>}
      </View>
    </Pressable>
  );
}
