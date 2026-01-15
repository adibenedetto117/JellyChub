/**
 * Desktop Music Player UI
 * Uses useMusicPlayerCore for all logic, renders desktop-optimized controls
 * Features: keyboard shortcuts, mouse hover controls, queue sidebar, volume control
 */
import React, { useEffect, useCallback, useState, useRef, memo, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { usePlayerStore, useSettingsStore } from '@/stores';
import { colors } from '@/theme';
import { formatPlayerTime, getImageUrl, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist } from '@/utils';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { SleepTimerSelector, SleepTimerIndicator } from '@/components/shared/player';
import { EqualizerModal } from '@/components/mobile/player';
import { audioService } from '@/services';
import type { MusicPlayerCore } from '@/hooks';
import type { QueueItem } from '@/types/player';

interface DesktopMusicPlayerProps {
  core: MusicPlayerCore;
}

// Queue Item Component
const QueueItemRow = memo(function QueueItemRow({
  item,
  index,
  isCurrentlyPlaying,
  accentColor,
  hideMedia,
  onPress,
  onRemove,
}: {
  item: QueueItem;
  index: number;
  isCurrentlyPlaying: boolean;
  accentColor: string;
  hideMedia: boolean;
  onPress: () => void;
  onRemove: () => void;
}) {
  const baseItem = item.item;
  const durationMs = ticksToMs(baseItem.RunTimeTicks ?? 0);

  const getItemImageUrl = () => {
    if (baseItem.ImageTags?.Primary) {
      return getImageUrl(baseItem.Id, 'Primary', { maxWidth: 100, tag: baseItem.ImageTags.Primary });
    }
    const albumId = (baseItem as any)?.AlbumId;
    const albumTag = (baseItem as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 100, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 100 });
    }
    return null;
  };

  const rawImageUrl = getItemImageUrl();
  const imageUrl = getDisplayImageUrl(baseItem.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(baseItem, hideMedia);
  const rawArtists = (baseItem as any)?.Artists || [(baseItem as any)?.AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const artist = displayArtists[0] || '';

  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[
        styles.queueItem,
        isCurrentlyPlaying && { backgroundColor: accentColor + '20' },
        isHovered && styles.queueItemHovered,
      ]}
    >
      <CachedImage
        uri={imageUrl}
        style={styles.queueItemArt}
        borderRadius={4}
        fallbackText={displayName?.charAt(0)}
      />

      <View style={styles.queueItemInfo}>
        <Text
          style={[
            styles.queueItemTitle,
            isCurrentlyPlaying && { color: accentColor },
          ]}
          numberOfLines={1}
        >
          {displayName}
        </Text>
        {artist ? (
          <Text style={styles.queueItemArtist} numberOfLines={1}>
            {artist}
          </Text>
        ) : null}
      </View>

      <Text style={styles.queueItemDuration}>{formatPlayerTime(durationMs)}</Text>

      {isHovered && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.queueItemRemove}
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
        </Pressable>
      )}
    </Pressable>
  );
});

