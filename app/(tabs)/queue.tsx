import { View, Text, Pressable, StyleSheet, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useMemo, memo } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  Layout,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlayerStore, useSettingsStore, useAuthStore } from '@/stores';
import { audioService } from '@/services';
import { getImageUrl, createPlaylist, addToPlaylist } from '@/api';
import { formatPlayerTime, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist, goBack } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { colors } from '@/theme';
import type { QueueItem } from '@/types/player';

const ITEM_HEIGHT = 72;

// Queue Item Component
const QueueItemRow = memo(function QueueItemRow({
  item,
  index,
  isCurrentlyPlaying,
  accentColor,
  hideMedia,
  onPress,
  onRemove,
  onDragStart,
  onDragEnd,
  isDragging,
  dragY,
  activeIndex,
}: {
  item: QueueItem;
  index: number;
  isCurrentlyPlaying: boolean;
  accentColor: string;
  hideMedia: boolean;
  onPress: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnd: (fromIndex: number, toIndex: number) => void;
  isDragging: boolean;
  dragY: SharedValue<number>;
  activeIndex: SharedValue<number>;
}) {
  const baseItem = item.item;
  const durationMs = ticksToMs(baseItem.RunTimeTicks ?? 0);

  // Get album art URL
  const getItemImageUrl = () => {
    if (baseItem.ImageTags?.Primary) {
      return getImageUrl(baseItem.Id, 'Primary', { maxWidth: 200, tag: baseItem.ImageTags.Primary });
    }
    const albumId = (baseItem as any)?.AlbumId;
    const albumTag = (baseItem as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(baseItem.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(baseItem, hideMedia);
  const rawArtists = (baseItem as any)?.Artists || [(baseItem as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  const animatedStyle = useAnimatedStyle(() => {
    if (activeIndex.value === index) {
      return {
        transform: [{ translateY: dragY.value }, { scale: 1.02 }],
        zIndex: 100,
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
      };
    }

    // Shift items when dragging
    if (activeIndex.value >= 0) {
      const draggedItemPosition = activeIndex.value * ITEM_HEIGHT + dragY.value;
      const currentPosition = index * ITEM_HEIGHT;

      if (activeIndex.value < index && draggedItemPosition > currentPosition - ITEM_HEIGHT / 2) {
        return { transform: [{ translateY: -ITEM_HEIGHT }] };
      }
      if (activeIndex.value > index && draggedItemPosition < currentPosition + ITEM_HEIGHT / 2) {
        return { transform: [{ translateY: ITEM_HEIGHT }] };
      }
    }

    return { transform: [{ translateY: 0 }] };
  });

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      'worklet';
      runOnJS(onDragStart)();
    })
    .onUpdate((event) => {
      'worklet';
      dragY.value = event.translationY;
    })
    .onEnd(() => {
      'worklet';
      const offset = dragY.value;
      const currentPosition = index * ITEM_HEIGHT;
      const newPosition = currentPosition + offset;
      const newIndex = Math.round(newPosition / ITEM_HEIGHT);
      runOnJS(onDragEnd)(index, newIndex);
      dragY.value = withSpring(0);
    });

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.queueItemContainer, animatedStyle]}>
        <Pressable
          onPress={onPress}
          style={[
            styles.queueItem,
            isCurrentlyPlaying && { backgroundColor: accentColor + '20' },
          ]}
        >
          <View style={styles.dragHandle}>
            <Ionicons name="menu" size={20} color="rgba(255,255,255,0.3)" />
          </View>

          <CachedImage
            uri={imageUrl}
            style={styles.albumArt}
            borderRadius={6}
            fallbackText={displayName?.charAt(0)}
          />

          <View style={styles.trackInfo}>
            <Text
              style={[
                styles.trackName,
                isCurrentlyPlaying && { color: accentColor },
              ]}
              numberOfLines={1}
            >
              {displayName}
            </Text>
            {artist ? (
              <Text style={styles.artistName} numberOfLines={1}>
                {artist}
              </Text>
            ) : null}
          </View>

          <Text style={styles.duration}>{formatPlayerTime(durationMs)}</Text>

          <Pressable
            onPress={onRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.removeButton}
          >
            <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

// Now Playing Card Component
const NowPlayingCard = memo(function NowPlayingCard({
  item,
  accentColor,
  hideMedia,
  progress,
  isPlaying,
  onPress,
  onPlayPause,
}: {
  item: QueueItem;
  accentColor: string;
  hideMedia: boolean;
  progress: { position: number; duration: number };
  isPlaying: boolean;
  onPress: () => void;
  onPlayPause: () => void;
}) {
  const baseItem = item.item;

  // Get album art URL
  const getItemImageUrl = () => {
    if (baseItem.ImageTags?.Primary) {
      return getImageUrl(baseItem.Id, 'Primary', { maxWidth: 400, tag: baseItem.ImageTags.Primary });
    }
    const albumId = (baseItem as any)?.AlbumId;
    const albumTag = (baseItem as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 400, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 400 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(baseItem.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(baseItem, hideMedia);
  const rawArtists = (baseItem as any)?.Artists || [(baseItem as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <Pressable onPress={onPress} style={styles.nowPlayingCard}>
      <CachedImage
        uri={imageUrl}
        style={styles.nowPlayingArt}
        borderRadius={12}
        fallbackText={displayName?.charAt(0)}
      />

      <View style={styles.nowPlayingInfo}>
        <Text style={styles.nowPlayingLabel}>Now Playing</Text>
        <Text style={[styles.nowPlayingTitle, { color: accentColor }]} numberOfLines={1}>
          {displayName}
        </Text>
        {artist ? (
          <Text style={styles.nowPlayingArtist} numberOfLines={1}>
            {artist}
          </Text>
        ) : null}

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
          </View>
          <View style={styles.progressTimes}>
            <Text style={styles.progressTime}>{formatPlayerTime(progress.position)}</Text>
            <Text style={styles.progressTime}>{formatPlayerTime(progress.duration)}</Text>
          </View>
        </View>
      </View>

      <Pressable
        onPress={onPlayPause}
        style={[styles.playPauseButton, { backgroundColor: accentColor }]}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={24}
          color="#fff"
          style={{ marginLeft: isPlaying ? 0 : 2 }}
        />
      </Pressable>
    </Pressable>
  );
});

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
  const skipToIndex = usePlayerStore((s) => s.skipToIndex);

  const [showSavePlaylist, setShowSavePlaylist] = useState(false);
  const [playlistName, setPlaylistName] = useState('');

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
            goBack('/(tabs)/home');
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
      setPlaylistName('');
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

  const handleConfirmSavePlaylist = useCallback(() => {
    const name = playlistName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    createPlaylistMutation.mutate(name);
  }, [playlistName, createPlaylistMutation]);

  const handleBack = useCallback(() => {
    goBack('/(tabs)/home');
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
                  Up Next ({upcomingItems.length} {upcomingItems.length === 1 ? 'track' : 'tracks'})
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
        <Modal
          visible={showSavePlaylist}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSavePlaylist(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <Pressable style={styles.modalBackdrop} onPress={() => setShowSavePlaylist(false)} />
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Save Queue as Playlist</Text>
              <TextInput
                style={[styles.modalInput, { borderColor: accentColor }]}
                placeholder="Playlist name"
                placeholderTextColor="#666"
                value={playlistName}
                onChangeText={setPlaylistName}
                autoFocus
                selectionColor={accentColor}
                onSubmitEditing={handleConfirmSavePlaylist}
                returnKeyType="done"
              />
              <View style={styles.modalButtons}>
                <Pressable
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowSavePlaylist(false);
                    setPlaylistName('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalCreateButton, { backgroundColor: accentColor }]}
                  onPress={handleConfirmSavePlaylist}
                  disabled={createPlaylistMutation.isPending}
                >
                  <Text style={styles.modalCreateText}>
                    {createPlaylistMutation.isPending ? 'Saving...' : 'Save'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
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

  // Now Playing Card
  nowPlayingCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  nowPlayingArt: {
    width: 80,
    height: 80,
  },
  nowPlayingInfo: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  nowPlayingLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  nowPlayingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  nowPlayingArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressTime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
  playPauseButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Actions
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

  // Section Header
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

  // Queue List
  queueList: {
    marginBottom: 24,
  },
  queueItemContainer: {
    height: ITEM_HEIGHT,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingVertical: 8,
    paddingRight: 8,
    borderRadius: 8,
  },
  dragHandle: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArt: {
    width: 48,
    height: 48,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  artistName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  duration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginRight: 8,
  },
  removeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty State
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

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
