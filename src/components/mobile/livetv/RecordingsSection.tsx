import { memo } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RecordingCard } from '@/components/shared/livetv';
import { colors } from '@/theme';
import type { RecordingInfo } from '@/types/livetv';

interface RecordingsSectionProps {
  recordings: RecordingInfo[];
  isLoading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onPlay: (recording: RecordingInfo) => void;
  onDelete: (recording: RecordingInfo) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const RecordingsSection = memo(function RecordingsSection({
  recordings,
  isLoading,
  refreshing,
  onRefresh,
  onPlay,
  onDelete,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: RecordingsSectionProps) {
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
      data={recordings}
      renderItem={({ item }) => (
        <RecordingCard
          recording={item}
          onPress={() => onPlay(item)}
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
          <Ionicons name="videocam-outline" size={48} color={colors.text.tertiary} />
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
