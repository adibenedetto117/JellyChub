import { View, Text, Pressable, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { memo, useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, useAuthStore, selectActiveServer } from '@/stores';
import { getImageUrl } from '@/api';
import { formatPlayerTime, ticksToMs, getWatchProgress } from '@/utils';
import type { Episode, BaseItem } from '@/types/jellyfin';

interface Props {
  visible: boolean;
  onClose: () => void;
  episodes: Episode[];
  seasons?: BaseItem[];
  currentEpisodeId: string;
  currentSeasonId?: string;
  onSelectEpisode: (episodeId: string) => void;
  onSelectSeason?: (seasonId: string) => void;
  isLoading?: boolean;
  seriesName?: string;
}

export const EpisodeList = memo(function EpisodeList({
  visible,
  onClose,
  episodes,
  seasons,
  currentEpisodeId,
  currentSeasonId,
  onSelectEpisode,
  onSelectSeason,
  isLoading = false,
  seriesName,
}: Props) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const activeServer = useAuthStore(selectActiveServer);
  const serverUrl = activeServer?.url;
  const scrollViewRef = useRef<ScrollView>(null);
  const [showSeasonPicker, setShowSeasonPicker] = useState(false);

  // Sort episodes by index
  const sortedEpisodes = useMemo(() => {
    return [...episodes].sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0));
  }, [episodes]);

  // Find current episode index for auto-scroll
  const currentEpisodeIndex = useMemo(() => {
    return sortedEpisodes.findIndex((ep) => ep.Id === currentEpisodeId);
  }, [sortedEpisodes, currentEpisodeId]);

  // Current season info
  const currentSeason = useMemo(() => {
    if (!seasons || !currentSeasonId) return null;
    return seasons.find((s) => s.Id === currentSeasonId);
  }, [seasons, currentSeasonId]);

  // Auto-scroll to current episode when modal opens
  useEffect(() => {
    if (visible && currentEpisodeIndex >= 0 && scrollViewRef.current) {
      // Each episode card is approximately 100px tall with padding
      const scrollPosition = Math.max(0, currentEpisodeIndex * 88 - 100);
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollPosition, animated: true });
      }, 100);
    }
  }, [visible, currentEpisodeIndex]);

  const handleSelectEpisode = useCallback((episode: Episode) => {
    if (episode.Id !== currentEpisodeId) {
      onSelectEpisode(episode.Id);
    }
    onClose();
  }, [currentEpisodeId, onSelectEpisode, onClose]);

  const handleSelectSeason = useCallback((seasonId: string) => {
    if (onSelectSeason && seasonId !== currentSeasonId) {
      onSelectSeason(seasonId);
    }
    setShowSeasonPicker(false);
  }, [currentSeasonId, onSelectSeason]);

  const getEpisodeImageUrl = useCallback((episode: Episode) => {
    if (!serverUrl || hideMedia) return null;

    // 1. Episode's own Primary image (screenshot/thumbnail)
    if (episode.ImageTags?.Primary) {
      return getImageUrl(episode.Id, 'Primary', { maxWidth: 200 });
    }

    // 2. Parent thumb image (often available for episodes)
    if (episode.ParentThumbImageTag && episode.ParentThumbItemId) {
      return getImageUrl(episode.ParentThumbItemId, 'Thumb', { maxWidth: 200, tag: episode.ParentThumbImageTag });
    }

    // 3. Parent backdrop - use ParentBackdropItemId if available, fallback to SeriesId
    if (episode.ParentBackdropImageTags?.length) {
      const backdropItemId = episode.ParentBackdropItemId ?? episode.SeriesId;
      return getImageUrl(backdropItemId, 'Backdrop', { maxWidth: 200, tag: episode.ParentBackdropImageTags[0] });
    }

    // 4. Series primary image (poster)
    if (episode.SeriesPrimaryImageTag && episode.SeriesId) {
      return getImageUrl(episode.SeriesId, 'Primary', { maxWidth: 200, tag: episode.SeriesPrimaryImageTag });
    }

    // 5. Last resort: try series backdrop without tag
    if (episode.SeriesId) {
      return getImageUrl(episode.SeriesId, 'Backdrop', { maxWidth: 200 });
    }

    return null;
  }, [serverUrl, hideMedia]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        {/* Header with season picker */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="tv-outline" size={18} color="#fff" />
          </View>
          <View style={styles.headerTitleContainer}>
            {seriesName && !hideMedia && (
              <Text style={styles.seriesName} numberOfLines={1}>
                {seriesName}
              </Text>
            )}
            {seasons && seasons.length > 1 && onSelectSeason ? (
              <Pressable
                onPress={() => setShowSeasonPicker(!showSeasonPicker)}
                style={styles.seasonSelector}
              >
                <Text style={[styles.headerTitle, { color: accentColor }]}>
                  {hideMedia ? 'Season' : currentSeason?.Name || `Season ${currentSeason?.IndexNumber || ''}`}
                </Text>
                <Ionicons
                  name={showSeasonPicker ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={accentColor}
                />
              </Pressable>
            ) : (
              <Text style={styles.headerTitle}>
                {hideMedia ? 'Episodes' : currentSeason?.Name || 'Episodes'}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeX}>
              <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </Pressable>
        </View>

        {/* Season Picker Dropdown */}
        {showSeasonPicker && seasons && seasons.length > 1 && (
          <View style={styles.seasonPicker}>
            <ScrollView style={styles.seasonList} showsVerticalScrollIndicator={false}>
              {seasons
                .filter(s => s.IndexNumber !== undefined && s.IndexNumber !== 0)
                .sort((a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0))
                .map((season) => {
                  const isCurrentSeason = season.Id === currentSeasonId;
                  return (
                    <Pressable
                      key={season.Id}
                      onPress={() => handleSelectSeason(season.Id)}
                      style={[
                        styles.seasonItem,
                        isCurrentSeason && { backgroundColor: accentColor + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.seasonItemText,
                          isCurrentSeason && { color: accentColor },
                        ]}
                      >
                        {hideMedia ? `Season ${season.IndexNumber}` : season.Name}
                      </Text>
                      {isCurrentSeason && (
                        <Ionicons name="checkmark" size={18} color={accentColor} />
                      )}
                    </Pressable>
                  );
                })}
            </ScrollView>
          </View>
        )}

        {/* Episode List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={accentColor} size="large" />
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.episodeList}
            showsVerticalScrollIndicator={false}
          >
            {sortedEpisodes.map((episode) => {
              const isCurrent = episode.Id === currentEpisodeId;
              const watchProgress = getWatchProgress(episode);
              const isWatched = episode.UserData?.Played === true;
              const imageUrl = getEpisodeImageUrl(episode);
              const runtime = episode.RunTimeTicks ? ticksToMs(episode.RunTimeTicks) : 0;

              return (
                <Pressable
                  key={episode.Id}
                  onPress={() => handleSelectEpisode(episode)}
                  style={[
                    styles.episodeItem,
                    isCurrent && { backgroundColor: accentColor + '20' },
                  ]}
                >
                  {/* Episode Thumbnail */}
                  <View style={styles.thumbnailContainer}>
                    {imageUrl ? (
                      <Image
                        source={{ uri: imageUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.3)" />
                      </View>
                    )}
                    {/* Watch Progress Overlay */}
                    {watchProgress > 0 && watchProgress < 100 && (
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            { width: `${watchProgress}%`, backgroundColor: accentColor }
                          ]}
                        />
                      </View>
                    )}
                    {/* Watched Checkmark */}
                    {isWatched && (
                      <View style={[styles.watchedBadge, { backgroundColor: accentColor }]}>
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      </View>
                    )}
                    {/* Now Playing Indicator */}
                    {isCurrent && (
                      <View style={[styles.nowPlayingOverlay, { backgroundColor: accentColor + 'CC' }]}>
                        <Ionicons name="play" size={16} color="#fff" />
                      </View>
                    )}
                  </View>

                  {/* Episode Info */}
                  <View style={styles.episodeInfo}>
                    <View style={styles.episodeHeader}>
                      <Text
                        style={[
                          styles.episodeNumber,
                          isCurrent && { color: accentColor },
                        ]}
                      >
                        {hideMedia ? `Episode ${episode.IndexNumber}` : `${episode.IndexNumber}. `}
                      </Text>
                      {!hideMedia && (
                        <Text
                          style={[
                            styles.episodeName,
                            isCurrent && { color: accentColor },
                          ]}
                          numberOfLines={1}
                        >
                          {episode.Name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.episodeMeta}>
                      {runtime > 0 && (
                        <Text style={styles.runtime}>
                          {formatPlayerTime(runtime)}
                        </Text>
                      )}
                      {episode.PremiereDate && !hideMedia && (
                        <Text style={styles.airDate}>
                          {new Date(episode.PremiereDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      )}
                    </View>
                    {episode.Overview && !hideMedia && (
                      <Text style={styles.overview} numberOfLines={2}>
                        {episode.Overview}
                      </Text>
                    )}
                  </View>
                </Pressable>
              );
            })}

            {sortedEpisodes.length === 0 && !isLoading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No episodes available</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  seriesName: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  seasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  seasonPicker: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  seasonList: {
    maxHeight: 200,
  },
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  seasonItemText: {
    color: '#fff',
    fontSize: 15,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeList: {
    maxHeight: 500,
  },
  episodeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  thumbnailContainer: {
    position: 'relative',
    marginRight: 14,
  },
  thumbnail: {
    width: 100,
    height: 56,
    borderRadius: 6,
  },
  thumbnailPlaceholder: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  watchedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowPlayingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeInfo: {
    flex: 1,
  },
  episodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  episodeNumber: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  episodeName: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  runtime: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  airDate: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
  },
  overview: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    lineHeight: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
});
