import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

type FeedbackType = 'success' | 'error';

const config = {
  success: {
    icon: 'checkmark-circle' as const,
    color: '#22c55e',
    title: 'Request Submitted!',
    subtitle: 'Your request is being processed',
  },
  error: {
    icon: 'alert-circle' as const,
    color: '#ef4444',
    title: 'Request Failed',
    subtitle: 'Please try again later',
  },
};

interface Props {
  type: FeedbackType;
  title?: string;
  subtitle?: string;
}

export function RequestFeedback({ type, title, subtitle }: Props) {
  const { icon, color } = config[type];
  const displayTitle = title || config[type].title;
  const displaySubtitle = subtitle || config[type].subtitle;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <LinearGradient
        colors={[`${color}15`, `${color}05`]}
        style={[styles.gradient, { borderColor: `${color}30` }]}
      >
        <View style={[styles.icon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={28} color={color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color }]}>{displayTitle}</Text>
          <Text style={[styles.subtitle, { color: `${color}B3` }]}>{displaySubtitle}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginLeft: 14,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
