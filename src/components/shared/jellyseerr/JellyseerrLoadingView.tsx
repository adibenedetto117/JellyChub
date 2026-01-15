import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

interface Props {
  message?: string;
}

export function JellyseerrLoadingView({ message = 'Loading details...' }: Props) {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.content}>
        <LinearGradient
          colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
          style={styles.icon}
        >
          <ActivityIndicator size="large" color="#fff" />
        </LinearGradient>
        <Text style={styles.text}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  text: {
    color: colors.text.secondary,
    fontSize: 15,
  },
});
