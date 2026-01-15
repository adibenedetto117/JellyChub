import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl, getDisplayImageUrl, getDisplayName, getWatchProgress, formatDuration, ticksToMs, navigateToDetails } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface CollectionItemsListProps {
  items: { Items: BaseItem[]; TotalRecordCount: number } | undefined;
  isLoading: boolean;
  accentColor: string;
  currentDetailsRoute: string;
  hideMedia: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function CollectionItemsList({
  items,
  isLoading,
  accentColor,
  currentDetailsRoute,
  hideMedia,
  t,
}: CollectionItemsListProps) {
  return (
    <View className="mt-6">
      <Text className="text-white text-lg font-semibold mb-3">
        {items ? t('details.itemsCount', { count: items.TotalRecordCount }) : t('details.items')}
      </Text>
      {isLoading ? (
        <>
          {[1, 2, 3].map((i) => (
            <View key={i} className="bg-surface p-3 rounded-xl mb-2 flex-row items-center">
              <View className="w-16 h-24 rounded-lg bg-surface-elevated mr-3" />
              <View className="flex-1">
                <View className="h-4 w-32 bg-surface-elevated rounded mb-2" />
                <View className="h-3 w-16 bg-surface-elevated rounded" />
              </View>
            </View>
          ))}
        </>
      ) : items && items.Items.length > 0 ? (
        items.Items.map((collectionItem) => {
          const itemProgress = getWatchProgress(collectionItem);
          const hasItemProgress = itemProgress > 0;
          const itemImageTag = collectionItem.ImageTags?.Primary;
          const rawItemImageUrl = itemImageTag
            ? getImageUrl(collectionItem.Id, 'Primary', { maxWidth: 200, tag: itemImageTag })
            : null;
          const itemImageUrl = getDisplayImageUrl(collectionItem.Id, rawItemImageUrl, hideMedia, 'Primary');
          const itemDisplayName = getDisplayName(collectionItem, hideMedia);
          const itemType = collectionItem.Type?.toLowerCase();

          return (
            <Pressable
              key={collectionItem.Id}
              className="bg-surface rounded-xl mb-3 flex-row items-center overflow-hidden"
              onPress={() => navigateToDetails(itemType || 'item', collectionItem.Id, currentDetailsRoute)}
            >
              <View className="w-16 h-24 bg-surface-elevated">
                {itemImageUrl ? (
                  <CachedImage
                    uri={itemImageUrl}
                    style={{ width: 64, height: 96 }}
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Ionicons name="film-outline" size={24} color="rgba(255,255,255,0.3)" />
                  </View>
                )}
                {hasItemProgress && (
                  <View className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                    <View
                      className="h-full"
                      style={{ width: `${itemProgress}%`, backgroundColor: accentColor }}
                    />
                  </View>
                )}
              </View>
              <View className="flex-1 pl-4 pr-3 py-2">
                <Text className="text-white font-medium" numberOfLines={2}>{itemDisplayName}</Text>
                <View className="flex-row items-center mt-1">
                  {collectionItem.ProductionYear && (
                    <Text className="text-text-tertiary text-xs">
                      {collectionItem.ProductionYear}
                    </Text>
                  )}
                  {collectionItem.RunTimeTicks && (
                    <Text className="text-text-tertiary text-xs">
                      {collectionItem.ProductionYear ? ' • ' : ''}{formatDuration(ticksToMs(collectionItem.RunTimeTicks))}
                    </Text>
                  )}
                  {collectionItem.CommunityRating && (
                    <Text className="text-text-tertiary text-xs">
                      {(collectionItem.ProductionYear || collectionItem.RunTimeTicks) ? ' • ' : ''}⭐ {collectionItem.CommunityRating.toFixed(1)}
                    </Text>
                  )}
                </View>
              </View>
              <View className="pr-3">
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
              </View>
            </Pressable>
          );
        })
      ) : (
        <Text className="text-text-tertiary text-center py-4">{t('details.noItemsFound')}</Text>
      )}
    </View>
  );
}
