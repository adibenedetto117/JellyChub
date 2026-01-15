import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, runOnJS, type SharedValue } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl } from '@/api';
import { formatPlayerTime, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { colors } from '@/theme';
import type { QueueItem } from '@/types/player';

const ITEM_HEIGHT = 72;

interface QueueItemRowProps {
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
}

export const QueueItemRow = memo(function QueueItemRow({
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
}: QueueItemRowProps) {
  const baseItem = item.item;
  const durationMs = ticksToMs(baseItem.RunTimeTicks ?? 0);

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
      <Animated.View style={[styles.container, animatedStyle]}>
        <Pressable
          onPress={onPress}
          style={[styles.item, isCurrentlyPlaying && { backgroundColor: accentColor + '20' }]}
        >
          <View style={styles.dragHandle}>
            <Ionicons name="menu" size={20} color="rgba(255,255,255,0.3)" />
          </View>
          <CachedImage uri={imageUrl} style={styles.albumArt} borderRadius={6} fallbackText={displayName?.charAt(0)} />
          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, isCurrentlyPlaying && { color: accentColor }]} numberOfLines={1}>
              {displayName}
            </Text>
            {artist ? <Text style={styles.artistName} numberOfLines={1}>{artist}</Text> : null}
          </View>
          <Text style={styles.duration}>{formatPlayerTime(durationMs)}</Text>
          <Pressable onPress={onRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.removeButton}>
            <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" />
          </Pressable>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  container: { height: ITEM_HEIGHT },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ITEM_HEIGHT,
    paddingVertical: 8,
    paddingRight: 8,
    borderRadius: 8,
  },
  dragHandle: { width: 32, alignItems: 'center', justifyContent: 'center' },
  albumArt: { width: 48, height: 48 },
  trackInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  trackName: { color: '#fff', fontSize: 15, fontWeight: '500' },
  artistName: { color: 'rgba(255,255,255,0.5)', fontSize: 13, marginTop: 2 },
  duration: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginRight: 8 },
  removeButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
