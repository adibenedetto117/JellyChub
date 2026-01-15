import { View, Text, Pressable } from 'react-native';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { formatDuration, formatYear, formatRating, ticksToMs, navigateToDetails } from '@/utils';
import type { BaseItem, Episode } from '@/types/jellyfin';

interface MediaInfoProps {
  item: BaseItem;
  type: string;
  posterUrl: string | null;
  displayName: string;
  displaySeriesName: string;
  duration: string;
  artistAlbumsCount?: number;
  collectionItemsCount?: number;
  playlistTracksCount?: number;
  playlistTotalDuration?: number;
  from?: string;
  hideMedia: boolean;
}

export function MediaInfo({
  item,
  type,
  posterUrl,
  displayName,
  displaySeriesName,
  duration,
  artistAlbumsCount,
  collectionItemsCount,
  playlistTracksCount,
  playlistTotalDuration,
  from,
  hideMedia,
}: MediaInfoProps) {
  return (
    <View className="flex-row">
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

      <View className="flex-1 justify-end pb-1">
        {type === 'season' && displaySeriesName && (
          <Pressable onPress={() => navigateToDetails('series', item.SeriesId || item.ParentId || '', from || '/(tabs)/home')}>
            <Text className="text-text-secondary text-sm mb-1" numberOfLines={1}>
              {displaySeriesName}
            </Text>
          </Pressable>
        )}
        {type === 'episode' && displaySeriesName && (
          <Pressable onPress={() => navigateToDetails('series', (item as Episode).SeriesId || '', from || '/(tabs)/home')}>
            <Text className="text-text-secondary text-sm mb-1" numberOfLines={1}>
              {displaySeriesName} • S{item.ParentIndexNumber} E{item.IndexNumber}
            </Text>
          </Pressable>
        )}
        <Text className="text-white text-xl font-bold" numberOfLines={2}>
          {displayName}
        </Text>

        <View className="flex-row items-center mt-2 flex-wrap">
          {type === 'artist' && artistAlbumsCount !== undefined && (
            <Text className="text-text-secondary text-sm mr-3">
              {artistAlbumsCount} {artistAlbumsCount === 1 ? 'Album' : 'Albums'}
            </Text>
          )}
          {type === 'boxset' && collectionItemsCount !== undefined && (
            <Text className="text-text-secondary text-sm mr-3">
              {collectionItemsCount} {collectionItemsCount === 1 ? 'item' : 'items'}
            </Text>
          )}
          {item?.ProductionYear && (
            <Text className="text-text-secondary text-sm mr-3">
              {formatYear(item.ProductionYear)}
            </Text>
          )}
          {type !== 'artist' && type !== 'playlist' && type !== 'series' && type !== 'season' && type !== 'boxset' && duration && (
            <Text className="text-text-secondary text-sm mr-3">
              {duration}
            </Text>
          )}
          {type === 'playlist' && playlistTracksCount !== undefined && playlistTracksCount > 0 && (
            <Text className="text-text-secondary text-sm mr-3">
              {playlistTracksCount} {playlistTracksCount === 1 ? 'track' : 'tracks'} • {formatDuration(ticksToMs(playlistTotalDuration ?? 0))}
            </Text>
          )}
          {item?.OfficialRating && (
            <View className="bg-surface px-2 py-0.5 rounded mr-3">
              <Text className="text-text-secondary text-xs">
                {item.OfficialRating}
              </Text>
            </View>
          )}
          {item?.CommunityRating && (
            <Text className="text-accent text-sm">
              {formatRating(item.CommunityRating)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
