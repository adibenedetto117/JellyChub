import { View, Text, StyleSheet, Image } from 'react-native';
import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { getTrickplayTileUrl } from '@/api';
import type { TrickplayInfo } from '@/types/jellyfin';

interface TrickplayPreviewProps {
  itemId: string;
  mediaSourceId: string;
  trickplayInfo: TrickplayInfo;
  resolution: number;
  position: number;
  duration: number;
  seekBarWidth: number;
  visible: boolean;
  formatTime: (ms: number) => string;
}

export const TrickplayPreview = memo(function TrickplayPreview({
  itemId,
  mediaSourceId,
  trickplayInfo,
  resolution,
  position,
  duration,
  seekBarWidth,
  visible,
  formatTime,
}: TrickplayPreviewProps) {
  const [loadedTileIndex, setLoadedTileIndex] = useState<number | null>(null);
  const [tileLoadError, setTileLoadError] = useState(false);
  const lastPositionRef = useRef(position);

  const {
    Width: tileWidth,
    Height: tileHeight,
    TileWidth: tilesPerRow,
    TileHeight: tilesPerColumn,
    ThumbnailCount: thumbnailCount,
    Interval: interval,
  } = trickplayInfo;

  const thumbWidth = tileWidth;
  const thumbHeight = tileHeight;
  const tilesPerImage = tilesPerRow * tilesPerColumn;

  const { tileIndex, thumbX, thumbY, tileUrl } = useMemo(() => {
    const clampedPosition = Math.max(0, position);
    const thumbnailIndex = Math.max(
      0,
      Math.min(
        Math.floor(clampedPosition / interval),
        thumbnailCount - 1
      )
    );
    const imageIndex = Math.floor(thumbnailIndex / tilesPerImage);
    const positionInTile = thumbnailIndex % tilesPerImage;
    const x = (positionInTile % tilesPerRow) * thumbWidth;
    const y = Math.floor(positionInTile / tilesPerRow) * thumbHeight;

    const url = getTrickplayTileUrl(itemId, mediaSourceId, resolution, imageIndex);

    return {
      tileIndex: imageIndex,
      thumbX: x,
      thumbY: y,
      tileUrl: url,
    };
  }, [
    position,
    interval,
    thumbnailCount,
    tilesPerImage,
    tilesPerRow,
    thumbWidth,
    thumbHeight,
    resolution,
    itemId,
    mediaSourceId,
  ]);

  useEffect(() => {
    if (Math.abs(position - lastPositionRef.current) > interval) {
      lastPositionRef.current = position;
    }
  }, [position, interval]);

  useEffect(() => {
    if (tileIndex !== loadedTileIndex) {
      setTileLoadError(false);
    }
  }, [tileIndex, loadedTileIndex]);

  const previewLeft = useMemo(() => {
    const percent = duration > 0 ? position / duration : 0;
    const previewWidth = thumbWidth + 8;
    const rawLeft = percent * seekBarWidth;
    const minLeft = previewWidth / 2;
    const maxLeft = seekBarWidth - previewWidth / 2;
    return Math.max(minLeft, Math.min(maxLeft, rawLeft));
  }, [position, duration, seekBarWidth, thumbWidth]);

  if (!visible) return null;

  const showThumbnail = !tileLoadError && tileUrl;

  return (
    <View
      style={[
        styles.container,
        {
          left: previewLeft,
          transform: [{ translateX: -(thumbWidth + 8) / 2 }],
        },
      ]}
      pointerEvents="none"
    >
      {showThumbnail && (
        <View
          style={[
            styles.thumbnailContainer,
            {
              width: thumbWidth,
              height: thumbHeight,
            },
          ]}
        >
          <View
            style={[
              styles.thumbnailWrapper,
              {
                width: thumbWidth,
                height: thumbHeight,
              },
            ]}
          >
            <Image
              source={{ uri: tileUrl }}
              style={[
                styles.tileImage,
                {
                  width: tilesPerRow * thumbWidth,
                  height: tilesPerColumn * thumbHeight,
                  transform: [
                    { translateX: -thumbX },
                    { translateY: -thumbY },
                  ],
                },
              ]}
              resizeMode="stretch"
              onLoad={() => setLoadedTileIndex(tileIndex)}
              onError={() => setTileLoadError(true)}
            />
          </View>
        </View>
      )}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>{formatTime(position)}</Text>
      </View>
    </View>
  );
});

interface TimeOnlyPreviewProps {
  position: number;
  duration: number;
  seekBarWidth: number;
  visible: boolean;
  formatTime: (ms: number) => string;
}

export const TimeOnlyPreview = memo(function TimeOnlyPreview({
  position,
  duration,
  seekBarWidth,
  visible,
  formatTime,
}: TimeOnlyPreviewProps) {
  const previewLeft = useMemo(() => {
    const percent = duration > 0 ? position / duration : 0;
    const previewWidth = 80;
    const rawLeft = percent * seekBarWidth;
    const minLeft = previewWidth / 2;
    const maxLeft = seekBarWidth - previewWidth / 2;
    return Math.max(minLeft, Math.min(maxLeft, rawLeft));
  }, [position, duration, seekBarWidth]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.timeOnlyContainer,
        {
          left: previewLeft,
          transform: [{ translateX: -40 }],
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.timeOnlyText}>{formatTime(position)}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    alignItems: 'center',
  },
  thumbnailContainer: {
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: '#fff',
  },
  thumbnailWrapper: {
    overflow: 'hidden',
  },
  tileImage: {
    position: 'absolute',
  },
  timeContainer: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  timeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  timeOnlyContainer: {
    position: 'absolute',
    bottom: 24,
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  timeOnlyText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
