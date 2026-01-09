import { View, ScrollView } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { LibrarySelector } from '@/components/settings/LibrarySelector';

export default function BottomBarSettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Bottom Bar',
          headerStyle: { backgroundColor: '#0a0a0a' },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />

      <ScrollView className="flex-1 px-4 py-4">
        <LibrarySelector />
        <View className="h-32" />
      </ScrollView>
    </SafeAreaView>
  );
}
