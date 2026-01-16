import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl, getDisplayImageUrl, getDisplayName, navigateToDetails } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface SeasonWithCounts extends BaseItem {
  ChildCount?: number;
  UserData?: BaseItem['UserData'] & {
    UnplayedItemCount?: number;
  };
}

interface SeasonsListProps {
  seasons: { Items: SeasonWithCounts[] } | undefined;
  isLoading: boolean;
  accentColor: string;
  currentDetailsRoute: string;
  hideMedia: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function SeasonsList({
  seasons,
  isLoading,
  accentColor,
  currentDetailsRoute,
  hideMedia,
  t,
}: SeasonsListProps) {
  return (
    <View className="mt-6">
      <Text className="text-white text-lg font-semibold mb-3">
        {seasons ? t('details.seasonsCount', { count: seasons.Items.length }) : t('details.seasons')}
      </Text>
      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : seasons && seasons.Items.length > 0 ? (
        seasons.Items.map((season) => {
          const seasonImageTag = season.ImageTags?.Primary;
          const rawSeasonImageUrl = seasonImageTag
            ? getImageUrl(season.Id, 'Primary', { maxWidth: 200, tag: seasonImageTag })
            : null;
          const seasonImageUrl = getDisplayImageUrl(season.Id, rawSeasonImageUrl, hideMedia, 'Primary');
          const seasonDisplayName = getDisplayName(season, hideMedia);
          const childCount = season.ChildCount ?? 0;
          const unplayedCount = season.UserData?.UnplayedItemCount ?? 0;
          const watchedCount = childCount - unplayedCount;
          const isFullyWatched = childCount > 0 && unplayedCount === 0;
          const hasProgress = childCount > 0 && watchedCount > 0 && !isFullyWatched;
          const progressPercent = childCount > 0 ? (watchedCount / childCount) * 100 : 0;

          return (
            <Pressable
              key={season.Id}
              className="bg-surface rounded-xl mb-3 flex-row items-center overflow-hidden"
              style={isFullyWatched ? { opacity: 0.7 } : undefined}
              onPress={() => navigateToDetails('season', season.Id, currentDetailsRoute)}
            >
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
                {isFullyWatched && (
                  <View
                    className="absolute top-1 right-1 w-5 h-5 rounded-full items-center justify-center"
                    style={{ backgroundColor: accentColor }}
                  >
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </View>
              <View className="flex-1 pl-4 pr-3 py-2">
                <Text className="text-white font-medium">{seasonDisplayName}</Text>
                <View className="flex-row items-center mt-1">
                  {childCount > 0 && (
                    <Text className="text-text-tertiary text-xs">
                      {t('details.episodesCount', { count: childCount })}
                    </Text>
                  )}
                  {season.CommunityRating && (
                    <Text className="text-text-tertiary text-xs">
                      {childCount > 0 ? ' - ' : ''}
                      {season.CommunityRating.toFixed(1)}
                    </Text>
                  )}
                </View>
                {hasProgress && (
                  <View className="mt-1.5">
                    <View className="h-1 bg-surface-elevated rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{ width: `${progressPercent}%`, backgroundColor: accentColor }}
                      />
                    </View>
                    <Text className="text-text-muted text-xs mt-0.5">
                      {watchedCount}/{childCount} watched
                    </Text>
                  </View>
                )}
                {season.ProductionYear && !hideMedia && !hasProgress && (
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
        <Text className="text-text-tertiary text-center py-4">{t('details.noSeasonsFound')}</Text>
      )}
    </View>
  );
}
