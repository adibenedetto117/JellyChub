import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { colors } from '@/theme';

// Animation duration for auth screens
const ANIMATION_DURATION = 250;

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.primary },
        // Smooth slide animations for auth flow progression
        animation: 'slide_from_right',
        animationDuration: ANIMATION_DURATION,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        // iOS-specific optimizations
        ...(Platform.OS === 'ios' && {
          animationTypeForReplace: 'push',
        }),
      }}
    >
      {/* Server selection - initial screen, fade in */}
      <Stack.Screen
        name="server-select"
        options={{
          animation: 'fade',
          animationDuration: 200,
          gestureEnabled: false,
        }}
      />
      {/* Login - slide in from right for natural flow */}
      <Stack.Screen
        name="login"
        options={{
          animation: 'slide_from_right',
          animationDuration: ANIMATION_DURATION,
          gestureEnabled: true,
          gestureDirection: 'horizontal',
        }}
      />
    </Stack>
  );
}
