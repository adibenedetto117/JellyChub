import { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, usePlayerStore, useDownloadStore } from '@/stores';
import {
  getItem,
  getImageUrl,
  getSimilarItems,
  getSeasons,
  getEpisodes,
  getAlbumTracks,
  getArtistAlbums,
  getPlaylistItems,
  getCollectionItems,
  getNextUp,
  markAsFavorite,
} from '@/api';
import {
  formatDuration,
  ticksToMs,
  getWatchProgress,
  getDisplayName,
  getDisplayImageUrl,
  getDisplaySeriesName,
  goBack,
  navigateToDetails,
} from '@/utils';
import { downloadManager } from '@/services';
import type { DownloadQuality } from '@/components/shared/media';
import type { BaseItem, Episode } from '@/types/jellyfin';

export function useDetailsScreen() {
  const { t } = useTranslation();
  const {
    type: rawType,
    id,
    from,
    autoplay,
  } = useLocalSearchParams<{ type: string; id: string; from?: string; autoplay?: string }>();
  const type = rawType?.toLowerCase();
  const shouldAutoplay = autoplay === 'true';

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((state) => state.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const playerState = usePlayerStore((s) => s.playerState);
  const { getDownloadByItemId, isItemDownloaded } = useDownloadStore();
  const userId = currentUser?.Id ?? '';
  const queryClient = useQueryClient();

  const [selectedTrack, setSelectedTrack] = useState<BaseItem | null>(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [downloadingEpisodeId, setDownloadingEpisodeId] = useState<string | null>(null);
  const [selectedEpisodeForDownload, setSelectedEpisodeForDownload] = useState<BaseItem | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<{ id: string; name: string; imageTag?: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState<boolean | null>(null);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [autoplayTriggered, setAutoplayTriggered] = useState(false);

  const contentOpacity = useSharedValue(0);

  const downloadItem = id ? getDownloadByItemId(id) : undefined;
  const isDownloaded = id ? isItemDownloaded(id) : false;
  const isDownloadInProgress = downloadItem?.status === 'downloading' || downloadItem?.status === 'pending';

  const {
    data: item,
    isLoading,
    error: itemError,
  } = useQuery({
    queryKey: ['item', userId, id],
    queryFn: () => getItem(userId, id!),
    enabled: !!userId && !!id,
    staleTime: Infinity,
  });

  const currentFavorite = isFavorite ?? item?.UserData?.IsFavorite ?? false;

  const favoriteMutation = useMutation({
    mutationFn: ({ itemId, favorite }: { itemId: string; favorite: boolean }) =>
      markAsFavorite(userId, itemId, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item', userId, id] });
      queryClient.invalidateQueries({ queryKey: ['favorites', userId] });
    },
  });

  const { data: similar } = useQuery({
    queryKey: ['similar', id, userId],
    queryFn: () => getSimilarItems(id!, userId),
    enabled: !!userId && !!id,
  });

  const { data: seasons, isLoading: isLoadingSeasons } = useQuery({
    queryKey: ['seasons', id, userId],
    queryFn: () => getSeasons(id!, userId),
    enabled: !!userId && !!id && type === 'series',
  });

  const { data: tracks, isLoading: isLoadingTracks } = useQuery({
    queryKey: ['tracks', id, userId],
    queryFn: () => getAlbumTracks(id!, userId),
    enabled: !!userId && !!id && type === 'album',
  });

  const {
    data: playlistTracks,
    isLoading: isLoadingPlaylistTracks,
    error: playlistError,
  } = useQuery({
    queryKey: ['playlist-items', id],
    queryFn: () => getPlaylistItems(id!, userId),
    enabled: !!userId && !!id && type === 'playlist',
  });

  const { data: artistAlbums, isLoading: isLoadingArtistAlbums } = useQuery({
    queryKey: ['artistAlbums', id, userId],
    queryFn: () => getArtistAlbums(id!, userId),
    enabled: !!userId && !!id && type === 'artist',
    staleTime: 1000 * 60 * 60,
  });

  const { data: collectionItems, isLoading: isLoadingCollectionItems } = useQuery({
    queryKey: ['collectionItems', id, userId],
    queryFn: () => getCollectionItems(userId, id!),
    enabled: !!userId && !!id && type === 'boxset',
  });

  const seriesId = item?.SeriesId || item?.ParentId;
  const { data: episodes, isLoading: isLoadingEpisodes } = useQuery({
    queryKey: ['episodes', seriesId, id, userId],
    queryFn: () => getEpisodes(seriesId!, userId, id!),
    enabled: !!userId && !!id && !!seriesId && type === 'season',
    staleTime: Infinity,
  });

  const { data: nextUp } = useQuery({
    queryKey: ['nextUp', id, userId],
    queryFn: () => getNextUp(userId, id!, 1),
    enabled: !!userId && !!id && type === 'series',
  });

  useEffect(() => {
    contentOpacity.value = 0;
    setContentReady(false);
    setAutoplayTriggered(false);
  }, [id, contentOpacity]);

  useEffect(() => {
    if (item) {
      requestAnimationFrame(() => {
        contentOpacity.value = withTiming(1, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      });
      setContentReady(true);
    }
  }, [item, contentOpacity]);

  useEffect(() => {
    if (shouldAutoplay && !autoplayTriggered && type === 'series' && item && nextUp !== undefined && id) {
      setAutoplayTriggered(true);
      const nextUpEpisode = nextUp?.Items?.[0];
      if (nextUpEpisode) {
        const progress = nextUpEpisode.UserData?.PlaybackPositionTicks ?? 0;
        const hasProgress = progress > 0 && progress < (nextUpEpisode.RunTimeTicks ?? 0);
        const detailsRoute = `/details/${type}/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
        router.replace(
          `/player/video?itemId=${nextUpEpisode.Id}${hasProgress ? '&resume=true' : ''}&from=${encodeURIComponent(detailsRoute)}`
        );
      }
    }
  }, [shouldAutoplay, autoplayTriggered, type, item, nextUp, id, from]);

  const handleGoBack = useCallback(() => {
    const fallback = type === 'boxset' ? '/(tabs)/library' : '/(tabs)/home';
    goBack(from, fallback);
  }, [type, from]);

  const handleToggleFavorite = useCallback(async () => {
    if (!id) return;
    const newValue = !currentFavorite;
    setIsFavorite(newValue);
    try {
      await favoriteMutation.mutateAsync({ itemId: id, favorite: newValue });
    } catch {
      setIsFavorite(!newValue);
    }
  }, [id, currentFavorite, favoriteMutation]);

  const nextUpEpisode = nextUp?.Items?.[0];
  const nextUpProgress = nextUpEpisode ? getWatchProgress(nextUpEpisode) : 0;
  const hasNextUpProgress = nextUpProgress > 0 && nextUpProgress < 100;

  const getSeasonPlayEpisode = useCallback(() => {
    if (!episodes?.Items?.length) return null;
    const inProgressEp = episodes.Items.find((ep) => {
      const prog = getWatchProgress(ep);
      return prog > 0 && prog < 100;
    });
    if (inProgressEp) return inProgressEp;
    const unwatchedEp = episodes.Items.find((ep) => !ep.UserData?.Played);
    if (unwatchedEp) return unwatchedEp;
    return episodes.Items[0];
  }, [episodes]);

  const seasonPlayEpisode = type === 'season' ? getSeasonPlayEpisode() : null;
  const seasonEpisodeProgress = seasonPlayEpisode ? getWatchProgress(seasonPlayEpisode) : 0;
  const hasSeasonProgress = seasonEpisodeProgress > 0 && seasonEpisodeProgress < 100;

  const handlePlay = useCallback(
    (resume = false) => {
      if (!item) return;
      const detailsRoute = `/details/${type}/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
      const fromParam = `&from=${encodeURIComponent(detailsRoute)}`;

      if (type === 'movie' || type === 'episode') {
        router.push(`/player/video?itemId=${item.Id}${resume ? '&resume=true' : ''}${fromParam}`);
      } else if (type === 'series') {
        if (nextUpEpisode) {
          router.push(
            `/player/video?itemId=${nextUpEpisode.Id}${hasNextUpProgress ? '&resume=true' : ''}${fromParam}`
          );
        } else if (seasons?.Items?.[0]) {
          navigateToDetails('season', seasons.Items[0].Id, detailsRoute);
        }
      } else if (type === 'season') {
        if (seasonPlayEpisode) {
          router.push(
            `/player/video?itemId=${seasonPlayEpisode.Id}${hasSeasonProgress ? '&resume=true' : ''}${fromParam}`
          );
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
    },
    [item, type, id, from, nextUpEpisode, hasNextUpProgress, seasons, seasonPlayEpisode, hasSeasonProgress, tracks, playlistTracks]
  );

  const handleShuffle = useCallback(() => {
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
  }, [type, tracks, playlistTracks, setQueue]);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;

    if (isDownloaded) {
      Alert.alert('Already Downloaded', `${item.Name} is already downloaded and ready to play offline.`);
      return;
    }

    if (isDownloadInProgress) {
      Alert.alert(
        'Download in Progress',
        `${item.Name} is ${downloadItem?.status === 'downloading' ? `downloading (${downloadItem.progress}%)` : 'queued for download'}.`
      );
      return;
    }

    setShowDownloadOptions(true);
  }, [item, activeServerId, isDownloaded, isDownloadInProgress, downloadItem]);

  const startDownloadWithOptions = useCallback(
    async (audioIndex?: number, subtitleIndex?: number, quality?: DownloadQuality) => {
      if (selectedEpisodeForDownload) {
        const episode = selectedEpisodeForDownload;
        setShowDownloadOptions(false);
        setSelectedEpisodeForDownload(null);
        setDownloadingEpisodeId(episode.Id);

        try {
          await downloadManager.startDownload(episode, activeServerId!, quality);
          Alert.alert('Download Started', `${episode.Name} has been added to your downloads.`);
        } catch (error) {
          Alert.alert('Download Failed', 'Could not start download. Please try again.');
        } finally {
          setDownloadingEpisodeId(null);
        }
        return;
      }

      if (!item || !activeServerId) return;

      setShowDownloadOptions(false);
      setIsDownloading(true);

      try {
        await downloadManager.startDownload(item, activeServerId, quality);
        Alert.alert('Download Started', `${item.Name} has been added to your downloads.`);
      } catch (error) {
        Alert.alert('Download Failed', 'Could not start download. Please try again.');
      } finally {
        setIsDownloading(false);
      }
    },
    [selectedEpisodeForDownload, item, activeServerId]
  );

  const handleEpisodeDownload = useCallback(
    (episode: BaseItem) => {
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
    },
    [activeServerId, getDownloadByItemId, isItemDownloaded]
  );

  const handleSeasonDownload = useCallback(async () => {
    if (!activeServerId || !episodes?.Items?.length) return;

    const notDownloaded = episodes.Items.filter((ep) => {
      const epDownload = getDownloadByItemId(ep.Id);
      const epIsDownloaded = isItemDownloaded(ep.Id);
      const epIsInProgress = epDownload?.status === 'downloading' || epDownload?.status === 'pending';
      return !epIsDownloaded && !epIsInProgress;
    });

    if (notDownloaded.length === 0) {
      Alert.alert('Already Downloaded', 'All episodes in this season are already downloaded or in progress.');
      return;
    }

    setIsBatchDownloading(true);
    try {
      const downloadIds = await downloadManager.startBatchDownload(notDownloaded, activeServerId);
      Alert.alert(
        'Downloads Started',
        `${downloadIds.length} episode${downloadIds.length !== 1 ? 's' : ''} added to download queue.`
      );
    } catch (error) {
      Alert.alert('Download Failed', 'Could not start batch download. Please try again.');
    } finally {
      setIsBatchDownloading(false);
    }
  }, [activeServerId, episodes, getDownloadByItemId, isItemDownloaded]);

  const handleDownloadAlbum = useCallback(async () => {
    if (!activeServerId || !tracks?.Items?.length) return;

    const notDownloaded = tracks.Items.filter((track) => {
      const trackDownload = getDownloadByItemId(track.Id);
      const trackIsDownloaded = isItemDownloaded(track.Id);
      const trackIsInProgress = trackDownload?.status === 'downloading' || trackDownload?.status === 'pending';
      return !trackIsDownloaded && !trackIsInProgress;
    });

    if (notDownloaded.length === 0) {
      Alert.alert('Already Downloaded', 'All tracks in this album are already downloaded or in progress.');
      return;
    }

    setIsBatchDownloading(true);
    try {
      const downloadIds = await downloadManager.startBatchDownload(notDownloaded, activeServerId);
      Alert.alert(
        'Downloads Started',
        `${downloadIds.length} track${downloadIds.length !== 1 ? 's' : ''} added to download queue.`
      );
    } catch (error) {
      Alert.alert('Download Failed', 'Could not start batch download. Please try again.');
    } finally {
      setIsBatchDownloading(false);
    }
  }, [activeServerId, tracks, getDownloadByItemId, isItemDownloaded]);

  const currentDetailsRoute = `/details/${type}/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;

  const handleItemPress = useCallback(
    (pressedItem: BaseItem) => {
      navigateToDetails(pressedItem.Type.toLowerCase(), pressedItem.Id, currentDetailsRoute);
    },
    [currentDetailsRoute]
  );

  const backdropTag = item?.BackdropImageTags?.[0];
  const parentBackdropTag = (item as any)?.ParentBackdropImageTags?.[0];
  const parentIdForBackdrop = item?.SeriesId || item?.ParentId;
  const posterTag = item?.ImageTags?.Primary;

  const rawBackdropUrl = backdropTag
    ? getImageUrl(item!.Id, 'Backdrop', { maxWidth: 1920, tag: backdropTag })
    : parentBackdropTag && parentIdForBackdrop
      ? getImageUrl(parentIdForBackdrop, 'Backdrop', { maxWidth: 1920, tag: parentBackdropTag })
      : posterTag
        ? getImageUrl(item!.Id, 'Primary', { maxWidth: 1920, tag: posterTag })
        : null;
  const backdropUrl = item ? getDisplayImageUrl(item.Id, rawBackdropUrl, hideMedia, 'Backdrop') : null;

  const rawPosterUrl = posterTag ? getImageUrl(item!.Id, 'Primary', { maxWidth: 400, tag: posterTag }) : null;
  const posterUrl = item ? getDisplayImageUrl(item.Id, rawPosterUrl, hideMedia, 'Primary') : null;

  const displayName = item ? getDisplayName(item, hideMedia) : '';
  const displaySeriesName = item ? getDisplaySeriesName(item as Episode, hideMedia) : '';

  const progress = item ? getWatchProgress(item) : 0;
  const hasProgress = progress > 0 && progress < 100;
  const duration = item ? formatDuration(ticksToMs(item.RunTimeTicks ?? 0)) : '';

  const openTrackOptions = useCallback((track: BaseItem) => {
    setSelectedTrack(track);
    setShowTrackOptions(true);
  }, []);

  const closeTrackOptions = useCallback(() => {
    setShowTrackOptions(false);
    setSelectedTrack(null);
  }, []);

  const closeDownloadOptions = useCallback(() => {
    setShowDownloadOptions(false);
    setSelectedEpisodeForDownload(null);
  }, []);

  return {
    t,
    rawType,
    type,
    id,
    from,

    accentColor,
    hideMedia,
    userId,

    item,
    isLoading,
    itemError,

    similar,
    seasons,
    isLoadingSeasons,
    tracks,
    isLoadingTracks,
    playlistTracks,
    isLoadingPlaylistTracks,
    playlistError,
    artistAlbums,
    isLoadingArtistAlbums,
    collectionItems,
    isLoadingCollectionItems,
    episodes,
    isLoadingEpisodes,
    nextUp,
    nextUpEpisode,
    nextUpProgress,
    hasNextUpProgress,

    seasonPlayEpisode,
    seasonEpisodeProgress,
    hasSeasonProgress,

    contentOpacity,
    contentReady,

    backdropUrl,
    posterUrl,
    displayName,
    displaySeriesName,
    progress,
    hasProgress,
    duration,

    selectedTrack,
    showTrackOptions,
    openTrackOptions,
    closeTrackOptions,

    isDownloading,
    isDownloaded,
    isDownloadInProgress,
    downloadItem,
    showDownloadOptions,
    selectedEpisodeForDownload,
    downloadingEpisodeId,
    isBatchDownloading,
    closeDownloadOptions,

    selectedPerson,
    setSelectedPerson,

    currentFavorite,
    isFavoritePending: favoriteMutation.isPending,

    currentDetailsRoute,
    currentItem,
    playerState,
    setQueue,
    getDownloadByItemId,
    isItemDownloaded,

    handleGoBack,
    handleToggleFavorite,
    handlePlay,
    handleShuffle,
    handleDownload,
    startDownloadWithOptions,
    handleEpisodeDownload,
    handleSeasonDownload,
    handleDownloadAlbum,
    handleItemPress,
  };
}
