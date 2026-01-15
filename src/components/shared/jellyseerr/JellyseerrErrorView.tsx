import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

interface Props {
  message?: string;
  buttonLabel?: string;
  onButtonPress: () => void;
}

export function JellyseerrErrorView({
  message = 'Details not found',
  buttonLabel = 'Go Back',
  onButtonPress,
}: Props) {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Ionicons name="alert-circle" size={64} color={colors.text.tertiary} />
      <Text style={styles.text}>{message}</Text>
      <Pressable onPress={onButtonPress}>
        <LinearGradient
          colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
          style={styles.button}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  text: {
    color: '#fff',
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
