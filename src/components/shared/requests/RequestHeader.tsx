import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';

interface RequestHeaderProps {
  userName?: string;
}

export function RequestHeader({ userName }: RequestHeaderProps) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
      <View style={styles.headerLeft}>
        <View style={styles.logoContainer}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.logoGradient}
          >
            <Ionicons name="film" size={16} color="#fff" />
          </LinearGradient>
        </View>
        <View>
          <Text style={styles.headerTitle}>Jellyseerr</Text>
          {userName && (
            <Text style={styles.headerSubtitle}>Welcome, {userName}</Text>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 1,
  },
});
