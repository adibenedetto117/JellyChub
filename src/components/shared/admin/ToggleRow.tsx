import { View, Text, Pressable } from 'react-native';
import type { ToggleRowProps } from './types';

export function ToggleRow({ label, description, value, onToggle, accentColor, disabled }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => !disabled && onToggle(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{description}</Text>
      </View>
      <View
        style={{
          width: 50,
          height: 28,
          borderRadius: 14,
          backgroundColor: value ? accentColor : 'rgba(255,255,255,0.15)',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#fff',
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </Pressable>
  );
}
