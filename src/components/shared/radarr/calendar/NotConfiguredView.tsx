import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE, RADARR_GRADIENT } from './constants';

export function NotConfiguredView() {
  return (
    <>
      <LinearGradient
        colors={[RADARR_ORANGE, '#3a2a1a', colors.background.primary]}
        locations={[0, 0.3, 0.6]}
        style={styles.notConfiguredGradient}
      />
      <Animated.View entering={FadeIn.duration(600)} style={styles.notConfigured}>
        <View style={styles.notConfiguredIcon}>
          <LinearGradient colors={RADARR_GRADIENT} style={styles.notConfiguredIconGradient}>
            <Ionicons name="calendar" size={56} color="#000" />
          </LinearGradient>
        </View>
        <Text style={styles.notConfiguredTitle}>Radarr Not Configured</Text>
        <Text style={styles.notConfiguredSubtitle}>
          Connect your Radarr server to view the calendar
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.configureButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
          onPress={() => router.push('/settings/radarr')}
        >
          <LinearGradient colors={RADARR_GRADIENT} style={styles.configureGradient}>
            <Ionicons name="settings" size={20} color="#000" />
            <Text style={styles.configureButtonText}>Configure Radarr</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
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
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
