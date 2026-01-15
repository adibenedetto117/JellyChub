import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing } from '@/theme';
import { SONARR_BLUE } from './constants';

export function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={SONARR_BLUE} />
      <Text style={styles.loadingText}>Loading calendar...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[4],
  },
  loadingText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
});