export function DesktopMusicPlayer({ core }: DesktopMusicPlayerProps) {
  const {
    item,
    albumArtUrl,
    displayName,
    albumArtist,
    albumName,
    playerState,
    localProgress,
    progressValue,
    showLoading,
    shuffleMode,
    repeatMode,
    lyrics,
    lyricsLoading,
    currentLyricIndex,
    showLyricsView,
    lyricsScrollRef,
    isFavorite,
    isDownloaded,
    isDownloading,
    downloadProgress,
    musicSleepTimer,
    showSleepTimer,
    setShowSleepTimer,
    showEqualizer,
    setShowEqualizer,
    accentColor,
    handlePlayPause,
    handleSeek,
    handleSkipPrevious,
    handleSkipNext,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleFavorite,
    handleToggleLyrics,
    handleGoToAlbum,
    handleGoToArtist,
    handleDownload,
    handleSelectSleepTimer,
    handleClose,
    handleStopAndClose,
    getDisplayPosition,
  } = core;

  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const queue = usePlayerStore((s) => s.queue);
  const currentQueueIndex = usePlayerStore((s) => s.currentQueueIndex);
  const removeFromQueue = usePlayerStore((s) => s.removeFromQueue);

  const [showQueue, setShowQueue] = useState(true);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isHoveringSeekBar, setIsHoveringSeekBar] = useState(false);
  const [seekHoverPosition, setSeekHoverPosition] = useState(0);
  const seekBarRef = useRef<View>(null);

  // Volume handling
  const handleVolumeChange = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    setIsMuted(clampedVolume === 0);
    audioService.setVolume?.(clampedVolume);
  }, []);

  const handleToggleMute = useCallback(() => {
    if (isMuted) {
      handleVolumeChange(volume > 0 ? volume : 0.5);
    } else {
      setIsMuted(true);
      audioService.setVolume?.(0);
    }
  }, [isMuted, volume, handleVolumeChange]);

  // Keyboard shortcuts
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipPrevious();
          } else {
            handleSeek(Math.max(0, localProgress.position - 10000));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) {
            handleSkipNext();
          } else {
            handleSeek(Math.min(localProgress.duration, localProgress.position + 10000));
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange((isMuted ? 0 : volume) + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange((isMuted ? 0 : volume) - 0.1);
          break;
        case 'm':
          e.preventDefault();
          handleToggleMute();
          break;
        case 's':
          e.preventDefault();
          handleToggleShuffle();
          break;
        case 'r':
          e.preventDefault();
          handleToggleRepeat();
          break;
        case 'l':
          e.preventDefault();
          handleToggleLyrics();
          break;
        case 'q':
          e.preventDefault();
          setShowQueue((prev) => !prev);
          break;
        case 'f':
          e.preventDefault();
          handleToggleFavorite();
          break;
        case 'Escape':
          handleClose();
          break;
        case 'n':
          e.preventDefault();
          handleSkipNext();
          break;
        case 'p':
          e.preventDefault();
          handleSkipPrevious();
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          handleSeek((localProgress.duration * percent) / 100);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePlayPause,
    handleSeek,
    handleSkipPrevious,
    handleSkipNext,
    handleToggleShuffle,
    handleToggleRepeat,
    handleToggleLyrics,
    handleToggleFavorite,
    handleClose,
    handleVolumeChange,
    handleToggleMute,
    localProgress,
    volume,
    isMuted,
  ]);

  // Seek bar interaction
  const handleSeekBarClick = useCallback((e: any) => {
    if (!seekBarRef.current) return;

    seekBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const clickX = e.nativeEvent?.pageX ?? e.pageX;
      const relativeX = clickX - pageX;
      const percent = Math.max(0, Math.min(1, relativeX / width));
      const newPosition = percent * localProgress.duration;
      handleSeek(newPosition);
    });
  }, [localProgress.duration, handleSeek]);

  const handleSeekBarHover = useCallback((e: any) => {
    if (!seekBarRef.current) return;

    seekBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const hoverX = e.nativeEvent?.pageX ?? e.pageX;
      const relativeX = hoverX - pageX;
      const percent = Math.max(0, Math.min(1, relativeX / width));
      setSeekHoverPosition(percent * localProgress.duration);
    });
  }, [localProgress.duration]);

  const handlePlayTrack = useCallback((index: number) => {
    audioService.forcePlayIndex(index);
  }, []);

  const upcomingItems = useMemo(() => {
    return queue.slice(currentQueueIndex + 1);
  }, [queue, currentQueueIndex]);

  const currentItem = queue[currentQueueIndex];

  return (
    <View style={styles.container}>
      {/* Background with blurred album art */}
      <View style={styles.background}>
        {albumArtUrl && (
          <Image
            source={{ uri: albumArtUrl }}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={60}
          />
        )}
        <LinearGradient
          colors={['rgba(10,10,10,0.5)', 'rgba(10,10,10,0.85)', 'rgba(10,10,10,0.98)']}
          style={styles.backgroundGradient}
        />
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="chevron-down" size={24} color="#fff" />
          </Pressable>

          <View style={styles.headerCenter}>
            <Text style={styles.headerLabel}>Now Playing</Text>
            {albumName && (
              <Pressable onPress={handleGoToAlbum}>
                <Text style={styles.headerAlbum} numberOfLines={1}>
                  {albumName}
                </Text>
              </Pressable>
            )}
            {musicSleepTimer && (
              <View style={styles.sleepTimerContainer}>
                <SleepTimerIndicator
                  sleepTimer={musicSleepTimer}
                  onPress={() => setShowSleepTimer(true)}
                />
              </View>
            )}
          </View>

          <View style={styles.headerActions}>
            <Pressable onPress={() => setShowQueue((prev) => !prev)} style={styles.headerButton}>
              <Ionicons
                name="list"
                size={20}
                color={showQueue ? accentColor : '#fff'}
              />
            </Pressable>
          </View>
        </View>

        {/* Main area */}
        <View style={styles.mainArea}>
          {/* Album art and info section */}
          <View style={[styles.playerSection, !showQueue && styles.playerSectionFull]}>
            {showLyricsView ? (
              <ScrollView
                ref={lyricsScrollRef}
                style={styles.lyricsContainer}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.lyricsContent}
              >
                {lyricsLoading ? (
                  <ActivityIndicator color={accentColor} size="large" />
                ) : lyrics && lyrics.length > 0 ? (
                  lyrics.map((line, index) => {
                    const isCurrent = index === currentLyricIndex;
                    const isPast = index < currentLyricIndex;

                    return (
                      <Text
                        key={index}
                        style={[
                          styles.lyricLine,
                          isCurrent && [styles.lyricLineCurrent, { color: accentColor }],
                          isPast && styles.lyricLinePast,
                        ]}
                      >
                        {line.text}
                      </Text>
                    );
                  })
                ) : (
                  <View style={styles.noLyrics}>
                    <Ionicons name="text" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.noLyricsTitle}>No Lyrics Available</Text>
                    <Text style={styles.noLyricsSubtitle}>
                      Lyrics will appear here when available
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.albumArtSection}>
                <View style={styles.albumArtContainer}>
                  {albumArtUrl ? (
                    <Image
                      source={{ uri: albumArtUrl }}
                      style={styles.albumArt}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.albumArtPlaceholder}>
                      <Ionicons name="musical-note" size={80} color="rgba(255,255,255,0.2)" />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Track info */}
            <View style={styles.trackInfo}>
              <View style={styles.trackInfoLeft}>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {displayName ?? 'Unknown Track'}
                </Text>
                <Pressable onPress={handleGoToArtist}>
                  <Text style={styles.trackArtist} numberOfLines={1}>
                    {albumArtist}
                  </Text>
                </Pressable>
              </View>
              <Pressable onPress={handleToggleFavorite} style={styles.favoriteButton}>
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={24}
                  color={isFavorite ? accentColor : '#fff'}
                />
              </Pressable>
            </View>

            {/* Progress bar */}
            <View style={styles.progressSection}>
              <Pressable
                ref={seekBarRef}
                onPress={handleSeekBarClick}
                onHoverIn={() => setIsHoveringSeekBar(true)}
                onHoverOut={() => setIsHoveringSeekBar(false)}
                onPointerMove={handleSeekBarHover}
                style={styles.seekBarContainer}
              >
                <View style={styles.seekBarTrack}>
                  <View
                    style={[
                      styles.seekBarProgress,
                      { width: `${progressValue * 100}%`, backgroundColor: accentColor },
                    ]}
                  />
                  {isHoveringSeekBar && (
                    <View
                      style={[
                        styles.seekBarHover,
                        { width: `${(seekHoverPosition / localProgress.duration) * 100}%` },
                      ]}
                    />
                  )}
                </View>
                <View
                  style={[
                    styles.seekBarThumb,
                    {
                      left: `${progressValue * 100}%`,
                      backgroundColor: accentColor,
                      opacity: isHoveringSeekBar ? 1 : 0,
                    },
                  ]}
                />
              </Pressable>

              <View style={styles.timeRow}>
                <Text style={styles.timeText}>{formatPlayerTime(getDisplayPosition())}</Text>
                {isHoveringSeekBar && (
                  <Text style={styles.timeTextHover}>{formatPlayerTime(seekHoverPosition)}</Text>
                )}
                <Text style={styles.timeText}>{formatPlayerTime(localProgress.duration)}</Text>
              </View>
            </View>

            {/* Playback controls */}
            <View style={styles.controls}>
              <Pressable onPress={handleToggleShuffle} style={styles.controlButton}>
                <View style={styles.shuffleContainer}>
                  <Ionicons
                    name={shuffleMode === 'album' ? 'albums' : 'shuffle'}
                    size={20}
                    color={shuffleMode !== 'off' ? accentColor : 'rgba(255,255,255,0.6)'}
                  />
                  {shuffleMode !== 'off' && (
                    <Text style={[styles.shuffleLabel, { color: accentColor }]}>
                      {shuffleMode === 'all' ? 'ALL' : shuffleMode === 'album' ? 'ALB' : 'NEW'}
                    </Text>
                  )}
                </View>
              </Pressable>

              <Pressable onPress={handleSkipPrevious} style={styles.skipButton}>
                <Ionicons name="play-skip-back" size={28} color="#fff" />
              </Pressable>

              <Pressable onPress={handlePlayPause} style={[styles.playButton, { backgroundColor: accentColor }]}>
                {showLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons
                    name={playerState === 'playing' ? 'pause' : 'play'}
                    size={32}
                    color="#fff"
                    style={{ marginLeft: playerState === 'playing' ? 0 : 3 }}
                  />
                )}
              </Pressable>

              <Pressable onPress={handleSkipNext} style={styles.skipButton}>
                <Ionicons name="play-skip-forward" size={28} color="#fff" />
              </Pressable>

              <Pressable onPress={handleToggleRepeat} style={styles.controlButton}>
                <View style={styles.repeatContainer}>
                  <Ionicons
                    name="repeat"
                    size={20}
                    color={repeatMode !== 'off' ? accentColor : 'rgba(255,255,255,0.6)'}
                  />
                  {repeatMode === 'one' && (
                    <View style={[styles.repeatOneBadge, { backgroundColor: accentColor }]}>
                      <Text style={styles.repeatOneText}>1</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            </View>

            {/* Secondary controls */}
            <View style={styles.secondaryControls}>
              <Pressable
                onPress={handleToggleLyrics}
                style={[
                  styles.secondaryButton,
                  showLyricsView && { backgroundColor: accentColor },
                ]}
              >
                <Ionicons name="text" size={16} color="#fff" />
                <Text style={styles.secondaryButtonText}>Lyrics</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowEqualizer(true)}
                style={styles.secondaryButton}
              >
                <Ionicons name="options" size={16} color="#fff" />
                <Text style={styles.secondaryButtonText}>EQ</Text>
              </Pressable>

              <Pressable
                onPress={() => setShowSleepTimer(true)}
                style={[
                  styles.secondaryButton,
                  musicSleepTimer && { backgroundColor: accentColor },
                ]}
              >
                <Ionicons name="moon" size={16} color="#fff" />
                <Text style={styles.secondaryButtonText}>Sleep</Text>
              </Pressable>

              {/* Volume control */}
              <View style={styles.volumeContainer}>
                <Pressable onPress={handleToggleMute} style={styles.volumeButton}>
                  <Ionicons
                    name={isMuted || volume === 0 ? 'volume-mute' : volume < 0.5 ? 'volume-low' : 'volume-high'}
                    size={18}
                    color="#fff"
                  />
                </Pressable>
                <View style={styles.volumeSlider}>
                  <Pressable
                    style={styles.volumeTrack}
                    onPress={(e) => {
                      const nativeEvent = e.nativeEvent as any;
                      const percent = nativeEvent.offsetX / 80;
                      handleVolumeChange(percent);
                    }}
                  >
                    <View
                      style={[
                        styles.volumeFill,
                        { width: `${(isMuted ? 0 : volume) * 100}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          </View>

          {/* Queue sidebar */}
          {showQueue && (
            <View style={styles.queueSection}>
              <View style={styles.queueHeader}>
                <Text style={styles.queueTitle}>Queue</Text>
                <Text style={styles.queueCount}>
                  {queue.length} {queue.length === 1 ? 'track' : 'tracks'}
                </Text>
              </View>

              <ScrollView style={styles.queueList} showsVerticalScrollIndicator={false}>
                {/* Currently playing */}
                {currentItem && (
                  <View style={styles.queueSectionHeader}>
                    <Text style={styles.queueSectionTitle}>Now Playing</Text>
                  </View>
                )}
                {currentItem && (
                  <QueueItemRow
                    item={currentItem}
                    index={currentQueueIndex}
                    isCurrentlyPlaying={true}
                    accentColor={accentColor}
                    hideMedia={hideMedia}
                    onPress={() => {}}
                    onRemove={() => removeFromQueue(currentQueueIndex)}
                  />
                )}

                {/* Upcoming */}
                {upcomingItems.length > 0 && (
                  <>
                    <View style={styles.queueSectionHeader}>
                      <Text style={styles.queueSectionTitle}>
                        Next Up ({upcomingItems.length})
                      </Text>
                    </View>
                    {queue.map((queueItem, index) => {
                      if (index <= currentQueueIndex) return null;
                      return (
                        <QueueItemRow
                          key={queueItem.id}
                          item={queueItem}
                          index={index}
                          isCurrentlyPlaying={false}
                          accentColor={accentColor}
                          hideMedia={hideMedia}
                          onPress={() => handlePlayTrack(index)}
                          onRemove={() => removeFromQueue(index)}
                        />
                      );
                    })}
                  </>
                )}

                {/* History */}
                {currentQueueIndex > 0 && (
                  <>
                    <View style={styles.queueSectionHeader}>
                      <Text style={styles.queueSectionTitle}>
                        History ({currentQueueIndex})
                      </Text>
                    </View>
                    {queue.slice(0, currentQueueIndex).map((queueItem, index) => (
                      <QueueItemRow
                        key={queueItem.id}
                        item={queueItem}
                        index={index}
                        isCurrentlyPlaying={false}
                        accentColor={accentColor}
                        hideMedia={hideMedia}
                        onPress={() => handlePlayTrack(index)}
                        onRemove={() => removeFromQueue(index)}
                      />
                    ))}
                  </>
                )}

                {queue.length === 0 && (
                  <View style={styles.queueEmpty}>
                    <Ionicons name="musical-notes-outline" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.queueEmptyText}>Queue is empty</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Keyboard shortcuts hint */}
        <View style={styles.shortcutsHint}>
          <Text style={styles.shortcutsText}>
            Space: Play/Pause  |  Arrow: Seek/Volume  |  S: Shuffle  |  R: Repeat  |  L: Lyrics  |  Q: Queue  |  F: Favorite  |  M: Mute
          </Text>
        </View>
      </View>

      {/* Modals */}
      <EqualizerModal
        visible={showEqualizer}
        onClose={() => setShowEqualizer(false)}
      />

      <SleepTimerSelector
        visible={showSleepTimer}
        onClose={() => setShowSleepTimer(false)}
        onSelectTimer={handleSelectSleepTimer}
        currentTimer={musicSleepTimer}
        isEpisode={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.4,
  },
  backgroundGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerAlbum: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  sleepTimerContainer: {
    marginTop: 8,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main area
  mainArea: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 24,
  },
  playerSection: {
    flex: 1,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  playerSectionFull: {
    maxWidth: 600,
  },

  // Album art
  albumArtSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  albumArtContainer: {
    width: 320,
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  albumArt: {
    width: '100%',
    height: '100%',
  },
  albumArtPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Lyrics
  lyricsContainer: {
    flex: 1,
    marginBottom: 24,
  },
  lyricsContent: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  lyricLine: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  lyricLineCurrent: {
    fontSize: 22,
    fontWeight: '700',
  },
  lyricLinePast: {
    color: 'rgba(255,255,255,0.4)',
  },
  noLyrics: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  noLyricsTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    marginTop: 16,
  },
  noLyricsSubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 8,
  },

  // Track info
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  trackInfoLeft: {
    flex: 1,
    marginRight: 16,
  },
  trackTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 4,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Progress
  progressSection: {
    marginBottom: 24,
  },
  seekBarContainer: {
    height: 20,
    justifyContent: 'center',
    cursor: 'pointer',
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekBarProgress: {
    height: '100%',
    borderRadius: 2,
  },
  seekBarHover: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
  },
  seekBarThumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    top: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },
  timeTextHover: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: Platform.OS === 'web' ? 'monospace' : undefined,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
  controlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shuffleContainer: {
    alignItems: 'center',
  },
  shuffleLabel: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  skipButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repeatOneText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Secondary controls
  secondaryControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  volumeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeSlider: {
    width: 80,
    height: 20,
    justifyContent: 'center',
  },
  volumeTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Queue section
  queueSection: {
    width: 320,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.1)',
    marginLeft: 24,
    paddingLeft: 24,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingRight: 8,
  },
  queueTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  queueCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
  queueList: {
    flex: 1,
  },
  queueSectionHeader: {
    paddingVertical: 8,
    marginTop: 8,
  },
  queueSectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  queueItemHovered: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  queueItemArt: {
    width: 40,
    height: 40,
  },
  queueItemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  queueItemTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  queueItemArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  queueItemDuration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    marginRight: 8,
  },
  queueItemRemove: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  queueEmpty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  queueEmptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginTop: 12,
  },

  // Shortcuts hint
  shortcutsHint: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  shortcutsText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
  },
});

export default DesktopMusicPlayer;
