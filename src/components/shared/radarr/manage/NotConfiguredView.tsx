import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_GRADIENT } from '../constants';

interface NotConfiguredViewProps {
  onConfigure?: () => void;
}

export function NotConfiguredView({ onConfigure }: NotConfiguredViewProps) {
  const handleConfigure = onConfigure || (() => router.push('/settings/radarr'));

  return (
    <View style={styles.notConfigured}>
      <View style={styles.notConfiguredIcon}>
        <LinearGradient colors={RADARR_GRADIENT} style={styles.notConfiguredIconGradient}>
          <Ionicons name="film" size={48} color="#000" />
        </LinearGradient>
      </View>
      <Text style={styles.notConfiguredTitle}>Radarr Not Configured</Text>
      <Text style={styles.notConfiguredSubtitle}>Connect to manage movies</Text>
      <Pressable style={styles.configureBtn} onPress={handleConfigure}>
        <LinearGradient colors={RADARR_GRADIENT} style={styles.configureBtnGradient}>
          <Text style={styles.configureBtnText}>Configure</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  notConfiguredIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: spacing[4],
  },
  notConfiguredIconGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: spacing[1],
  },
  notConfiguredSubtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacing[6],
  },
  configureBtn: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  configureBtnGradient: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
  configureBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
});
