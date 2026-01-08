import { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { getFavorites, getFavoriteSongs, getImageUrl } from '@/api';
import { CachedImage } from '@/components/ui/CachedImage';
import { NowPlayingBars } from '@/components/ui/NowPlayingBars';
import { TrackOptionsMenu } from '@/components/music/TrackOptionsMenu';
import { formatDuration, ticksToMs, getDisplayName, getDisplayImageUrl, getDisplayArtist, goBack } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem } from '@/types/jellyfin';

type FilterType = 'all' | 'movies' | 'shows' | 'music';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const POSTER_WIDTH = (SCREEN_WIDTH - 48) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

export default function FavoritesScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const setQueue = usePlayerStore((s) => s.setQueue);
  const currentItem = usePlayerStore((s) => s.currentItem);
  const playerState = usePlayerStore((s) => s.playerState);
  const userId = currentUser?.Id ?? '';

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedTrack, setSelectedTrack] = useState<BaseItem | null>(null);
  const [showTrackOptions, setShowTrackOptions] = useState(false);

  const handleGoBack = () => {
    goBack('/(tabs)/home');
  };

  const { data: mediaFavorites, isLoading: isLoadingMedia } = useQuery({
    queryKey: ['allFavorites', userId],
    queryFn: () => getFavorites(userId, ['Movie', 'Series'], 100),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: musicFavorites, isLoading: isLoadingMusic } = useQuery({
    queryKey: ['favoriteSongs', userId],
    queryFn: () => getFavoriteSongs(userId),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

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
  const totalDuration = tracks.reduce((sum, t) => sum + (t.RunTimeTicks ?? 0), 0);

  const handleItemPress = useCallback((item: BaseItem) => {
    const type = item.Type?.toLowerCase();
    if (type === 'movie') {
      router.push(`/(tabs)/details/movie/${item.Id}`);
    } else if (type === 'series') {
      router.push(`/(tabs)/details/series/${item.Id}`);
    }
  }, []);

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    const queueItems = tracks.map((track, index) => ({
      id: track.Id,
      item: track,
      index,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${tracks[0].Id}`);
  };

  const handleShuffle = () => {
    if (tracks.length === 0) return;
    const shuffled = [...tracks].sort(() => Math.random() - 0.5);
    const queueItems = shuffled.map((track, index) => ({
      id: track.Id,
      item: track,
      index,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${shuffled[0].Id}`);
  };

  const handleTrackPress = (track: BaseItem) => {
    const queueItems = tracks.map((t, i) => ({
      id: t.Id,
      item: t,
      index: i,
    }));
    setQueue(queueItems);
    router.push(`/player/music?itemId=${track.Id}`);
  };

  const renderPoster = ({ item }: { item: BaseItem }) => {
    const imageTag = item.ImageTags?.Primary;
    const rawImageUrl = imageTag
      ? getImageUrl(item.Id, 'Primary', { maxWidth: 300, tag: imageTag })
      : null;
    const imageUrl = getDisplayImageUrl(item.Id, rawImageUrl, hideMedia, 'Primary');
    const displayName = getDisplayName(item, hideMedia);

    return (
      <Pressable
        style={styles.posterContainer}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.posterImage}>
          {imageUrl ? (
            <CachedImage
              uri={imageUrl}
              style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
              borderRadius={8}
            />
          ) : (
            <View style={styles.posterPlaceholder}>
              <Ionicons
                name={item.Type === 'Movie' ? 'film-outline' : 'tv-outline'}
                size={32}
                color="rgba(255,255,255,0.3)"
              />
            </View>
          )}
        </View>
        <Text style={styles.posterTitle} numberOfLines={2}>{displayName}</Text>
        <Text style={styles.posterType}>{item.Type === 'Movie' ? 'Movie' : 'Series'}</Text>
      </Pressable>
    );
  };

  const renderTrack = ({ item }: { item: BaseItem }) => {
    const albumId = (item as any).AlbumId || item.Id;
    const imageTag = (item as any).AlbumPrimaryImageTag || item.ImageTags?.Primary;
    const rawImageUrl = imageTag
      ? getImageUrl(albumId, 'Primary', { maxWidth: 100, tag: imageTag })
      : null;
    const imageUrl = getDisplayImageUrl(albumId, rawImageUrl, hideMedia, 'Primary');
    const rawArtists = (item as any).Artists || [(item as any).AlbumArtist || ''];
    const displayArtists = getDisplayArtist(rawArtists, hideMedia);
    const artistName = displayArtists[0] || '';
    const albumName = (item as any).Album || '';
    const displayName = getDisplayName(item, hideMedia);
    const isPlaying = currentItem?.item?.Id === item.Id;
    const isActive = isPlaying && (playerState === 'playing' || playerState === 'paused');

    return (
      <View style={styles.trackRow}>
        <Pressable
          style={styles.trackContent}
          onPress={() => handleTrackPress(item)}
        >
          <View style={styles.trackImage}>
            {imageUrl ? (
              <CachedImage
                uri={imageUrl}
                style={{ width: 48, height: 48 }}
                borderRadius={6}
              />
            ) : (
              <View style={styles.trackPlaceholder}>
                <Ionicons name="musical-note" size={20} color="rgba(255,255,255,0.3)" />
              </View>
            )}
            {isActive && (
              <Animated.View
                entering={FadeIn.duration(200)}
                exiting={FadeOut.duration(200)}
                style={[styles.playingOverlay, { backgroundColor: accentColor + 'E6' }]}
              >
                <NowPlayingBars isPlaying={playerState === 'playing'} color="#fff" />
              </Animated.View>
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackName, isActive && { color: accentColor }]} numberOfLines={1}>{displayName}</Text>
            {(artistName || albumName) && (
              <Text style={styles.trackArtist} numberOfLines={1}>
                {artistName}{artistName && albumName ? ' - ' : ''}{albumName}
              </Text>
            )}
          </View>
          <Text style={styles.trackDuration}>
            {formatDuration(ticksToMs(item.RunTimeTicks ?? 0))}
          </Text>
        </Pressable>
        <Pressable
          style={styles.trackOptionsButton}
          onPress={() => {
            setSelectedTrack(item);
            setShowTrackOptions(true);
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>
    );
  };

  const renderFilterButton = (filter: FilterType, label: string, count: number) => (
    <Pressable
      style={[
        styles.filterButton,
        activeFilter === filter && { backgroundColor: accentColor },
      ]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text
        style={[
          styles.filterButtonText,
          activeFilter === filter && { color: '#fff' },
        ]}
      >
        {label} ({count})
      </Text>
    </Pressable>
  );

  const renderContent = () => {
    if (activeFilter === 'movies' || (activeFilter === 'all' && movies.length > 0 && shows.length === 0 && tracks.length === 0)) {
      const items = activeFilter === 'all' ? movies : movies;
      if (items.length === 0) return renderEmpty('No favorite movies yet');
      return (
        <FlatList
          data={items}
          keyExtractor={(item) => item.Id}
          renderItem={renderPoster}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
      );
    }

    if (activeFilter === 'shows' || (activeFilter === 'all' && shows.length > 0 && movies.length === 0 && tracks.length === 0)) {
      const items = activeFilter === 'all' ? shows : shows;
      if (items.length === 0) return renderEmpty('No favorite shows yet');
      return (
        <FlatList
          data={items}
          keyExtractor={(item) => item.Id}
          renderItem={renderPoster}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
      );
    }

    if (activeFilter === 'music') {
      if (tracks.length === 0) return renderEmpty('No favorite songs yet');
      return (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.Id}
          renderItem={renderTrack}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.musicHeader}>
              <Text style={styles.musicCount}>
                {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} - {formatDuration(ticksToMs(totalDuration))}
              </Text>
              <View style={styles.musicButtons}>
                <Pressable
                  style={[styles.playButton, { backgroundColor: accentColor }]}
                  onPress={handlePlayAll}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.playButtonText}>Play</Text>
                </Pressable>
                <Pressable
                  style={[styles.shuffleButton, { backgroundColor: accentColor + '20' }]}
                  onPress={handleShuffle}
                >
                  <Ionicons name="shuffle" size={16} color={accentColor} />
                </Pressable>
              </View>
            </View>
          }
        />
      );
    }

    const allItems = [...movies, ...shows];
    if (allItems.length === 0 && tracks.length === 0) {
      return renderEmpty('No favorites yet');
    }

    if (allItems.length > 0 && tracks.length === 0) {
      return (
        <FlatList
          data={allItems}
          keyExtractor={(item) => item.Id}
          renderItem={renderPoster}
          numColumns={3}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
        />
      );
    }

    if (allItems.length === 0 && tracks.length > 0) {
      return (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.Id}
          renderItem={renderTrack}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.musicHeader}>
              <Text style={styles.musicCount}>
                {tracks.length} {tracks.length === 1 ? 'song' : 'songs'} - {formatDuration(ticksToMs(totalDuration))}
              </Text>
              <View style={styles.musicButtons}>
                <Pressable
                  style={[styles.playButton, { backgroundColor: accentColor }]}
                  onPress={handlePlayAll}
                >
                  <Ionicons name="play" size={16} color="#fff" />
                  <Text style={styles.playButtonText}>Play</Text>
                </Pressable>
                <Pressable
                  style={[styles.shuffleButton, { backgroundColor: accentColor + '20' }]}
                  onPress={handleShuffle}
                >
                  <Ionicons name="shuffle" size={16} color={accentColor} />
                </Pressable>
              </View>
            </View>
          }
        />
      );
    }

    return (
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.Id}
        renderItem={renderPoster}
        numColumns={3}
        contentContainerStyle={styles.gridContent}
        columnWrapperStyle={styles.gridRow}
        ListFooterComponent={
          tracks.length > 0 ? (
            <View style={styles.musicSection}>
              <View style={styles.musicSectionHeader}>
                <Ionicons name="musical-notes" size={20} color={accentColor} />
                <Text style={styles.musicSectionTitle}>Favorite Songs</Text>
                <Text style={styles.musicSectionCount}>({tracks.length})</Text>
              </View>
              {tracks.slice(0, 5).map((track) => renderTrack({ item: track }))}
              {tracks.length > 5 && (
                <Pressable
                  style={styles.showMoreButton}
                  onPress={() => setActiveFilter('music')}
                >
                  <Text style={[styles.showMoreText, { color: accentColor }]}>
                    Show all {tracks.length} songs
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={accentColor} />
                </Pressable>
              )}
            </View>
          ) : null
        }
      />
    );
  };

  const renderEmpty = (message: string) => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={64} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyTitle}>{message}</Text>
      <Text style={styles.emptySubtitle}>
        Tap the heart icon on items to add them here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Favorites',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerLeft: () => (
            <Pressable onPress={handleGoBack} style={{ marginRight: 16 }}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/search')} style={{ marginLeft: 16 }}>
              <Ionicons name="search" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : (
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: accentColor + '20' }]}>
              <Ionicons name="heart" size={32} color={accentColor} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>Your Favorites</Text>
              <Text style={styles.headerSubtitle}>{totalCount} items</Text>
            </View>
          </View>

          <View style={styles.filterRow}>
            {renderFilterButton('all', 'All', totalCount)}
            {movies.length > 0 && renderFilterButton('movies', 'Movies', movies.length)}
            {shows.length > 0 && renderFilterButton('shows', 'Shows', shows.length)}
            {tracks.length > 0 && renderFilterButton('music', 'Music', tracks.length)}
          </View>

          {renderContent()}
        </View>
      )}

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 4,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  gridRow: {
    gap: 8,
    marginBottom: 16,
  },
  posterContainer: {
    width: POSTER_WIDTH,
  },
  posterImage: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  posterPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  posterTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  posterType: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 100,
  },
  musicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  musicCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  musicButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 6,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shuffleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  trackContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackOptionsButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  trackImage: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 12,
  },
  playingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  trackPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  trackInfo: {
    flex: 1,
  },
  trackName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  trackArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  trackDuration: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    marginLeft: 12,
  },
  musicSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  musicSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  musicSectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  musicSectionCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 4,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
