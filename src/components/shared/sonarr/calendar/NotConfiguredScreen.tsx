import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE, SONARR_DARK, SONARR_GRADIENT } from './constants';

export function NotConfiguredScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[SONARR_BLUE, SONARR_DARK, colors.background.primary]}
        locations={[0, 0.3, 0.6]}
        style={styles.notConfiguredGradient}
      />
      <Animated.View entering={FadeIn.duration(600)} style={styles.notConfigured}>
        <View style={styles.notConfiguredIcon}>
          <LinearGradient colors={SONARR_GRADIENT} style={styles.notConfiguredIconGradient}>
            <Ionicons name="calendar" size={56} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.notConfiguredTitle}>Sonarr Not Configured</Text>
        <Text style={styles.notConfiguredSubtitle}>
          Connect your Sonarr server to view the calendar
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.configureButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push('/settings/sonarr')}
        >
          <LinearGradient colors={SONARR_GRADIENT} style={styles.configureGradient}>
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.configureButtonText}>Configure Sonarr</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  notConfiguredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  notConfiguredIcon: {
    marginBottom: spacing[6],
  },
  notConfiguredIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notConfiguredSubtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: spacing[3],
    textAlign: 'center',
    lineHeight: 24,
  },
  configureButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginTop: spacing[8],
  },
  configureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
