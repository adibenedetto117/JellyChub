import { useState, useMemo, useCallback, memo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { useResponsive } from '@/hooks';
import { getFavorites, getFavoriteSongs, getImageUrl } from '@/api';
import { AnimatedGradient } from '@/components/shared/ui';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { SkeletonRow } from '@/components/shared/ui/Skeleton';
import { formatDuration, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist, navigateToDetails } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

type FilterType = 'all' | 'movies' | 'shows' | 'music';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Memoized poster item component to prevent re-renders
interface PosterItemProps {
  item: BaseItem;
  onPress: () => void;
  posterWidth: number;
  posterHeight: number;
  hideMedia: boolean;
  accentColor: string;
  fontSize: number;
}

const PosterItem = memo(function PosterItem({ item, onPress, posterWidth, posterHeight, hideMedia, accentColor, fontSize }: PosterItemProps) {
  const imageTag = item.ImageTags?.Primary;
  const rawImageUrl = getImageUrl(item.Id, 'Primary', { maxWidth: posterWidth * 2, tag: imageTag });
  const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
  const displayName = getDisplayName(item, hideMedia);

  return (
    <Pressable style={[styles.posterContainer, { width: posterWidth }]} onPress={onPress}>
      <View style={[styles.posterImage, { width: posterWidth, height: posterHeight }]}>
        <CachedImage
          uri={imageUrl}
          style={{ width: posterWidth, height: posterHeight }}
          borderRadius={10}
          fallbackText={displayName?.charAt(0) ?? '?'}
        />
        <View style={[styles.typeBadge, { backgroundColor: accentColor }]}>
          <Ionicons
            name={item.Type === 'Movie' ? 'film' : 'tv'}
            size={10}
            color="#fff"
          />
        </View>
      </View>
      <Text style={[styles.posterTitle, { fontSize }]} numberOfLines={2}>{displayName}</Text>
    </Pressable>
  );
});

// Memoized track item component
interface TrackItemProps {
  item: BaseItem;
  index: number;
  onPress: () => void;
  hideMedia: boolean;
  horizontalPadding: number;
  fontSizeBase: number;
  fontSizeSm: number;
  unknownArtistText: string;
}

const TrackItem = memo(function TrackItem({ item, index, onPress, hideMedia, horizontalPadding, fontSizeBase, fontSizeSm, unknownArtistText }: TrackItemProps) {
  const albumId = (item as any).AlbumId || item.Id;
  const imageTag = (item as any).AlbumPrimaryImageTag || item.ImageTags?.Primary;
  const rawImageUrl = imageTag ? getImageUrl(albumId, 'Primary', { maxWidth: 120, tag: imageTag }) : null;
  const imageUrl = getDisplayImageUrl(albumId, rawImageUrl, hideMedia, 'Primary');
  const rawArtists = (item as any).Artists || [(item as any).AlbumArtist || ''];
  const displayArtists = getDisplayArtist(rawArtists, hideMedia);
  const displayName = getDisplayName(item, hideMedia);

  return (
    <Pressable
      style={[styles.trackRow, { paddingHorizontal: horizontalPadding }]}
      onPress={onPress}
    >
      <Text style={styles.trackNumber}>{index + 1}</Text>
      <View style={styles.trackImage}>
        <CachedImage
          uri={imageUrl}
          style={{ width: 48, height: 48 }}
          borderRadius={6}
          fallbackText={displayName?.charAt(0) ?? '?'}
        />
      </View>
      <View style={styles.trackInfo}>
        <Text style={[styles.trackName, { fontSize: fontSizeBase }]} numberOfLines={1}>{displayName}</Text>
        <Text style={[styles.trackArtist, { fontSize: fontSizeSm }]} numberOfLines={1}>{displayArtists[0] || unknownArtistText}</Text>
      </View>
      <Text style={[styles.trackDuration, { fontSize: fontSizeSm }]}>
        {formatDuration(ticksToMs(item.RunTimeTicks ?? 0))}
      </Text>
    </Pressable>
  );
});

export default function FavoritesScreen() {
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const userId = currentUser?.Id ?? '';
  const { isTablet, fontSize } = useResponsive();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [refreshing, setRefreshing] = useState(false);

  const horizontalPadding = isTablet ? 24 : 16;
  const numColumns = isTablet ? 4 : 3;
  const posterWidth = (SCREEN_WIDTH - (horizontalPadding * 2) - ((numColumns - 1) * 12)) / numColumns;
  const posterHeight = posterWidth * 1.5;

  const { data: mediaFavorites, isLoading: isLoadingMedia, refetch: refetchMedia } = useQuery({
    queryKey: ['allFavorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 100),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const { data: musicFavorites, isLoading: isLoadingMusic, refetch: refetchMusic } = useQuery({
    queryKey: ['favoriteSongs', userId],
    queryFn: () => getFavoriteSongs(userId),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchMedia(), refetchMusic()]);
    setRefreshing(false);
  }, [refetchMedia, refetchMusic]);

  const movies = useMemo(() =>
    (mediaFavorites?.Items ?? []).filter(item => item.Type === 'Movie'),
    [mediaFavorites]
  );

  const shows = useMemo(() =>
    (mediaFavorites?.Items ?? []).filter(item => item.Type === 'Series'),
    [mediaFavorites]
  );

  const tracks = useMemo(() =>
    (musicFavorites?.Items ?? []).filter(item => item.Type === 'Audio'),
    [musicFavorites]
  );

  const isLoading = isLoadingMedia || isLoadingMusic;
  const totalCount = movies.length + shows.length + tracks.length;

  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case 'movies': return movies;
      case 'shows': return shows;
      case 'music': return tracks;
      default: return [...movies, ...shows];
    }
  }, [activeFilter, movies, shows, tracks]);

  const handleItemPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      navigateToDetails('movie', item.Id, '/(tabs)/favorites');
    } else if (type === 'series') {
      navigateToDetails('series', item.Id, '/(tabs)/favorites');
    } else if (type === 'audio') {
      const queueItems = tracks.map((t, i) => ({ id: t.Id, item: t, index: i }));
      setQueue(queueItems);
      router.push(`/player/music?itemId=${item.Id}`);
    }
  }, [tracks, setQueue]);

  const handlePlayAllMusic = useCallback(() => {
    if (tracks.length > 0) {
      const queueItems = tracks.map((t, i) => ({ id: t.Id, item: t, index: i }));
      setQueue(queueItems);
      router.push(`/player/music?itemId=${tracks[0].Id}`);
    }
  }, [tracks, setQueue]);

  // Use useCallback to memoize the render functions
  const renderPosterItem = useCallback(({ item }: { item: BaseItem }) => (
    <PosterItem
      item={item}
      onPress={() => handleItemPress(item)}
      posterWidth={posterWidth}
      posterHeight={posterHeight}
      hideMedia={hideMedia}
      accentColor={accentColor}
      fontSize={fontSize.xs}
    />
  ), [handleItemPress, posterWidth, posterHeight, hideMedia, accentColor, fontSize.xs]);

  const renderTrackItem = useCallback(({ item, index }: { item: BaseItem; index: number }) => (
    <TrackItem
      item={item}
      index={index}
      onPress={() => handleItemPress(item)}
      hideMedia={hideMedia}
      horizontalPadding={horizontalPadding}
      fontSizeBase={fontSize.base}
      fontSizeSm={fontSize.sm}
      unknownArtistText={t('favorites.unknownArtist')}
    />
  ), [handleItemPress, hideMedia, horizontalPadding, fontSize.base, fontSize.sm, t]);

  const filters: { key: FilterType; label: string; icon: keyof typeof Ionicons.glyphMap; count: number }[] = [
    { key: 'all', label: t('favorites.all'), icon: 'heart', count: totalCount },
    { key: 'movies', label: t('nav.movies'), icon: 'film-outline', count: movies.length },
    { key: 'shows', label: t('nav.shows'), icon: 'tv-outline', count: shows.length },
    { key: 'music', label: t('nav.music'), icon: 'musical-notes-outline', count: tracks.length },
  ];

  const visibleFilters = filters.filter(f => f.key === 'all' || f.count > 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />

      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontSize: fontSize['2xl'] }]}>{t('favorites.title')}</Text>
          <Text style={[styles.headerSubtitle, { fontSize: fontSize.sm }]}>
            {t('favorites.itemsSaved', { count: totalCount })}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Filter chips */}
      <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.filterContainer, { paddingHorizontal: horizontalPadding }]}
        >
          {visibleFilters.map((filter) => {
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
                <View style={[styles.filterCount, isActive && { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                  <Text style={[styles.filterCountText, isActive && { color: '#fff' }]}>
                    {filter.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        <LinearGradient
          colors={['transparent', '#0a0a0a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.filterFade}
          pointerEvents="none"
        />
      </Animated.View>

      {/* Content */}
      {isLoading ? (
        <View style={{ paddingTop: 16 }}>
          <SkeletonRow cardWidth={posterWidth} cardHeight={posterHeight} count={numColumns} />
          <SkeletonRow cardWidth={posterWidth} cardHeight={posterHeight} count={numColumns} />
        </View>
      ) : totalCount === 0 ? (
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="heart-outline" size={48} color={accentColor} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: fontSize.xl }]}>{t('favorites.noFavorites')}</Text>
          <Text style={[styles.emptySubtitle, { fontSize: fontSize.sm }]}>
            {t('favorites.noFavoritesDesc')}
          </Text>
          <Pressable
            style={[styles.emptyButton, { backgroundColor: accentColor }]}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Text style={styles.emptyButtonText}>{t('favorites.browseContent')}</Text>
          </Pressable>
        </Animated.View>
      ) : activeFilter === 'music' ? (
        <View style={{ flex: 1 }}>
          {/* Music header with play all */}
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[styles.musicHeader, { paddingHorizontal: horizontalPadding }]}
          >
            <View>
              <Text style={[styles.musicHeaderTitle, { fontSize: fontSize.lg }]}>{t('favorites.favoriteTracks')}</Text>
              <Text style={[styles.musicHeaderSubtitle, { fontSize: fontSize.sm }]}>{t('favorites.songsCount', { count: tracks.length })}</Text>
            </View>
            <Pressable
              style={[styles.playAllButton, { backgroundColor: accentColor }]}
              onPress={handlePlayAllMusic}
            >
              <Ionicons name="play" size={18} color="#fff" />
              <Text style={styles.playAllText}>{t('favorites.playAll')}</Text>
            </Pressable>
          </Animated.View>
          <FlatList
            data={tracks}
            keyExtractor={(item) => item.Id}
            renderItem={renderTrackItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
          />
        </View>
      ) : activeFilter === 'all' ? (
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
        >
          {/* Movies & Shows Grid */}
          {filteredItems.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Text style={[styles.sectionLabel, { fontSize: fontSize.sm, paddingHorizontal: horizontalPadding }]}>
                {t('favorites.moviesAndShows')}
              </Text>
              <View style={[styles.gridContainer, { paddingHorizontal: horizontalPadding }]}>
                {filteredItems.map((item) => (
                  <View key={item.Id}>{renderPosterItem({ item })}</View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Music Section */}
          {tracks.length > 0 && (
            <Animated.View entering={FadeIn.delay(100).duration(300)} style={{ marginTop: 24 }}>
              <View style={[styles.musicHeader, { paddingHorizontal: horizontalPadding }]}>
                <View>
                  <Text style={[styles.musicHeaderTitle, { fontSize: fontSize.lg }]}>{t('favorites.favoriteTracks')}</Text>
                  <Text style={[styles.musicHeaderSubtitle, { fontSize: fontSize.sm }]}>{t('favorites.songsCount', { count: tracks.length })}</Text>
                </View>
                <Pressable
                  style={[styles.playAllButton, { backgroundColor: accentColor }]}
                  onPress={handlePlayAllMusic}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.playAllText}>{t('favorites.playAll')}</Text>
                </Pressable>
              </View>
              {tracks.map((item, index) => (
                <View key={item.Id}>{renderTrackItem({ item, index })}</View>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      ) : filteredItems.length === 0 ? (
        <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="heart-outline" size={48} color={accentColor} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: fontSize.xl }]}>{t('favorites.noFavorites')}</Text>
          <Text style={[styles.emptySubtitle, { fontSize: fontSize.sm }]}>
            {t('favorites.noFavoritesDesc')}
          </Text>
        </Animated.View>
      ) : (
        <FlatList
          key={`favorites-grid-${numColumns}-${activeFilter}`}
          data={filteredItems.filter((item): item is BaseItem => item != null && item.Id != null)}
          keyExtractor={(item, index) => `${item.Id}-${index}`}
          renderItem={renderPosterItem}
          numColumns={numColumns}
          contentContainerStyle={[styles.gridContent, { paddingHorizontal: horizontalPadding }]}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
          }
          initialNumToRender={9}
          maxToRenderPerBatch={9}
          windowSize={5}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  headerSpacer: {
    width: 44,
  },
  filterWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  filterContainer: {
    gap: 10,
    paddingRight: 48,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  filterCount: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 2,
  },
  filterCountText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
  },
  filterFade: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 40,
  },
  gridContent: {
    paddingTop: 8,
    paddingBottom: 100,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridRow: {
    gap: 12,
    marginBottom: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  posterContainer: {
    marginBottom: 4,
  },
  posterImage: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterTitle: {
    color: '#fff',
    fontWeight: '500',
    marginTop: 8,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  musicHeaderTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  musicHeaderSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  trackNumber: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
    width: 24,
    textAlign: 'center',
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#fff',
    fontWeight: '500',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },
  trackDuration: {
    color: 'rgba(255,255,255,0.4)',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  emptyTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
