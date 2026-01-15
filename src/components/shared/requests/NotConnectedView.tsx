import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from '@/providers';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';

interface NotConnectedViewProps {
  onConnect: () => void;
}

export function NotConnectedView({ onConnect }: NotConnectedViewProps) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
        style={styles.headerGradient}
      />
      <View style={styles.notConnectedContainer}>
        <View style={styles.notConnectedIconContainer}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.notConnectedIconGradient}
          >
            <Ionicons name="film" size={48} color="#fff" />
          </LinearGradient>
        </View>
        <Text style={styles.notConnectedTitle}>Jellyseerr</Text>
        <Text style={styles.notConnectedSubtitle}>
          Discover and request movies and TV shows from your media server
        </Text>
        <Pressable onPress={onConnect}>
          <LinearGradient
            colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
            style={styles.connectButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="link" size={18} color="#fff" />
            <Text style={styles.connectButtonText}>Connect Server</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIconContainer: {
    marginBottom: 24,
  },
  notConnectedIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConnectedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  notConnectedSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
