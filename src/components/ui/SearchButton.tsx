import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSettingsStore } from '@/stores';

export function SearchButton() {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const handlePress = () => {
    router.push('/search');
  };

  return (
    <Pressable
      className="w-10 h-10 rounded-full items-center justify-center bg-surface active:opacity-70"
      onPress={handlePress}
    >
      <View style={{ width: 18, height: 18 }}>
        <View
          style={{
            width: 13,
            height: 13,
            borderRadius: 7,
            borderWidth: 2,
            borderColor: accentColor,
          }}
        />
        <View
          style={{
            width: 7,
            height: 2,
            backgroundColor: accentColor,
            position: 'absolute',
            bottom: 1,
            right: 0,
            borderRadius: 1,
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>
    </Pressable>
  );
}
