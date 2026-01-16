import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { DownloadIcon } from './DownloadIcon';
import { CheckIcon } from './CheckIcon';
import { getImageUrl, getDisplayImageUrl, getWatchProgress, formatDuration, ticksToMs } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface EpisodesListProps {
  episodes: { Items: BaseItem[] } | undefined;
  isLoading: boolean;
  accentColor: string;
  type: string;
  id: string;
  from?: string;
  hideMedia: boolean;
  isBatchDownloading: boolean;
  downloadingEpisodeId: string | null;
  getDownloadByItemId: (id: string) => { status: string; progress: number } | undefined;
  isItemDownloaded: (id: string) => boolean;
  onSeasonDownload: () => void;
  onEpisodeDownload: (episode: BaseItem) => void;
  onEpisodePress?: (episode: BaseItem) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function EpisodesList({
  episodes,
  isLoading,
  accentColor,
  type,
  id,
  from,
  hideMedia,
  isBatchDownloading,
  downloadingEpisodeId,
  getDownloadByItemId,
  isItemDownloaded,
  onSeasonDownload,
  onEpisodeDownload,
  onEpisodePress,
  t,
}: EpisodesListProps) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-white text-lg font-semibold">
          {episodes ? t('details.episodesCount', { count: episodes.Items.length }) : t('details.episodes')}
        </Text>
        {episodes && episodes.Items.length > 0 && (
          <Pressable
            onPress={onSeasonDownload}
            disabled={isBatchDownloading}
            className="flex-row items-center px-3 py-2 rounded-lg"
            style={{ backgroundColor: accentColor + '20' }}
          >
            {isBatchDownloading ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <>
                <DownloadIcon size={16} color={accentColor} />
                <Text style={{ color: accentColor }} className="text-sm font-medium ml-2">
                  {t('details.downloadSeason')}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </View>
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : episodes && episodes.Items.length > 0 ? (
        episodes.Items.map((episode) => {
          const episodeProgress = getWatchProgress(episode);
          const hasEpisodeProgress = episodeProgress > 0;
          const isWatched = episode.UserData?.Played === true;
          const episodeImageTag = episode.ImageTags?.Primary;
          const rawEpisodeImageUrl = episodeImageTag
            ? getImageUrl(episode.Id, 'Primary', { maxWidth: 300, tag: episodeImageTag })
            : null;
          const episodeImageUrl = getDisplayImageUrl(episode.Id, rawEpisodeImageUrl, hideMedia, 'Primary');
          const episodeDisplayName = hideMedia ? `Episode ${episode.IndexNumber}` : episode.Name;

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
                style={isWatched ? { opacity: 0.7 } : undefined}
                onPress={() => {
                  if (onEpisodePress) {
                    onEpisodePress(episode);
                  } else {
                    const detailsRoute = `/details/${type}/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
                    router.push(`/player/video?itemId=${episode.Id}&from=${encodeURIComponent(detailsRoute)}`);
                  }
                }}
              >
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
                  {hasEpisodeProgress && !isWatched && (
                    <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <View
                        className="h-full"
                        style={{ width: `${episodeProgress}%`, backgroundColor: accentColor }}
                      />
                    </View>
                  )}
                  {isWatched && (
                    <View
                      className="absolute top-1 right-1 w-5 h-5 rounded-full items-center justify-center"
                      style={{ backgroundColor: accentColor }}
                    >
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <View className="flex-1 ml-3 py-2 justify-center">
                  <Text className="text-text-tertiary text-xs mb-0.5">
                    {t('details.episode')} {episode.IndexNumber}
                  </Text>
                  <Text className="text-white font-medium" numberOfLines={1}>
                    {episodeDisplayName}
                  </Text>
                  <View className="flex-row items-center mt-0.5">
                    {episode.RunTimeTicks && (
                      <Text className="text-text-tertiary text-xs">
                        {formatDuration(ticksToMs(episode.RunTimeTicks))}
                      </Text>
                    )}
                    {episode.CommunityRating && (
                      <Text className="text-text-tertiary text-xs">
                        {episode.RunTimeTicks ? ' - ' : ''}{episode.CommunityRating.toFixed(1)}
                      </Text>
                    )}
                  </View>
                </View>
                <View className="flex-row items-center pr-1">
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onEpisodeDownload(episode);
                    }}
                    disabled={epIsDownloading}
                    className="w-9 h-10 items-center justify-center"
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
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      const detailsRoute = `/details/${type}/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
                      router.push(`/player/video?itemId=${episode.Id}&from=${encodeURIComponent(detailsRoute)}`);
                    }}
                    className="w-9 h-10 items-center justify-center"
                  >
                    <Ionicons name="play-circle" size={28} color={accentColor} />
                  </Pressable>
                </View>
              </Pressable>
            </View>
          );
        })
      ) : (
        <Text className="text-text-tertiary text-center py-4">{t('details.noEpisodesFound')}</Text>
      )}
    </View>
  );
}
