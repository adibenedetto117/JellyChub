import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useResponsive } from '@/hooks';
import {
  getItems,
  getImageUrl,
  getLibraryIcon,
} from '@/api';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { SkeletonRow } from '@/components/shared/ui/Skeleton';
import { getDisplayName, getDisplayImageUrl, navigateToLibrary, navigateToDetails } from '@/utils';
import type { BaseItem, Library, CollectionType } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function getIoniconName(iconName: string): keyof typeof Ionicons.glyphMap {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    film: 'film-outline',
    tv: 'tv-outline',
    'musical-notes': 'musical-notes-outline',
    videocam: 'videocam-outline',
    book: 'book-outline',
    headset: 'headset-outline',
    home: 'home-outline',
    folder: 'folder-outline',
    list: 'list-outline',
    library: 'library-outline',
  };
  return iconMap[iconName] ?? 'library-outline';
}

function getItemTypes(collectionType: CollectionType): string[] {
  if (!collectionType) return ['Movie', 'Series', 'MusicAlbum'];
  const typeMap: Record<string, string[]> = {
    movies: ['Movie'],
    tvshows: ['Series'],
    music: ['MusicAlbum'],
    books: ['Book', 'AudioBook'],
    audiobooks: ['AudioBook'],
    musicvideos: ['MusicVideo'],
    homevideos: ['Video'],
    boxsets: ['BoxSet'],
    playlists: ['Playlist'],
  };
  return typeMap[collectionType] || ['Movie', 'Series', 'MusicAlbum'];
}

interface LibraryContentRowProps {
  library: Library;
  userId: string;
  accentColor: string;
  hideMedia: boolean;
}

export const LibraryContentRow = memo(function LibraryContentRow({
  library,
  userId,
  accentColor,
  hideMedia,
}: LibraryContentRowProps) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const itemTypes = getItemTypes(library.CollectionType);
  const isSquare = library.CollectionType === 'music';
  const iconName = getLibraryIcon(library.CollectionType);

  const cardWidth = isTV ? 180 : isTablet ? 140 : isSquare ? 110 : 100;
  const cardHeight = isSquare ? cardWidth : cardWidth * 1.5;
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const { data, isLoading } = useQuery({
    queryKey: ['libraryPreview', userId, library.Id],
    queryFn: () => getItems<BaseItem>(userId, {
      parentId: library.Id,
      includeItemTypes: itemTypes,
      sortBy: 'DateCreated',
      sortOrder: 'Descending',
      limit: isTablet ? 15 : 10,
      recursive: true,
    }),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const handleSeeAll = useCallback(() => {
    if (library.CollectionType === 'movies') {
      router.push('/(tabs)/movies');
    } else if (library.CollectionType === 'tvshows') {
      router.push('/(tabs)/shows');
    } else if (library.CollectionType === 'music') {
      router.push('/(tabs)/music');
    } else if (library.CollectionType === 'books' || library.CollectionType === 'audiobooks') {
      router.push('/(tabs)/books');
    } else {
      navigateToLibrary(library.Id, '/(tabs)/library');
    }
  }, [library.CollectionType, library.Id]);

  const handleItemPress = useCallback((item: BaseItem) => {
    if (!item?.Id) return;
    const type = item.Type?.toLowerCase();
    if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      const detailType = type === 'musicalbum' ? 'album' : type;
      navigateToDetails(detailType || 'item', item.Id, '/(tabs)/library');
    }
  }, []);

  const items = data?.Items ?? [];

  const backdropItem = items.find(item => item.BackdropImageTags?.length);
  const backdropTag = backdropItem?.BackdropImageTags?.[0];
  const rawBackdropUrl = backdropTag && backdropItem
    ? getImageUrl(backdropItem.Id, 'Backdrop', { maxWidth: SCREEN_WIDTH, tag: backdropTag })
    : null;
  const backdropUrl = getDisplayImageUrl(backdropItem?.Id ?? '', rawBackdropUrl, hideMedia, 'Backdrop');

  if (isLoading && !data) {
    return <SkeletonRow cardWidth={cardWidth} cardHeight={cardHeight} count={4} isSquare={isSquare} />;
  }

  if (items.length === 0) return null;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={{ marginBottom: isTablet ? 32 : 28 }}>
      <Pressable onPress={handleSeeAll} style={{ marginBottom: isTablet ? 16 : 14 }}>
        <View style={[styles.sectionHeaderWithImage, { marginHorizontal: horizontalPadding }]}>
          {backdropUrl && (
            <>
              <CachedImage
                uri={backdropUrl}
                style={StyleSheet.absoluteFill}
                borderRadius={12}
              />
              <LinearGradient
                colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.85)']}
                style={[StyleSheet.absoluteFill, { borderRadius: 12 }]}
              />
            </>
          )}
          <View style={styles.sectionHeaderContent}>
            <View style={[styles.sectionIconBadge, { backgroundColor: accentColor }]}>
              <Ionicons name={getIoniconName(iconName)} size={16} color="#fff" />
            </View>
            <Text style={[styles.sectionLibraryName, { fontSize: fontSize.lg, flex: 1 }]}>{library.Name}</Text>
            <View style={[styles.seeAllPill, { backgroundColor: accentColor }]}>
              <Text style={styles.seeAllPillText}>Browse All</Text>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </View>
      </Pressable>

      <Text style={[styles.recentlyAddedLabel, { paddingHorizontal: horizontalPadding, fontSize: fontSize.sm }]}>
        Recently Added
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding, gap: 12 }}
      >
        {items.map((item) => {
          const posterTag = item.ImageTags?.Primary;
          const rawPosterUrl = posterTag
            ? getImageUrl(item.Id, 'Primary', { maxWidth: cardWidth * 2, tag: posterTag })
            : null;
          const posterUrl = getDisplayImageUrl(item.Id, rawPosterUrl, hideMedia, 'Primary');
          const displayName = getDisplayName(item, hideMedia);

          return (
            <Pressable key={item.Id} onPress={() => handleItemPress(item)}>
              <View style={[styles.contentCard, { width: cardWidth, height: cardHeight }]}>
                <CachedImage
                  uri={posterUrl}
                  style={{ width: cardWidth, height: cardHeight }}
                  borderRadius={10}
                  fallbackText={displayName?.charAt(0) ?? '?'}
                />
              </View>
              <Text
                style={[styles.cardTitle, { width: cardWidth, fontSize: fontSize.xs }]}
                numberOfLines={1}
              >
                {displayName}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  sectionHeaderWithImage: {
    height: 64,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionLibraryName: {
    color: '#fff',
    fontWeight: '700',
  },
  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
  },
  seeAllPillText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  recentlyAddedLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contentCard: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  cardTitle: {
    color: '#fff',
    marginTop: 8,
    fontWeight: '500',
  },
});
