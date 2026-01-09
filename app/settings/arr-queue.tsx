import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { ArrQueueDisplay } from '@/components/media/ArrQueueDisplay';
import { colors } from '@/theme';

export default function ArrQueueScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Download Queue',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Settings',
        }}
      />
      <ArrQueueDisplay />
    </SafeAreaView>
  );
}
