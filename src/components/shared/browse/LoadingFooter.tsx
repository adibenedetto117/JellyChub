import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { memo } from 'react';

interface LoadingFooterProps {
  isLoading: boolean;
  accentColor: string;
}

export const LoadingFooter = memo(function LoadingFooter({
  isLoading,
  accentColor,
}: LoadingFooterProps) {
  if (!isLoading) {
    return <View style={styles.bottomSpacer} />;
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={accentColor} size="small" />
      <Text style={styles.text}>Loading more...</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 100,
  },
});
