import { memo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TimerCard } from '@/components/shared/livetv';
import { colors } from '@/theme';
import type { TimerInfo } from '@/types/livetv';

interface ScheduledSectionProps {
  timers: TimerInfo[];
  isLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onDelete: (timer: TimerInfo) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const ScheduledSection = memo(function ScheduledSection({
  timers,
  isLoading,
  refreshing,
  onRefresh,
  onDelete,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: ScheduledSectionProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={accentColor} size="large" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={timers}
      renderItem={({ item }) => (
        <TimerCard
          timer={item}
          onDelete={() => onDelete(item)}
          accentColor={accentColor}
        />
      )}
      keyExtractor={(item) => item.Id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={accentColor}
        />
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="timer-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.tertiary,
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
