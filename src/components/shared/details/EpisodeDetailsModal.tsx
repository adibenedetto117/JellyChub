import { memo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { ModalHeader } from '@/components/shared/media/modals/ModalHeader';
import { useSettingsStore, useAuthStore } from '@/stores';
import { getItem, getPlaybackInfo, getImageUrl } from '@/api';
import { formatDuration, ticksToMs, getWatchProgress, getDisplayImageUrl, getAudioStreams, getSubtitleStreams, getLanguageDisplayName, getAudioChannelLabel } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface EpisodeDetailsModalProps {
  episodeId: string | null;
  visible: boolean;
  onClose: () => void;
  from?: string;
  accentColor: string;
  hideMedia: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export const EpisodeDetailsModal = memo(function EpisodeDetailsModal({
  episodeId,
  visible,
  onClose,
  from,
  accentColor,
  hideMedia,
  t,
}: EpisodeDetailsModalProps) {
  const userId = useAuthStore((s) => s.currentUser?.Id ?? '');

  const { data: episode, isLoading: isLoadingEpisode } = useQuery({
    queryKey: ['episode-detail', episodeId, userId],
    queryFn: () => getItem(userId, episodeId!),
    enabled: visible && !!episodeId && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: playbackInfo, isLoading: isLoadingPlayback } = useQuery({
    queryKey: ['episode-playback', episodeId, userId],
    queryFn: () => getPlaybackInfo(episodeId!, userId),
    enabled: visible && !!episodeId && !!userId,
    staleTime: 1000 * 60 * 5,
  });

  if (!visible) return null;

  const isLoading = isLoadingEpisode || isLoadingPlayback;
  const mediaSource = playbackInfo?.MediaSources?.[0];
  const audioTracks = mediaSource ? getAudioStreams(mediaSource) : [];
  const subtitleTracks = mediaSource ? getSubtitleStreams(mediaSource) : [];

  const episodeImageTag = episode?.ImageTags?.Primary;
  const rawImageUrl = episodeImageTag && episode
    ? getImageUrl(episode.Id, 'Primary', { maxWidth: 600, tag: episodeImageTag })
    : null;
  const imageUrl = episode ? getDisplayImageUrl(episode.Id, rawImageUrl, hideMedia, 'Primary') : null;

  const progress = episode ? getWatchProgress(episode) : 0;
  const isWatched = episode?.UserData?.Played === true;
  const hasProgress = progress > 0 && progress < 100;
  const duration = episode?.RunTimeTicks ? formatDuration(ticksToMs(episode.RunTimeTicks)) : null;

  const handlePlay = (resume = false) => {
    if (!episode) return;
    onClose();
    const detailsRoute = from || '/(tabs)/home';
    router.push(`/player/video?itemId=${episode.Id}${resume ? '&resume=true' : ''}&from=${encodeURIComponent(detailsRoute)}`);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <ModalHeader
            title={hideMedia ? `Episode ${episode?.IndexNumber ?? ''}` : (episode?.Name ?? 'Episode Details')}
            onClose={onClose}
          />

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={accentColor} />
            </View>
          ) : episode ? (
            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
              {imageUrl && (
                <View style={styles.imageContainer}>
                  <CachedImage
                    uri={imageUrl}
                    style={styles.episodeImage}
                    borderRadius={12}
                  />
                  {isWatched && (
                    <View style={[styles.watchedBadge, { backgroundColor: accentColor }]}>
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    </View>
                  )}
                  {hasProgress && (
                    <View style={styles.progressBarContainer}>
                      <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: accentColor }]} />
                    </View>
                  )}
                </View>
              )}

              <View style={styles.episodeInfo}>
                <Text style={styles.episodeNumber}>
                  S{episode.ParentIndexNumber} E{episode.IndexNumber}
                </Text>
                {!hideMedia && (
                  <Text style={styles.episodeName}>{episode.Name}</Text>
                )}

                <View style={styles.metaRow}>
                  {duration && (
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.metaText}>{duration}</Text>
                    </View>
                  )}
                  {episode.PremiereDate && !hideMedia && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={14} color="rgba(255,255,255,0.5)" />
                      <Text style={styles.metaText}>
                        {new Date(episode.PremiereDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}
                  {episode.CommunityRating && (
                    <View style={styles.metaItem}>
                      <Ionicons name="star" size={14} color="#FFD700" />
                      <Text style={styles.metaText}>{episode.CommunityRating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>

              {episode.Overview && !hideMedia && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Synopsis</Text>
                  <Text style={styles.overviewText}>{episode.Overview}</Text>
                </View>
              )}

              {audioTracks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Audio ({audioTracks.length})</Text>
                  {audioTracks.map((track) => (
                    <View key={track.Index} style={styles.trackRow}>
                      <Ionicons name="volume-high-outline" size={16} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.trackText}>
                        {track.DisplayTitle || getLanguageDisplayName(track.Language)}
                        {track.Codec ? ` (${track.Codec.toUpperCase()})` : ''}
                        {track.Channels ? ` ${getAudioChannelLabel(track.Channels)}` : ''}
                        {track.IsDefault ? ' [Default]' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {subtitleTracks.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Subtitles ({subtitleTracks.length})</Text>
                  {subtitleTracks.map((track) => (
                    <View key={track.Index} style={styles.trackRow}>
                      <Ionicons name="text-outline" size={16} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.trackText}>
                        {track.DisplayTitle || getLanguageDisplayName(track.Language)}
                        {track.Codec ? ` (${track.Codec.toUpperCase()})` : ''}
                        {track.IsForced ? ' [Forced]' : ''}
                        {track.IsDefault ? ' [Default]' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.spacer} />
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {hasProgress ? (
              <>
                <Pressable
                  onPress={() => handlePlay(true)}
                  style={[styles.playButton, { backgroundColor: accentColor }]}
                >
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.playButtonText}>Resume</Text>
                </Pressable>
                <Pressable
                  onPress={() => handlePlay(false)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Start Over</Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                onPress={() => handlePlay(false)}
                style={[styles.playButton, { backgroundColor: accentColor, flex: 1 }]}
              >
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={styles.playButtonText}>
                  {isWatched ? 'Watch Again' : 'Play'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '92%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    flexShrink: 1,
  },
  imageContainer: {
    position: 'relative',
    marginHorizontal: 16,
    marginTop: 16,
  },
  episodeImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  watchedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  episodeInfo: {
    padding: 16,
  },
  episodeNumber: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  episodeName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  overviewText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  trackText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    flex: 1,
  },
  spacer: {
    height: 16,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  playButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
