import { memo } from 'react';
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { QuickAction } from './QuickAction';
import { styles } from './styles';

export const QuickActionsSection = memo(function QuickActionsSection() {
  return (
    <Animated.View entering={FadeInDown.delay(150).springify()} style={styles.section}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <QuickAction
        icon="library"
        label="Manage Series"
        onPress={() => router.push('/settings/sonarr-manage')}
        delay={200}
      />
      <QuickAction
        icon="calendar"
        label="View Calendar"
        onPress={() => router.push('/settings/sonarr-calendar')}
        delay={250}
      />
    </Animated.View>
  );
});
