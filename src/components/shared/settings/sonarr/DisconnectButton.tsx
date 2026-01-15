import { memo } from 'react';
import { Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';
import { styles } from './styles';

interface DisconnectButtonProps {
  onDisconnect: () => void;
}

export const DisconnectButton = memo(function DisconnectButton({ onDisconnect }: DisconnectButtonProps) {
  return (
    <Animated.View entering={FadeInDown.delay(350).springify()}>
      <Pressable
        style={({ pressed }) => [styles.disconnectButton, { opacity: pressed ? 0.8 : 1 }]}
        onPress={onDisconnect}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.status.error} />
        <Text style={styles.disconnectButtonText}>Disconnect from Sonarr</Text>
      </Pressable>
    </Animated.View>
  );
});
