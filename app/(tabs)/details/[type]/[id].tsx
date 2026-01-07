import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuthStore, useSettingsStore, usePlayerStore, useDownloadStore } from '@/stores';
import { getItem, getImageUrl, getSimilarItems, getSeasons, getEpisodes, getAlbumTracks, getArtistAlbums, getPlaylistItems, getNextUp, markAsFavorite } from '@/api';
import { formatDuration, formatYear, formatRating, ticksToMs, getWatchProgress } from '@/utils';
import { MediaRow } from '@/components/media/MediaRow';
import { Button } from '@/components/ui/Button';
import { CachedImage } from '@/components/ui/CachedImage';
import { NowPlayingBars } from '@/components/ui/NowPlayingBars';
import { TrackOptionsMenu } from '@/components/music/TrackOptionsMenu';
import { DownloadOptionsModal } from '@/components/media/DownloadOptionsModal';
import { PersonModal } from '@/components/media/PersonModal';
import { downloadManager } from '@/services';
import type { BaseItem, Episode, Series } from '@/types/jellyfin';

function DownloadIcon({ size = 22, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.55, height: size * 0.35, borderWidth: 2, borderColor: color, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 }} />
      <View style={{ position: 'absolute', top: 0, width: 2, height: size * 0.45, backgroundColor: color }} />
      <View style={{ position: 'absolute', top: size * 0.3, width: 0, height: 0, borderLeftWidth: size * 0.12, borderRightWidth: size * 0.12, borderTopWidth: size * 0.12, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color }} />
    </View>
  );
}

function CheckIcon({ size = 22, color = '#22c55e' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.55, borderRightWidth: 2.5, borderBottomWidth: 2.5, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.1 }} />
    </View>
  );
}

const DESCRIPTION_LINE_LIMIT = 3;

