import { memo } from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';
import { styles } from './styles';

interface SettingsSectionProps {
  accentColor: string;
  useCustomHeaders: boolean;
  onCustomHeadersChange: (value: boolean) => void;
}

export const SettingsSection = memo(function SettingsSection({
  accentColor,
  useCustomHeaders,
  onCustomHeadersChange,
}: SettingsSectionProps) {
  return (
    <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.section}>
      <Text style={styles.sectionTitle}>Settings</Text>
      <View style={styles.settingCard}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="code-slash" size={20} color={colors.text.secondary} />
            <View style={styles.settingTextContainer}>
              <Text style={styles.settingTitle}>Custom Headers</Text>
              <Text style={styles.settingSubtitle}>Use Jellyfin custom headers</Text>
            </View>
          </View>
          <Switch
            value={useCustomHeaders}
            onValueChange={onCustomHeadersChange}
            trackColor={{ false: 'rgba(255,255,255,0.2)', true: accentColor + '80' }}
            thumbColor={useCustomHeaders ? accentColor : '#f4f3f4'}
          />
        </View>
      </View>
    </Animated.View>
  );
});
