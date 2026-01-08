import { View, Text, Pressable, RefreshControl, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { useState, useCallback, useMemo, memo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import {
  getLibraries,
  getItems,
  getImageUrl,
  getLibraryIcon,
} from '@/api';
import { AnimatedGradient, SearchButton } from '@/components/ui';
import { navigateToLibrary, navigateToDetails } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { getDisplayName, getDisplayImageUrl } from '@/utils';
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

function getDetailRoute(item: BaseItem): string {
  const type = item.Type?.toLowerCase();
  if (type === 'movie') return `/details/movie/${item.Id}`;
  if (type === 'series') return `/details/series/${item.Id}`;
  if (type === 'musicalbum') return `/details/album/${item.Id}`;
  if (type === 'audiobook') return `/player/audiobook?itemId=${item.Id}`;
  if (type === 'book') {
    const container = (item as any).Container?.toLowerCase() || '';
    const path = (item as any).Path?.toLowerCase() || '';
    const isPdf = container === 'pdf' || path.endsWith('.pdf');
    return isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`;
  }
  return `/details/${type}/${item.Id}`;
}

const filterOptions = [
  { key: 'all', label: 'All', icon: 'grid-outline' as const },
  { key: 'movies', label: 'Movies', icon: 'film-outline' as const },
  { key: 'tvshows', label: 'Shows', icon: 'tv-outline' as const },
  { key: 'music', label: 'Music', icon: 'musical-notes-outline' as const },
  { key: 'books', label: 'Books', icon: 'book-outline' as const },
];

interface LibraryContentRowProps {
  library: Library;
  userId: string;
  accentColor: string;
  hideMedia: boolean;
}

const LibraryContentRow = memo(function LibraryContentRow({
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
    refetchOnMount: false,
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
    const type = item.Type?.toLowerCase();
    // For player/reader routes, use direct navigation (no back tracking needed)
    if (type === 'audiobook') {
      router.push(`/player/audiobook?itemId=${item.Id}`);
    } else if (type === 'book') {
      const container = (item as any).Container?.toLowerCase() || '';
      const path = (item as any).Path?.toLowerCase() || '';
      const isPdf = container === 'pdf' || path.endsWith('.pdf');
      router.push(isPdf ? `/reader/pdf?itemId=${item.Id}` : `/reader/epub?itemId=${item.Id}`);
    } else {
      // For detail routes, use navigateToDetails with source tracking
      const detailType = type === 'musicalbum' ? 'album' : type;
      navigateToDetails(detailType || 'item', item.Id, '/(tabs)/library');
    }
  }, []);

  const items = data?.Items ?? [];

  // Get backdrop from first item for section header
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
      {/* Section header with backdrop */}
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

      {/* Recently Added label */}
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

export default function LibraryScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const { isTablet, isTV, fontSize } = useResponsive();

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const { data: libraries, refetch: refetchLibraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
    refetchOnMount: false,
  });

  const browsableLibraries = useMemo(() => {
    if (!libraries) return [];
    return libraries.filter((lib) => {
      const excludeTypes = ['playlists'];
      if (lib.CollectionType && excludeTypes.includes(lib.CollectionType)) {
        return false;
      }
      if (activeFilter !== 'all' && lib.CollectionType !== activeFilter) {
        return false;
      }
      return true;
    });
  }, [libraries, activeFilter]);

  const availableFilters = useMemo(() => {
    if (!libraries) return [filterOptions[0]];
    const types = new Set(libraries.map(lib => lib.CollectionType).filter(Boolean));
    return filterOptions.filter(opt => opt.key === 'all' || types.has(opt.key as CollectionType));
  }, [libraries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchLibraries();
    setRefreshing(false);
  }, [refetchLibraries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />

      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[styles.headerTitle, { fontSize: fontSize['3xl'] }]}>{t('nav.library')}</Text>
          <Text style={[styles.headerSubtitle, { fontSize: fontSize.sm }]}>
            {browsableLibraries.length} {browsableLibraries.length === 1 ? 'collection' : 'collections'}
          </Text>
        </Animated.View>
        <SearchButton />
      </View>

      {/* Filter chips with scroll indicator */}
      {availableFilters.length > 1 && (
        <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.filterContainer, { paddingHorizontal: horizontalPadding, paddingRight: 48 }]}
          >
            {availableFilters.map((filter) => {
              const isActive = activeFilter === filter.key;
              return (
                <Pressable
                  key={filter.key}
                  onPress={() => setActiveFilter(filter.key)}
                  style={[
                    styles.filterChip,
                    isActive && { backgroundColor: accentColor },
                  ]}
                >
                  <Ionicons
                    name={filter.icon}
                    size={16}
                    color={isActive ? '#fff' : 'rgba(255,255,255,0.7)'}
                  />
                  <Text style={[styles.filterChipText, isActive && { color: '#fff' }]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {/* Fade indicator to show more content */}
          <LinearGradient
            colors={['transparent', '#0a0a0a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.filterFade}
            pointerEvents="none"
          />
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* Loading skeleton */}
        {isLoadingLibraries && (
          <View style={{ paddingTop: 16 }}>
            <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
            <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
          </View>
        )}

        {/* Content rows for each library */}
        {browsableLibraries.map((library) => (
          <LibraryContentRow
            key={library.Id}
            library={library}
            userId={userId}
            accentColor={accentColor}
            hideMedia={hideMedia}
          />
        ))}

        {/* Empty state */}
        {userId && !isLoadingLibraries && browsableLibraries.length === 0 && (
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="library-outline" size={48} color={accentColor} />
            </View>
            <Text style={[styles.emptyStateTitle, { fontSize: fontSize.xl }]}>No libraries found</Text>
            <Text style={[styles.emptyStateSubtitle, { fontSize: fontSize.sm }]}>
              {activeFilter !== 'all'
                ? 'Try a different filter or add libraries in Jellyfin'
                : 'Add libraries in your Jellyfin server'}
            </Text>
            {activeFilter !== 'all' && (
              <Pressable
                style={[styles.resetButton, { borderColor: accentColor }]}
                onPress={() => setActiveFilter('all')}
              >
                <Text style={[styles.resetButtonText, { color: accentColor }]}>Show all libraries</Text>
              </Pressable>
            )}
          </View>
        )}

        <View style={{ height: isTablet ? 100 : 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  filterWrapper: {
    position: 'relative',
  },
  filterContainer: {
    gap: 10,
    paddingBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
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
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
  },
  resetButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  resetButtonText: {
    fontWeight: '600',
  },
});