function CollapsibleDescription({ text, accentColor }: { text: string; accentColor: string }) {
  const [expanded, setExpanded] = useState(false);
  const [needsTruncation, setNeedsTruncation] = useState(false);

  return (
    <View className="mt-4">
      <Text
        className="text-text-secondary leading-6"
        numberOfLines={expanded ? undefined : DESCRIPTION_LINE_LIMIT}
        onTextLayout={(e) => {
          if (!expanded && e.nativeEvent.lines.length >= DESCRIPTION_LINE_LIMIT) {
            setNeedsTruncation(true);
          }
        }}
      >
        {text}
      </Text>
      {needsTruncation && (
        <Pressable
          onPress={() => setExpanded(!expanded)}
          className="mt-2"
        >
          <Text style={{ color: accentColor }} className="text-sm font-medium">
            {expanded ? 'Show less' : 'Show more'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function DetailScreen() {
  const { type: rawType, id } = useLocalSearchParams<{ type: string; id: string }>();
  const type = rawType?.toLowerCase();
  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((state) => state.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const playerState = usePlayerStore((s) => s.playerState);
  const { downloads, getDownloadByItemId, isItemDownloaded } = useDownloadStore();
  const userId = currentUser?.Id ?? '';
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [selectedTrack, setSelectedTrack] = useState<BaseItem | null>(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadingEpisodeId, setDownloadingEpisodeId] = useState<string | null>(null);
  const [selectedEpisodeForDownload, setSelectedEpisodeForDownload] = useState<BaseItem | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; imageTag?: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);

  // Check download status
  const downloadItem = getDownloadByItemId(id);
  const isDownloaded = isItemDownloaded(id);
  const isDownloadInProgress = downloadItem?.status === 'downloading' || downloadItem?.status === 'pending';

  const { data: item, isLoading, error: itemError } = useQuery({
    queryKey: ['item', userId, id],
    queryFn: () => getItem(userId, id),
    enabled: !!userId && !!id,
    staleTime: 1000 * 30,
    refetchOnMount: 'always',
  });

  const currentFavorite = isFavorite ?? item?.UserData?.IsFavorite ?? false;

  const favoriteMutation = useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: string; favorite: boolean }) =>
      markAsFavorite(userId, itemId, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', userId, id] });
      queryClient.invalidateQueries({ queryKey: ['favoriteMovies'] });
      queryClient.invalidateQueries({ queryKey: ['favoriteSeries'] });
    },
  });

  const handleToggleFavorite = async () => {
    const newValue = !currentFavorite;
    setIsFavorite(newValue);
    try {
      await favoriteMutation.mutateAsync({ itemId: id, favorite: newValue });
    } catch {
      setIsFavorite(!newValue);
    }
  };

  const { data: similar } = useQuery({
    queryKey: ['similar', id, userId],
    queryFn: () => getSimilarItems(id, userId),
    enabled: !!userId && !!id,
  });

  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasons', id, userId],
    queryFn: () => getSeasons(id, userId),
    enabled: !!userId && !!id && type === 'series',
  });

  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['tracks', id, userId],
    queryFn: () => getAlbumTracks(id, userId),
    enabled: !!userId && !!id && type === 'album',
  });

  const { data: playlistTracks, isLoading: isLoadingPlaylistTracks, error: playlistError } = useQuery({
    queryKey: ['playlist-items', id],
    queryFn: () => getPlaylistItems(id, userId),
    enabled: !!userId && !!id && type === 'playlist',
  });

  const { data: artistAlbums, isLoading: isLoadingArtistAlbums } = useQuery({
    queryKey: ['artistAlbums', id, userId],
    queryFn: () => getArtistAlbums(id, userId),
    enabled: !!userId && !!id && type === 'artist',
    staleTime: 1000 * 60 * 60, // 1 hour for artist albums
  });

  // For seasons, we need to get the SeriesId from the item to fetch episodes
  // Jellyfin uses SeriesId for seasons, but ParentId might also work as fallback
  const seriesId = item?.SeriesId || item?.ParentId;
  const { data: episodes, isLoading: isLoadingEpisodes } = useQuery({
    queryKey: ['episodes', seriesId, id, userId],
    queryFn: () => getEpisodes(seriesId!, userId, id),
    enabled: !!userId && !!id && !!seriesId && type === 'season',
    refetchOnMount: 'always',
  });

  // Get next up episode for series
  const { data: nextUp } = useQuery({
    queryKey: ['nextUp', id, userId],
    queryFn: () => getNextUp(userId, id, 1),
    enabled: !!userId && !!id && type === 'series',
  });

  if (itemError) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-4">
        <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
        <Text className="text-red-400 text-center mt-4">Error loading item</Text>
        <Text className="text-text-tertiary text-center mt-2">{(itemError as any)?.message || 'Unknown error'}</Text>
        <Pressable
          onPress={() => router.back()}
          className="mt-6 px-6 py-3 rounded-lg"
          style={{ backgroundColor: accentColor }}
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading || !item) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={accentColor} size="large" />
      </View>
    );
  }

  // For episodes/seasons, fall back to series/parent backdrop if item doesn't have one
  const backdropTag = item.BackdropImageTags?.[0];
  const parentBackdropTag = (item as any).ParentBackdropImageTags?.[0];
  const parentIdForBackdrop = item.SeriesId || item.ParentId;
  const posterTag = item.ImageTags?.Primary;

  // Backdrop URL with fallback chain: own backdrop -> parent backdrop -> poster (scaled up)
  const backdropUrl = backdropTag
    ? getImageUrl(item.Id, 'Backdrop', { maxWidth: 1920, tag: backdropTag })
    : (parentBackdropTag && parentIdForBackdrop)
      ? getImageUrl(parentIdForBackdrop, 'Backdrop', { maxWidth: 1920, tag: parentBackdropTag })
      : posterTag
        ? getImageUrl(item.Id, 'Primary', { maxWidth: 1920, tag: posterTag })
        : null;

  const posterUrl = posterTag
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 400, tag: posterTag })
    : null;

  const progress = getWatchProgress(item);
  const hasProgress = progress > 0 && progress < 100;
  const duration = formatDuration(ticksToMs(item.RunTimeTicks ?? 0));

  // For series, check if there's a next up episode
  const nextUpEpisode = nextUp?.Items?.[0];
  const nextUpProgress = nextUpEpisode ? getWatchProgress(nextUpEpisode) : 0;
  const hasNextUpProgress = nextUpProgress > 0 && nextUpProgress < 100;

  // For seasons, find the first episode in progress or first unwatched
  const getSeasonPlayEpisode = () => {
    if (!episodes?.Items?.length) return null;
    // First, find episode in progress
    const inProgressEp = episodes.Items.find((ep) => {
      const prog = getWatchProgress(ep);
      return prog > 0 && prog < 100;
    });
    if (inProgressEp) return inProgressEp;
    // Then find first unwatched
    const unwatchedEp = episodes.Items.find((ep) => !ep.UserData?.Played);
    if (unwatchedEp) return unwatchedEp;
    // Default to first episode
    return episodes.Items[0];
  };
  const seasonPlayEpisode = type === 'season' ? getSeasonPlayEpisode() : null;
  const seasonEpisodeProgress = seasonPlayEpisode ? getWatchProgress(seasonPlayEpisode) : 0;
  const hasSeasonProgress = seasonEpisodeProgress > 0 && seasonEpisodeProgress < 100;

  const handlePlay = (resume = false) => {
    if (type === 'movie' || type === 'episode') {
      router.push(`/player/video?itemId=${item.Id}${resume ? '&resume=true' : ''}`);
    } else if (type === 'series') {
      // Play next up episode for series
      if (nextUpEpisode) {
        router.push(`/player/video?itemId=${nextUpEpisode.Id}${hasNextUpProgress ? '&resume=true' : ''}`);
      } else if (seasons?.Items?.[0]) {
        // Fallback: go to first season
        router.push(`/details/season/${seasons.Items[0].Id}`);
      }
    } else if (type === 'season') {
      // Play the episode we determined above
      if (seasonPlayEpisode) {
        router.push(`/player/video?itemId=${seasonPlayEpisode.Id}${hasSeasonProgress ? '&resume=true' : ''}`);
      }
    } else if (type === 'album') {
      const firstTrack = tracks?.Items?.[0];
      if (firstTrack) {
        router.push(`/player/music?itemId=${firstTrack.Id}`);
      }
    } else if (type === 'playlist') {
      const firstTrack = playlistTracks?.Items?.[0];
      if (firstTrack) {
        router.push(`/player/music?itemId=${firstTrack.Id}`);
      }
    }
  };

  const handleShuffle = () => {
    const trackList = type === 'album' ? tracks?.Items : playlistTracks?.Items;
    if (!trackList || trackList.length === 0) return;

    const shuffled = [...trackList].sort(() => Math.random() - 0.5);
    const queueItems = shuffled.map((track, index) => ({
      id: track.Id,
      item: track,
      index,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${shuffled[0].Id}`);
  };

  const handleDownload = async () => {
    if (!item || !activeServerId) return;

    // If already downloaded, just inform
    if (isDownloaded) {
      Alert.alert('Already Downloaded', `${item.Name} is already downloaded and ready to play offline.`);
      return;
    }

    // If download in progress, show status
    if (isDownloadInProgress) {
      Alert.alert(
        'Download in Progress',
        `${item.Name} is ${downloadItem?.status === 'downloading' ? `downloading (${downloadItem.progress}%)` : 'queued for download'}.`
      );
      return;
    }

    // Show download options modal
    setShowDownloadOptions(true);
  };

  const startDownloadWithOptions = async (audioIndex?: number, subtitleIndex?: number) => {
    // Handle episode download if selected
    if (selectedEpisodeForDownload) {
      const episode = selectedEpisodeForDownload;
      setShowDownloadOptions(false);
      setSelectedEpisodeForDownload(null);
      setDownloadingEpisodeId(episode.Id);

      try {
        await downloadManager.startDownload(episode, activeServerId!);
        Alert.alert('Download Started', `${episode.Name} has been added to your downloads.`);
      } catch (error) {
        Alert.alert('Download Failed', 'Could not start download. Please try again.');
      } finally {
        setDownloadingEpisodeId(null);
      }
      return;
    }

    // Handle main item download
    if (!item || !activeServerId) return;

    setShowDownloadOptions(false);
    setIsDownloading(true);

    try {
      await downloadManager.startDownload(item, activeServerId);
      Alert.alert('Download Started', `${item.Name} has been added to your downloads.`);
    } catch (error) {
      Alert.alert('Download Failed', 'Could not start download. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleEpisodeDownload = (episode: BaseItem) => {
    if (!activeServerId) return;

    const epDownload = getDownloadByItemId(episode.Id);
    const epIsDownloaded = isItemDownloaded(episode.Id);
    const epIsInProgress = epDownload?.status === 'downloading' || epDownload?.status === 'pending';

    if (epIsDownloaded) {
      Alert.alert('Already Downloaded', `${episode.Name} is already downloaded.`);
      return;
    }

    if (epIsInProgress) {
      Alert.alert(
        'Download in Progress',
        `${episode.Name} is ${epDownload?.status === 'downloading' ? `downloading (${epDownload.progress}%)` : 'queued'}.`
      );
      return;
    }

    setSelectedEpisodeForDownload(episode);
    setShowDownloadOptions(true);
  };

  const handleItemPress = (pressedItem: BaseItem) => {
    router.push(`/details/${pressedItem.Type.toLowerCase()}/${pressedItem.Id}`);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        bounces={true}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 }}
      >
        {/* Backdrop Image Section */}
        {backdropUrl ? (
          <View className="relative" style={{ height: 320 }} key={`backdrop-${item.Id}`}>
            <CachedImage
              uri={backdropUrl}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
              showSkeleton={false}
              priority="high"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['rgba(10,10,10,0.3)', 'transparent', 'rgba(10,10,10,0.7)', '#0a0a0a']}
              locations={[0, 0.3, 0.7, 1]}
              className="absolute inset-0"
            />
          </View>
        ) : (
          <View style={{ height: insets.top + 60 }} />
        )}

        {/* Content Section */}
        <View className="px-4" style={{ marginTop: backdropUrl ? -80 : 0 }}>
          {/* Poster and Info Row */}
          <View className="flex-row">
            {/* Poster */}
            {posterUrl && (
              <View
                className="rounded-xl overflow-hidden mr-4 shadow-lg"
                style={{ width: 110, height: 165 }}
              >
                <CachedImage
                  uri={posterUrl}
                  style={{ width: 110, height: 165 }}
                  borderRadius={12}
                  priority="high"
                />
              </View>
            )}

            {/* Info Column */}
            <View className="flex-1 justify-end pb-1">
              {type === 'season' && item.SeriesName && (
                <Pressable onPress={() => router.push(`/details/series/${item.SeriesId || item.ParentId}`)}>
                  <Text className="text-text-secondary text-sm mb-1" numberOfLines={1}>
                    {item.SeriesName}
                  </Text>
                </Pressable>
              )}
              {type === 'episode' && item.SeriesName && (
                <Pressable onPress={() => router.push(`/details/series/${item.SeriesId}`)}>
                  <Text className="text-text-secondary text-sm mb-1" numberOfLines={1}>
                    {item.SeriesName} • S{item.ParentIndexNumber} E{item.IndexNumber}
                  </Text>
                </Pressable>
              )}
              <Text className="text-white text-xl font-bold" numberOfLines={2}>
                {item.Name}
              </Text>

              <View className="flex-row items-center mt-2 flex-wrap">
                {type === 'artist' && artistAlbums && (
                  <Text className="text-text-secondary text-sm mr-3">
                    {artistAlbums.TotalRecordCount} {artistAlbums.TotalRecordCount === 1 ? 'Album' : 'Albums'}
                  </Text>
                )}
                {item.ProductionYear && (
                  <Text className="text-text-secondary text-sm mr-3">
                    {formatYear(item.ProductionYear)}
                  </Text>
                )}
                {type !== 'artist' && type !== 'playlist' && type !== 'series' && type !== 'season' && duration && (
                  <Text className="text-text-secondary text-sm mr-3">
                    {duration}
                  </Text>
                )}
                {type === 'playlist' && playlistTracks && playlistTracks.Items.length > 0 && (
                  <Text className="text-text-secondary text-sm mr-3">
                    {playlistTracks.Items.length} {playlistTracks.Items.length === 1 ? 'track' : 'tracks'} • {formatDuration(ticksToMs(playlistTracks.Items.reduce((sum, t) => sum + (t.RunTimeTicks ?? 0), 0)))}
                  </Text>
                )}
                {item.OfficialRating && (
                  <View className="bg-surface px-2 py-0.5 rounded mr-3">
                    <Text className="text-text-secondary text-xs">
                      {item.OfficialRating}
                    </Text>
                  </View>
                )}
                {item.CommunityRating && (
                  <Text className="text-accent text-sm">
                    {formatRating(item.CommunityRating)}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Play Button - Not shown for artists */}
          {type !== 'artist' && (
            <View className="mt-5 flex-row gap-3">
              <View className="flex-1">
                <Button
                  title={
                    type === 'series'
                      ? (hasNextUpProgress ? 'Continue' : (nextUpEpisode ? 'Play' : 'View Seasons'))
                      : type === 'season'
                        ? (hasSeasonProgress ? 'Continue' : 'Play')
                        : (hasProgress ? 'Continue' : 'Play')
                  }
                  onPress={() => handlePlay(
                    type === 'series' ? hasNextUpProgress :
                    type === 'season' ? hasSeasonProgress :
                    hasProgress
                  )}
                  fullWidth
                />
              </View>
              {(type === 'album' || type === 'playlist') && (
                <Pressable
                  onPress={handleShuffle}
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{ backgroundColor: accentColor + '20' }}
                >
                  <Ionicons name="shuffle" size={24} color={accentColor} />
                </Pressable>
              )}
              {/* Download button for downloadable content */}
              {(type === 'movie' || type === 'episode') && (
                <Pressable
                  onPress={handleDownload}
                  disabled={isDownloading}
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: isDownloaded
                      ? '#22c55e20'
                      : isDownloadInProgress
                        ? accentColor + '40'
                        : accentColor + '20',
                  }}
                >
                  {isDownloading ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : isDownloaded ? (
                    <CheckIcon size={22} color="#22c55e" />
                  ) : isDownloadInProgress ? (
                    <View style={{ alignItems: 'center' }}>
                      <DownloadIcon size={20} color={accentColor} />
                      <Text style={{ color: accentColor, fontSize: 9, marginTop: 2 }}>
                        {downloadItem?.progress ?? 0}%
                      </Text>
                    </View>
                  ) : (
                    <DownloadIcon size={22} color={accentColor} />
                  )}
                </Pressable>
              )}
              {/* Favorite button for movies and series */}
              {(type === 'movie' || type === 'series') && (
                <Pressable
                  onPress={handleToggleFavorite}
                  disabled={favoriteMutation.isPending}
                  className="w-14 h-14 rounded-xl items-center justify-center"
                  style={{
                    backgroundColor: currentFavorite ? accentColor + '30' : accentColor + '20',
                  }}
                >
                  {favoriteMutation.isPending ? (
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Ionicons
                      name={currentFavorite ? 'heart' : 'heart-outline'}
                      size={24}
                      color={currentFavorite ? accentColor : 'rgba(255,255,255,0.8)'}
                    />
                  )}
                </Pressable>
              )}
            </View>
          )}

          {/* Progress bar for movies/episodes */}
          {hasProgress && type !== 'artist' && type !== 'series' && type !== 'season' && (
            <View className="mt-3 h-1 bg-surface rounded-full overflow-hidden">
              <View
                className="h-full bg-accent"
                style={{ width: `${progress}%` }}
              />
            </View>
          )}

          {/* Progress bar for series (next up episode) */}
          {type === 'series' && hasNextUpProgress && nextUpEpisode && (
            <View className="mt-3">
              <View className="h-1 bg-surface rounded-full overflow-hidden">
                <View
                  className="h-full bg-accent"
                  style={{ width: `${nextUpProgress}%` }}
                />
              </View>
              <Text className="text-text-tertiary text-xs mt-1">
                S{nextUpEpisode.ParentIndexNumber} E{nextUpEpisode.IndexNumber} - {nextUpEpisode.Name}
              </Text>
            </View>
          )}

          {/* Progress bar for season (current episode) */}
          {type === 'season' && hasSeasonProgress && seasonPlayEpisode && (
            <View className="mt-3">
              <View className="h-1 bg-surface rounded-full overflow-hidden">
                <View
                  className="h-full bg-accent"
                  style={{ width: `${seasonEpisodeProgress}%` }}
                />
              </View>
              <Text className="text-text-tertiary text-xs mt-1">
                Episode {seasonPlayEpisode.IndexNumber} - {seasonPlayEpisode.Name}
              </Text>
            </View>
          )}

          {item.Genres && item.Genres.length > 0 && (
            <View className="flex-row flex-wrap mt-4">
              {item.Genres.map((genre) => (
                <View
                  key={genre}
                  className="bg-surface px-3 py-1 rounded-full mr-2 mb-2"
                >
                  <Text className="text-text-secondary text-xs">{genre}</Text>
                </View>
              ))}
            </View>
          )}

          {item.Overview && (
            <CollapsibleDescription text={item.Overview} accentColor={accentColor} />
          )}

          {type === 'series' && (
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                {seasons ? `${seasons.Items.length} ${seasons.Items.length === 1 ? 'Season' : 'Seasons'}` : 'Seasons'}
              </Text>
              {isLoadingSeasons ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : seasons && seasons.Items.length > 0 ? (
                seasons.Items.map((season) => {
                  const seasonImageTag = season.ImageTags?.Primary;
                  const seasonImageUrl = seasonImageTag
                    ? getImageUrl(season.Id, 'Primary', { maxWidth: 200, tag: seasonImageTag })
                    : null;

                  return (
                    <Pressable
                      key={season.Id}
                      className="bg-surface rounded-xl mb-3 flex-row items-center overflow-hidden"
                      onPress={() =>
                        router.push(`/details/season/${season.Id}`)
                      }
                    >
                      {/* Season poster */}
                      <View className="w-16 h-24 bg-surface-elevated">
                        {seasonImageUrl ? (
                          <CachedImage
                            uri={seasonImageUrl}
                            style={{ width: 64, height: 96 }}
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Text className="text-text-tertiary text-2xl">
                              {season.IndexNumber ?? '?'}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-1 pl-4 pr-3 py-2">
                        <Text className="text-white font-medium">{season.Name}</Text>
                        <View className="flex-row items-center mt-1">
                          {(season as any).ChildCount != null && (
                            <Text className="text-text-tertiary text-xs">
                              {(season as any).ChildCount} {(season as any).ChildCount === 1 ? 'Episode' : 'Episodes'}
                            </Text>
                          )}
                          {season.CommunityRating && (
                            <Text className="text-text-tertiary text-xs">
                              {(season as any).ChildCount != null ? ' • ' : ''}⭐ {season.CommunityRating.toFixed(1)}
                            </Text>
                          )}
                        </View>
                        {season.ProductionYear && (
                          <Text className="text-text-muted text-xs mt-0.5">
                            {season.ProductionYear}
                          </Text>
                        )}
                      </View>
                      <View className="pr-3">
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="text-text-tertiary text-center py-4">No seasons found</Text>
              )}
            </View>
          )}

          {type === 'season' && (
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                {episodes ? `${episodes.Items.length} ${episodes.Items.length === 1 ? 'Episode' : 'Episodes'}` : 'Episodes'}
              </Text>
              {isLoadingEpisodes ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : episodes && episodes.Items.length > 0 ? (
                episodes.Items.map((episode) => {
                  const episodeProgress = getWatchProgress(episode);
                  const hasEpisodeProgress = episodeProgress > 0;
                  const episodeImageTag = episode.ImageTags?.Primary;
                  const episodeImageUrl = episodeImageTag
                    ? getImageUrl(episode.Id, 'Primary', { maxWidth: 300, tag: episodeImageTag })
                    : null;

                  // Episode download status
                  const epDownload = getDownloadByItemId(episode.Id);
                  const epIsDownloaded = isItemDownloaded(episode.Id);
                  const epIsInProgress = epDownload?.status === 'downloading' || epDownload?.status === 'pending';
                  const epIsDownloading = downloadingEpisodeId === episode.Id;

                  return (
                    <View
                      key={episode.Id}
                      className="bg-surface rounded-xl mb-3 overflow-hidden"
                    >
                      <Pressable
                        className="flex-row"
                        onPress={() => router.push(`/player/video?itemId=${episode.Id}`)}
                      >
                        {/* Episode thumbnail */}
                        <View className="w-32 h-20 bg-surface-elevated">
                          {episodeImageUrl ? (
                            <CachedImage
                              uri={episodeImageUrl}
                              style={{ width: 128, height: 80 }}
                            />
                          ) : (
                            <View className="w-full h-full items-center justify-center">
                              <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.3)" />
                            </View>
                          )}
                          {hasEpisodeProgress && (
                            <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                              <View
                                className="h-full"
                                style={{ width: `${episodeProgress}%`, backgroundColor: accentColor }}
                              />
                            </View>
                          )}
                        </View>
                        {/* Episode info */}
                        <View className="flex-1 ml-6 py-2 justify-center">
                          <Text className="text-text-tertiary text-xs mb-0.5">
                            Episode {episode.IndexNumber}
                          </Text>
                          <Text className="text-white font-medium" numberOfLines={1}>
                            {episode.Name}
                          </Text>
                          <View className="flex-row items-center mt-0.5">
                            {episode.RunTimeTicks && (
                              <Text className="text-text-tertiary text-xs">
                                {formatDuration(ticksToMs(episode.RunTimeTicks))}
                              </Text>
                            )}
                            {episode.CommunityRating && (
                              <Text className="text-text-tertiary text-xs">
                                {episode.RunTimeTicks ? ' • ' : ''}⭐ {episode.CommunityRating.toFixed(1)}
                              </Text>
                            )}
                          </View>
                        </View>
                        {/* Action buttons */}
                        <View className="flex-row items-center ml-1 pr-1">
                          {/* Download button */}
                          <Pressable
                            onPress={(e) => {
                              e.stopPropagation();
                              handleEpisodeDownload(episode);
                            }}
                            disabled={epIsDownloading}
                            className="w-10 h-10 items-center justify-center"
                          >
                            {epIsDownloading ? (
                              <ActivityIndicator size="small" color={accentColor} />
                            ) : epIsDownloaded ? (
                              <CheckIcon size={18} color="#22c55e" />
                            ) : epIsInProgress ? (
                              <View style={{ alignItems: 'center' }}>
                                <DownloadIcon size={16} color={accentColor} />
                                <Text style={{ color: accentColor, fontSize: 8 }}>
                                  {epDownload?.progress ?? 0}%
                                </Text>
                              </View>
                            ) : (
                              <DownloadIcon size={18} color="rgba(255,255,255,0.6)" />
                            )}
                          </Pressable>
                          {/* Play button */}
                          <View className="items-center justify-center">
                            <Ionicons name="play-circle" size={28} color={accentColor} />
                          </View>
                        </View>
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Text className="text-text-tertiary text-center py-4">No episodes found</Text>
              )}
            </View>
          )}

          {type === 'album' && (
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                {tracks ? `${tracks.Items.length} ${tracks.Items.length === 1 ? 'Track' : 'Tracks'}` : 'Tracks'}
              </Text>
              {isLoadingTracks ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : tracks && tracks.Items.length > 0 ? (
                tracks.Items.map((track, index) => {
                  const isPlaying = currentItem?.item?.Id === track.Id;
                  const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');
                  return (
                    <View
                      key={track.Id}
                      className="py-4 flex-row items-center border-b border-white/10"
                    >
                      <Pressable
                        className="flex-row items-center flex-1"
                        onPress={() => router.push(`/player/music?itemId=${track.Id}`)}
                      >
                        <View className="w-10 items-center justify-center">
                          {isActive ? (
                            <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
                              <NowPlayingBars isPlaying={playerState === 'playing'} color={accentColor} size="small" />
                            </Animated.View>
                          ) : (
                            <Text className="text-text-tertiary text-center">{index + 1}</Text>
                          )}
                        </View>
                        <Text style={isActive ? { color: accentColor } : undefined} className={isActive ? 'flex-1' : 'text-white flex-1'} numberOfLines={1}>{track.Name}</Text>
                        <Text className="text-text-tertiary text-sm ml-3">
                          {formatDuration(ticksToMs(track.RunTimeTicks ?? 0))}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="w-10 h-10 items-center justify-center ml-2"
                        onPress={() => {
                          setSelectedTrack(track);
                          setShowTrackOptions(true);
                        }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Text className="text-text-tertiary text-center py-4">No tracks found</Text>
              )}
            </View>
          )}

          {type === 'playlist' && (
            <View className="mt-6">
              {playlistError ? (
                <View className="py-4">
                  <Text className="text-red-500 text-center">Error loading tracks: {(playlistError as any)?.message || 'Unknown error'}</Text>
                </View>
              ) : isLoadingPlaylistTracks ? (
                <View className="py-8 items-center">
                  <ActivityIndicator color={accentColor} size="large" />
                </View>
              ) : playlistTracks && playlistTracks.Items.length > 0 ? (
                playlistTracks.Items.map((track, index) => {
                  // Get album art - try AlbumId first, then track's own image
                  const albumId = (track as any).AlbumId || track.Id;
                  const imageTag = (track as any).AlbumPrimaryImageTag || track.ImageTags?.Primary;
                  const trackImageUrl = imageTag
                    ? getImageUrl(albumId, 'Primary', { maxWidth: 100, tag: imageTag })
                    : null;
                  const artistName = track.Artists?.[0] || (track as any).AlbumArtist || '';
                  const albumName = (track as any).Album || '';
                  const isPlaying = currentItem?.item?.Id === track.Id;
                  const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');

                  return (
                    <View
                      key={track.Id}
                      className="py-3 flex-row items-center border-b border-white/10"
                    >
                      <Pressable
                        className="flex-row items-center flex-1"
                        onPress={() => router.push(`/player/music?itemId=${track.Id}`)}
                      >
                        {/* Album Art */}
                        <View className="w-12 h-12 rounded-lg overflow-hidden bg-surface mr-3 relative">
                          {trackImageUrl ? (
                            <CachedImage
                              uri={trackImageUrl}
                              style={{ width: 48, height: 48 }}
                              borderRadius={8}
                            />
                          ) : (
                            <View className="w-full h-full items-center justify-center bg-surface-elevated">
                              <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                          )}
                          {isActive && (
                            <Animated.View
                              entering={FadeIn.duration(200)}
                              exiting={FadeOut.duration(200)}
                              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: accentColor + 'E6', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}
                            >
                              <NowPlayingBars isPlaying={playerState === 'playing'} color="#fff" />
                            </Animated.View>
                          )}
                        </View>
                        <View className="flex-1">
                          <Text style={isActive ? { color: accentColor } : undefined} className={isActive ? 'font-medium' : 'text-white font-medium'} numberOfLines={1}>{track.Name}</Text>
                          {(artistName || albumName) && (
                            <Text className="text-text-tertiary text-sm mt-0.5" numberOfLines={1}>
                              {artistName}{artistName && albumName ? ' • ' : ''}{albumName}
                            </Text>
                          )}
                        </View>
                        <Text className="text-text-tertiary text-sm ml-3">
                          {formatDuration(ticksToMs(track.RunTimeTicks ?? 0))}
                        </Text>
                      </Pressable>
                      <Pressable
                        className="w-10 h-10 items-center justify-center ml-2"
                        onPress={() => {
                          setSelectedTrack(track);
                          setShowTrackOptions(true);
                        }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
                      </Pressable>
                    </View>
                  );
                })
              ) : (
                <Text className="text-text-tertiary text-center py-4">This playlist is empty</Text>
              )}
            </View>
          )}

          {type === 'artist' && (
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">
                {artistAlbums ? `${artistAlbums.TotalRecordCount} ${artistAlbums.TotalRecordCount === 1 ? 'Album' : 'Albums'}` : 'Albums'}
              </Text>
              {isLoadingArtistAlbums ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <View key={i} className="bg-surface p-3 rounded-xl mb-2 flex-row items-center">
                      <View className="w-14 h-14 rounded-lg bg-surface-elevated mr-3" />
                      <View className="flex-1">
                        <View className="h-4 w-32 bg-surface-elevated rounded mb-2" />
                        <View className="h-3 w-16 bg-surface-elevated rounded" />
                      </View>
                    </View>
                  ))}
                </>
              ) : artistAlbums && artistAlbums.Items.length > 0 ? (
                artistAlbums.Items.map((album) => {
                  const albumImageUrl = album.ImageTags?.Primary
                    ? getImageUrl(album.Id, 'Primary', { maxWidth: 200, tag: album.ImageTags.Primary })
                    : null;
                  return (
                    <Pressable
                      key={album.Id}
                      className="bg-surface p-3 rounded-xl mb-2 flex-row items-center"
                      onPress={() => router.push(`/details/album/${album.Id}`)}
                    >
                      <View className="w-14 h-14 rounded-lg overflow-hidden bg-surface mr-3">
                        <CachedImage
                          uri={albumImageUrl}
                          style={{ width: 56, height: 56 }}
                          borderRadius={8}
                          fallbackText={album.Name?.charAt(0) ?? '?'}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white" numberOfLines={1}>{album.Name}</Text>
                        {album.ProductionYear && (
                          <Text className="text-text-tertiary text-sm">{album.ProductionYear}</Text>
                        )}
                      </View>
                      <Text className="text-text-tertiary">{'>'}</Text>
                    </Pressable>
                  );
                })
              ) : (
                <Text className="text-text-tertiary text-center py-4">No albums found</Text>
              )}
            </View>
          )}

          {item.People && item.People.length > 0 && (
            <View className="mt-6">
              <Text className="text-white text-lg font-semibold mb-3">Cast</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {item.People.slice(0, 15).map((person, index) => {
                  const personImageUrl = person.PrimaryImageTag
                    ? getImageUrl(person.Id, 'Primary', { maxWidth: 200, tag: person.PrimaryImageTag })
                    : null;

                  return (
                    <Pressable
                      key={`${person.Id}-${index}`}
                      className="mr-3 items-center w-20"
                      onPress={() => setSelectedPerson({
                        id: person.Id,
                        name: person.Name,
                        imageTag: person.PrimaryImageTag,
                      })}
                    >
                      <View className="w-16 h-16 rounded-full bg-surface overflow-hidden">
                        {personImageUrl ? (
                          <CachedImage
                            uri={personImageUrl}
                            style={{ width: 64, height: 64 }}
                            borderRadius={32}
                          />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <Text className="text-text-tertiary text-lg">
                              {person.Name.charAt(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text
                        className="text-white text-xs mt-2 text-center"
                        numberOfLines={1}
                      >
                        {person.Name}
                      </Text>
                      {person.Role && (
                        <Text
                          className="text-text-tertiary text-xs text-center"
                          numberOfLines={1}
                        >
                          {person.Role}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Similar Items */}
        {similar && similar.Items.length > 0 && (
          <View className="mt-6">
            <MediaRow
              title="Similar"
              items={similar.Items}
              onItemPress={handleItemPress}
            />
          </View>
        )}

      </ScrollView>

      {/* Floating Back Button */}
      <Pressable
        style={{
          position: 'absolute',
          top: insets.top + 8,
          left: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>

      {/* Floating Search Button */}
      <Pressable
        style={{
          position: 'absolute',
          top: insets.top + 8,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(0,0,0,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onPress={() => router.push('/search')}
      >
        <Ionicons name="search" size={20} color="#fff" />
      </Pressable>

      {selectedTrack && (
        <TrackOptionsMenu
          track={selectedTrack}
          visible={showTrackOptions}
          onClose={() => {
            setShowTrackOptions(false);
            setSelectedTrack(null);
          }}
        />
      )}

      {/* Download Options Modal */}
      {(item || selectedEpisodeForDownload) && (
        <DownloadOptionsModal
          item={selectedEpisodeForDownload || item!}
          userId={userId}
          visible={showDownloadOptions}
          onClose={() => {
            setShowDownloadOptions(false);
            setSelectedEpisodeForDownload(null);
          }}
          onConfirm={startDownloadWithOptions}
        />
      )}

      {/* Person Details Modal */}
      <PersonModal
        personId={selectedPerson?.id ?? null}
        personName={selectedPerson?.name}
        personImageTag={selectedPerson?.imageTag}
        visible={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
      />
    </View>
  );
}
