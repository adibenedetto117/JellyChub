import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, subtitle, action, onAction }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyStateContainer}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
        style={styles.emptyStateGradient}
      >
        <View style={styles.emptyStateIconContainer}>
          <Ionicons name={icon as any} size={48} color={JELLYSEERR_PURPLE} />
        </View>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
        {action && onAction && (
          <Pressable onPress={onAction}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.emptyStateButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.emptyStateButtonText}>{action}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    width: '100%',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${JELLYSEERR_PURPLE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
