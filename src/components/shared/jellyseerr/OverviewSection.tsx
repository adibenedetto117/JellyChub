import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';

interface Props {
  overview?: string;
  title?: string;
  delay?: number;
}

export function OverviewSection({ overview, title = 'Overview', delay = 200 }: Props) {
  if (!overview) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{overview}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  text: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 24,
  },
});
