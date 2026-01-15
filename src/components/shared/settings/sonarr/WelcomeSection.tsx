import { memo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SONARR_GRADIENT } from './constants';
import { styles } from './styles';

export const WelcomeSection = memo(function WelcomeSection() {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.welcomeSection}>
      <LinearGradient colors={SONARR_GRADIENT} style={styles.welcomeIcon}>
        <Ionicons name="tv" size={40} color="#fff" />
      </LinearGradient>
      <Text style={styles.welcomeTitle}>Connect to Sonarr</Text>
      <Text style={styles.welcomeSubtitle}>
        Manage your TV series library and automate downloads
      </Text>
    </Animated.View>
  );
});
