import { View, Text, Pressable } from 'react-native';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl, getDisplayImageUrl, navigateToDetails } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

interface ArtistAlbumsListProps {
  albums: { Items: BaseItem[]; TotalRecordCount: number } | undefined;
  isLoading: boolean;
  accentColor: string;
  currentDetailsRoute: string;
  hideMedia: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function ArtistAlbumsList({
  albums,
  isLoading,
  accentColor,
  currentDetailsRoute,
  hideMedia,
  t,
}: ArtistAlbumsListProps) {
  return (
    <View className="mt-6">
      <Text className="text-white text-lg font-semibold mb-3">
        {albums ? t('details.albumsCount', { count: albums.TotalRecordCount }) : t('details.albums')}
      </Text>
      {isLoading ? (
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
      ) : albums && albums.Items.length > 0 ? (
        albums.Items.map((album, albumIndex) => {
          const rawAlbumImageUrl = album.ImageTags?.Primary
            ? getImageUrl(album.Id, 'Primary', { maxWidth: 200, tag: album.ImageTags.Primary })
            : null;
          const albumImageUrl = getDisplayImageUrl(album.Id, rawAlbumImageUrl, hideMedia, 'Primary');
          const albumDisplayName = hideMedia ? `Album ${albumIndex + 1}` : album.Name;
          const albumYear = hideMedia ? '2024' : album.ProductionYear;
          return (
            <Pressable
              key={album.Id}
              className="bg-surface p-3 rounded-xl mb-2 flex-row items-center"
              onPress={() => navigateToDetails('album', album.Id, currentDetailsRoute)}
            >
              <View className="w-14 h-14 rounded-lg overflow-hidden bg-surface mr-3">
                <CachedImage
                  uri={albumImageUrl}
                  style={{ width: 56, height: 56 }}
                  borderRadius={8}
                  fallbackText={albumDisplayName?.charAt(0) ?? '?'}
                />
              </View>
              <View className="flex-1">
                <Text className="text-white" numberOfLines={1}>{albumDisplayName}</Text>
                {albumYear && (
                  <Text className="text-text-tertiary text-sm">{albumYear}</Text>
                )}
              </View>
              <Text className="text-text-tertiary">{'>'}</Text>
            </Pressable>
          );
        })
      ) : (
        <Text className="text-text-tertiary text-center py-4">{t('details.noAlbumsFound')}</Text>
      )}
    </View>
  );
}
