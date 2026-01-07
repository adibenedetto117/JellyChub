import { Stack } from 'expo-router';
import { colors } from '@/theme';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        animation: 'fade',
        animationDuration: 200,
      }}
    >
      <Stack.Screen name="server-select" />
      <Stack.Screen name="login" />
    </Stack>
  );
}
