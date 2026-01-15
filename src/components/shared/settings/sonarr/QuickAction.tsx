import { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '@/theme';
import { SONARR_BLUE } from './constants';
import { styles } from './styles';

interface QuickActionProps {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
  delay?: number;
}

export const QuickAction = memo(function QuickAction({ icon, label, onPress, color = SONARR_BLUE, delay = 0 }: QuickActionProps) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.quickActionWrapper}>
      <Pressable
        style={({ pressed }) => [styles.quickAction, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onPress}
      >
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={22} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
      </Pressable>
    </Animated.View>
  );
});
