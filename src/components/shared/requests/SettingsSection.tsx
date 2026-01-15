import { Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

export function SettingsSection({ title, children, delay = 0 }: SettingsSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
});
