import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useState, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SafeAreaView } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore, useSettingsStore, useAuthStore } from '@/stores';
import { audioService } from '@/services';
import { createPlaylist } from '@/api';
import { QueueItemRow, NowPlayingCard, SavePlaylistModal } from '@/components/shared/music';
import { colors } from '@/theme';

// Action Button Component
const ActionButton = memo(function ActionButton({
  icon,
  label,
  onPress,
  accentColor,
  disabled = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  accentColor: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionButton,
        { opacity: disabled ? 0.5 : pressed ? 0.7 : 1 },
      ]}
    >
      <Ionicons name={icon as any} size={20} color={disabled ? 'rgba(255,255,255,0.3)' : accentColor} />
      <Text style={[styles.actionButtonText, { color: disabled ? 'rgba(255,255,255,0.3)' : '#fff' }]}>
        {label}
      </Text>
    </Pressable>
  );
});

export default function QueueScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const currentUser = useAuthStore((s) => s.currentUser);
  const userId = currentUser?.Id ?? '';
  const queryClient = useQueryClient();

  const queue = usePlayerStore((s) => s.queue);
  const currentQueueIndex = usePlayerStore((s) => s.currentQueueIndex);
  const progress = usePlayerStore((s) => s.progress);
  const playerState = usePlayerStore((s) => s.playerState);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);
  const clearQueue = usePlayerStore((s) => s.clearQueue);
  const shuffleQueue = usePlayerStore((s) => s.shuffleQueue);
  const reorderQueue = usePlayerStore((s) => s.reorderQueue);

  const [showSavePlaylist, setShowSavePlaylist] = useState(false);

  const dragY = useSharedValue(0);
  const activeIndex = useSharedValue(-1);

  const currentItem = useMemo(() => {
    return queue[currentQueueIndex];
  }, [queue, currentQueueIndex]);

  const upcomingItems = useMemo(() => {
    return queue.slice(currentQueueIndex + 1);
  }, [queue, currentQueueIndex]);

  const isPlaying = playerState === 'playing';

  const handlePlayPause = useCallback(async () => {
    await audioService.togglePlayPause();
  }, []);

  const handleOpenPlayer = useCallback(() => {
    if (currentItem) {
      router.push(`/player/music?itemId=${currentItem.item.Id}`);
    }
  }, [currentItem]);

  const handlePlayTrack = useCallback((index: number) => {
    audioService.forcePlayIndex(index);
  }, []);

  const handleRemoveTrack = useCallback((index: number) => {
    if (index === currentQueueIndex) {
      Alert.alert(
        'Remove Track',
        'This track is currently playing. Are you sure you want to remove it?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeFromQueue(index),
          },
        ]
      );
    } else {
      removeFromQueue(index);
    }
  }, [currentQueueIndex, removeFromQueue]);

  const handleClearQueue = useCallback(() => {
    Alert.alert(
      'Clear Queue',
      'Are you sure you want to clear the entire queue? Playback will stop.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await audioService.stop();
            clearQueue();
            router.back();
          },
        },
      ]
    );
  }, [clearQueue]);

  const handleShuffleQueue = useCallback(() => {
    if (upcomingItems.length <= 1) {
      Alert.alert('Cannot Shuffle', 'Need at least 2 upcoming tracks to shuffle.');
      return;
    }
    shuffleQueue();
  }, [upcomingItems.length, shuffleQueue]);

  const handleDragStart = useCallback((index: number) => {
    activeIndex.value = index;
  }, [activeIndex]);

  const handleDragEnd = useCallback((fromIndex: number, toIndex: number) => {
    activeIndex.value = -1;
    const clampedToIndex = Math.max(0, Math.min(queue.length - 1, toIndex));
    if (fromIndex !== clampedToIndex) {
      reorderQueue(fromIndex, clampedToIndex);
    }
  }, [activeIndex, queue.length, reorderQueue]);

  const createPlaylistMutation = useMutation({
    mutationFn: async (name: string) => {
      const itemIds = queue.map((q) => q.item.Id);
      const result = await createPlaylist(userId, name, itemIds);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowSavePlaylist(false);
      Alert.alert('Success', 'Playlist created successfully!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create playlist');
    },
  });

  const handleSaveAsPlaylist = useCallback(() => {
    if (queue.length === 0) {
      Alert.alert('Cannot Save', 'The queue is empty.');
      return;
    }
    setShowSavePlaylist(true);
  }, [queue.length]);

  const handleConfirmSavePlaylist = useCallback((name: string) => {
    createPlaylistMutation.mutate(name);
  }, [createPlaylistMutation]);

  const handleBack = useCallback(() => {
    router.navigate('/(tabs)/music');
  }, []);

  if (queue.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Queue</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyTitle}>No Queue</Text>
          <Text style={styles.emptySubtitle}>Start playing music to build your queue</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backButton}>
            <Ionicons name="chevron-down" size={28} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Queue</Text>
          <View style={styles.headerSpacer} />
        </View>

        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Now Playing Card */}
          {currentItem && (
            <NowPlayingCard
              item={currentItem}
              accentColor={accentColor}
              hideMedia={hideMedia}
              progress={progress}
              isPlaying={isPlaying}
              onPress={handleOpenPlayer}
              onPlayPause={handlePlayPause}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <ActionButton
              icon="shuffle"
              label="Shuffle"
              onPress={handleShuffleQueue}
              accentColor={accentColor}
              disabled={upcomingItems.length <= 1}
            />
            <ActionButton
              icon="save-outline"
              label="Save"
              onPress={handleSaveAsPlaylist}
              accentColor={accentColor}
            />
            <ActionButton
              icon="trash-outline"
              label="Clear"
              onPress={handleClearQueue}
              accentColor={accentColor}
            />
          </View>

          {/* Upcoming Queue */}
          {upcomingItems.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t('home.nextUp')} ({upcomingItems.length} {upcomingItems.length === 1 ? 'track' : 'tracks'})
                </Text>
              </View>

              <View style={styles.queueList}>
                {queue.map((item, index) => {
                  if (index <= currentQueueIndex) return null;
                  return (
                    <QueueItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      isCurrentlyPlaying={index === currentQueueIndex}
                      accentColor={accentColor}
                      hideMedia={hideMedia}
                      onPress={() => handlePlayTrack(index)}
                      onRemove={() => handleRemoveTrack(index)}
                      onDragStart={() => handleDragStart(index)}
                      onDragEnd={handleDragEnd}
                      isDragging={activeIndex.value === index}
                      dragY={dragY}
                      activeIndex={activeIndex}
                    />
                  );
                })}
              </View>
            </>
          )}

          {/* History */}
          {currentQueueIndex > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  History ({currentQueueIndex} {currentQueueIndex === 1 ? 'track' : 'tracks'})
                </Text>
              </View>

              <View style={styles.queueList}>
                {queue.slice(0, currentQueueIndex).map((item, index) => (
                  <QueueItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    isCurrentlyPlaying={false}
                    accentColor={accentColor}
                    hideMedia={hideMedia}
                    onPress={() => handlePlayTrack(index)}
                    onRemove={() => handleRemoveTrack(index)}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                    isDragging={activeIndex.value === index}
                    dragY={dragY}
                    activeIndex={activeIndex}
                  />
                ))}
              </View>
            </>
          )}
        </Animated.ScrollView>

        {/* Save as Playlist Modal */}
        <SavePlaylistModal
          visible={showSavePlaylist}
          accentColor={accentColor}
          isLoading={createPlaylistMutation.isPending}
          onClose={() => setShowSavePlaylist(false)}
          onSave={handleConfirmSavePlaylist}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
  },
  sectionHeader: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queueList: {
    marginBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
