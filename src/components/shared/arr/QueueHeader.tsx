import { memo } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QueueHeaderProps {
  title: string;
  icon?: string;
  isRefreshing: boolean;
  accentColor: string;
  onRefresh: () => void;
}

export const QueueHeader = memo(function QueueHeader({
  title,
  icon = 'cloud-download-outline',
  isRefreshing,
  accentColor,
  onRefresh,
}: QueueHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Ionicons name={icon as any} size={20} color="#fff" />
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <Pressable onPress={onRefresh} disabled={isRefreshing}>
        {isRefreshing ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : (
          <Ionicons name="refresh" size={20} color={accentColor} />
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
