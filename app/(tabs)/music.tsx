import { View, Text, SectionList, RefreshControl, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useState, useCallback, useMemo, useRef } from 'react';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore, usePlayerStore } from '@/stores';
import { getLibraries, getArtists, createPlaylist, getLibraryIdsByType, getItemsFromMultipleLibraries, getLatestMediaFromMultipleLibraries, getRecentlyPlayed, getMostPlayed } from '@/api';
import { SkeletonRow, AnimatedGradient } from '@/components/shared/ui';
import {
  BrowseHeader,
  TabsContainer,
  PillTabButton,
  AlphabetScroller,
  AlphabetSectionHeader,
  LoadingFooter,
  SectionHeader,
  groupByFirstLetter,
} from '@/components/shared/browse';
import {
  AlbumCard,
  AlbumRow,
  ArtistRow,
  SongRow,
  PlaylistRow,
  CreatePlaylistModal,
  HORIZONTAL_ALBUM_SIZE,
} from '@/components/shared/music';
import { navigateToDetails } from '@/utils';
import { colors } from '@/theme';
import type { BaseItem, MusicAlbum, AudioTrack } from '@/types/jellyfin';

type ViewMode = 'home' | 'albums' | 'artists' | 'playlists' | 'songs';

export default function MusicScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const albumsSectionListRef = useRef<SectionList<BaseItem>>(null);
  const artistsSectionListRef = useRef<SectionList<BaseItem>>(null);
  const playlistsSectionListRef = useRef<SectionList<BaseItem>>(null);
  const songsSectionListRef = useRef<SectionList<BaseItem>>(null);

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

  const musicLibraryIds = useMemo(() => {
    if (!libraries) return [];
    return getLibraryIdsByType(libraries, 'music');
  }, [libraries]);

  const hasMusicLibraries = musicLibraryIds.length > 0;

  const { data: recentlyPlayed, refetch: refetchRecent } = useQuery({
    queryKey: ['recentMusic', userId, musicLibraryIds.join(',')],
    queryFn: () => getItemsFromMultipleLibraries<MusicAlbum>(userId, musicLibraryIds, {
      includeItemTypes: ['MusicAlbum'],
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      limit: 10,
      recursive: true,
    }),
    enabled: !!userId && hasMusicLibraries,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 10,
  });

  const { data: recentlyAdded, refetch: refetchAdded } = useQuery({
    queryKey: ['latestMusic', userId, musicLibraryIds.join(',')],
    queryFn: () => getLatestMediaFromMultipleLibraries(userId, musicLibraryIds, 10),
    enabled: !!userId && hasMusicLibraries,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 30,
  });

  const { data: recentlyPlayedTracks, refetch: refetchRecentTracks } = useQuery({
    queryKey: ['recentlyPlayedTracks', userId],
    queryFn: () => getRecentlyPlayed(userId, 15, ['Audio']),
    enabled: !!userId && hasMusicLibraries,
    staleTime: Infinity,
  });

  const { data: mostPlayedTracks, refetch: refetchMostPlayed } = useQuery({
    queryKey: ['mostPlayedTracks', userId],
    queryFn: () => getMostPlayed(userId, 15, ['Audio']),
    enabled: !!userId && hasMusicLibraries,
    staleTime: Infinity,
  });

  const { data: allAlbums, isLoading: albumsLoading, refetch: refetchAlbums, fetchNextPage: fetchNextAlbums, hasNextPage: hasNextAlbums, isFetchingNextPage: isFetchingNextAlbums } = useInfiniteQuery({
    queryKey: ['musicAlbums', userId, musicLibraryIds.join(',')],
    queryFn: ({ pageParam = 0 }) =>
      getItemsFromMultipleLibraries<MusicAlbum>(userId, musicLibraryIds, {
        includeItemTypes: ['MusicAlbum'],
        sortBy: 'SortName',
        sortOrder: 'Ascending',
        startIndex: pageParam,
        limit: 20,
        recursive: true,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && hasMusicLibraries && viewMode === 'albums',
    staleTime: Infinity,
  });

  const { data: allArtists, isLoading: artistsLoading, refetch: refetchArtists, fetchNextPage: fetchNextArtists, hasNextPage: hasNextArtists, isFetchingNextPage: isFetchingNextArtists } = useInfiniteQuery({
    queryKey: ['musicArtists', userId, musicLibraryIds.join(',')],
    queryFn: async ({ pageParam = 0 }) => {
      if (musicLibraryIds.length === 0) {
        return { Items: [], TotalRecordCount: 0, StartIndex: 0 };
      }
      const results = await Promise.all(
        musicLibraryIds.map(libId => getArtists(userId, libId, { startIndex: pageParam, limit: 30 }))
      );
      const allItems = results.flatMap(r => r.Items);
      const totalCount = results.reduce((sum, r) => sum + r.TotalRecordCount, 0);
      const uniqueArtists = Array.from(new Map(allItems.map(item => [item.Id, item])).values());
      uniqueArtists.sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''));
      return { Items: uniqueArtists, TotalRecordCount: totalCount, StartIndex: pageParam };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && hasMusicLibraries && viewMode === 'artists',
    staleTime: Infinity,
  });

  const { data: playlists, isLoading: playlistsLoading, refetch: refetchPlaylists } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getItemsFromMultipleLibraries<BaseItem>(userId, [], {
      includeItemTypes: ['Playlist'],
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      recursive: true,
      fields: ['ChildCount', 'Overview'],
    }),
    enabled: !!userId && viewMode === 'playlists',
  });

  const { data: allSongs, isLoading: songsLoading, refetch: refetchSongs, fetchNextPage: fetchNextSongs, hasNextPage: hasNextSongs, isFetchingNextPage: isFetchingNextSongs } = useInfiniteQuery({
    queryKey: ['musicSongs', userId, musicLibraryIds.join(',')],
    queryFn: ({ pageParam = 0 }) =>
      getItemsFromMultipleLibraries<AudioTrack>(userId, musicLibraryIds, {
        includeItemTypes: ['Audio'],
        sortBy: 'SortName',
        sortOrder: 'Ascending',
        startIndex: pageParam,
        limit: 50,
        recursive: true,
        fields: ['Artists', 'AlbumArtist', 'Album', 'AlbumId', 'AlbumPrimaryImageTag', 'RunTimeTicks'],
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && hasMusicLibraries && viewMode === 'songs',
    staleTime: Infinity,
  });

  const albums = allAlbums?.pages.flatMap((p) => p.Items) ?? [];
  const artists = allArtists?.pages.flatMap((p) => p.Items) ?? [];
  const songs = allSongs?.pages.flatMap((p) => p.Items) ?? [];
  const playlistItems = playlists?.Items ?? [];
  const totalAlbums = allAlbums?.pages[0]?.TotalRecordCount ?? 0;
  const totalArtists = allArtists?.pages[0]?.TotalRecordCount ?? 0;
  const totalSongs = allSongs?.pages[0]?.TotalRecordCount ?? 0;
  const totalPlaylists = playlistItems.length;

  const { sections: albumSections, availableLetters: albumAvailableLetters } = useMemo(() => groupByFirstLetter(albums), [albums]);
  const { sections: artistSections, availableLetters: artistAvailableLetters } = useMemo(() => groupByFirstLetter(artists), [artists]);
  const { sections: songSections, availableLetters: songAvailableLetters } = useMemo(() => groupByFirstLetter(songs), [songs]);
  const { sections: playlistSections, availableLetters: playlistAvailableLetters } = useMemo(() => groupByFirstLetter(playlistItems), [playlistItems]);

  const scrollToLetter = useCallback((letter: string, sections: { title: string }[], ref: React.RefObject<SectionList<BaseItem> | null>) => {
    const sectionIndex = sections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && ref.current) {
      ref.current.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true, viewOffset: 0 });
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecent(), refetchAdded(), refetchAlbums(), refetchArtists(), refetchPlaylists(), refetchRecentTracks(), refetchMostPlayed(), refetchSongs()]);
    setRefreshing(false);
  }, [refetchRecent, refetchAdded, refetchAlbums, refetchArtists, refetchPlaylists, refetchRecentTracks, refetchMostPlayed, refetchSongs]);

  const handleAlbumPress = useCallback((item: BaseItem) => navigateToDetails('album', item.Id, '/(tabs)/music'), []);
  const handleArtistPress = useCallback((item: BaseItem) => navigateToDetails('artist', item.Id, '/(tabs)/music'), []);
  const handlePlaylistPress = useCallback((item: BaseItem) => router.push(`/(tabs)/playlist/${item.Id}?from=${encodeURIComponent('/(tabs)/music')}`), []);

  const handleSongPress = useCallback((item: BaseItem, sourceList?: BaseItem[]) => {
    if (sourceList && sourceList.length > 0) {
      const itemIndex = sourceList.findIndex(i => i.Id === item.Id);
      const queueItems = sourceList.map((track, idx) => ({ id: track.Id, item: track, index: idx }));
      usePlayerStore.getState().setQueue(queueItems, Math.max(0, itemIndex));
    }
    router.push(`/player/music?itemId=${item.Id}`);
  }, []);

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(userId, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
      router.push(`/(tabs)/playlist/${data.Id}`);
    },
    onError: () => Alert.alert('Error', 'Failed to create playlist'),
  });

  const renderSectionHeader = useCallback(({ section }: any) => (
    <AlphabetSectionHeader title={section.title} accentColor={accentColor} />
  ), [accentColor]);

  const renderHomeView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
    >
      {recentlyPlayedTracks?.Items && recentlyPlayedTracks.Items.length > 0 && (
        <>
          <SectionHeader title="Recently Played" icon="time-outline" onSeeAll={() => setViewMode('songs')} accentColor={accentColor} />
          <View style={styles.tracksSection}>
            {recentlyPlayedTracks.Items.slice(0, 5).map((item) => (
              <SongRow key={item.Id} item={item} onPress={() => handleSongPress(item, recentlyPlayedTracks.Items)} hideMedia={hideMedia} />
            ))}
          </View>
        </>
      )}

      {mostPlayedTracks?.Items && mostPlayedTracks.Items.length > 0 && (
        <>
          <SectionHeader title="Most Played" icon="trending-up" onSeeAll={() => setViewMode('songs')} accentColor={accentColor} />
          <View style={styles.tracksSection}>
            {mostPlayedTracks.Items.slice(0, 5).map((item) => (
              <SongRow key={item.Id} item={item} onPress={() => handleSongPress(item, mostPlayedTracks.Items)} hideMedia={hideMedia} showPlayCount />
            ))}
          </View>
        </>
      )}

      {recentlyPlayed?.Items && recentlyPlayed.Items.length > 0 && (
        <>
          <SectionHeader title="Jump Back In" icon="albums-outline" onSeeAll={() => setViewMode('albums')} accentColor={accentColor} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyPlayed.Items.map((item) => (
              <View key={item.Id} style={styles.horizontalItem}>
                <AlbumCard item={item} onPress={() => handleAlbumPress(item)} size={HORIZONTAL_ALBUM_SIZE} hideMedia={hideMedia} />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {recentlyAdded && recentlyAdded.length > 0 && (
        <>
          <SectionHeader title="New Releases" icon="sparkles" onSeeAll={() => setViewMode('albums')} accentColor={accentColor} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyAdded.map((item) => (
              <View key={item.Id} style={styles.horizontalItem}>
                <AlbumCard item={item} onPress={() => handleAlbumPress(item)} size={HORIZONTAL_ALBUM_SIZE} hideMedia={hideMedia} />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderAlbumsView = () => (
    <View style={styles.listContainer}>
      <SectionList
        ref={albumsSectionListRef}
        sections={albumSections}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <AlbumRow item={item} onPress={() => handleAlbumPress(item)} hideMedia={hideMedia} />}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextAlbums && !isFetchingNextAlbums && fetchNextAlbums()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListHeaderComponent={<Text style={styles.listHeader}>{totalAlbums} albums</Text>}
        ListFooterComponent={<LoadingFooter isLoading={isFetchingNextAlbums} accentColor={accentColor} />}
        ListEmptyComponent={albumsLoading ? <SkeletonRow title={false} cardWidth={64} cardHeight={64} count={8} isSquare /> : <View style={styles.emptyState}><Text style={styles.emptyStateText}>No albums found</Text></View>}
      />
      <AlphabetScroller availableLetters={albumAvailableLetters} onLetterPress={(l) => scrollToLetter(l, albumSections, albumsSectionListRef)} accentColor={accentColor} />
    </View>
  );

  const renderArtistsView = () => (
    <View style={styles.listContainer}>
      <SectionList
        ref={artistsSectionListRef}
        sections={artistSections}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <ArtistRow item={item} onPress={() => handleArtistPress(item)} hideMedia={hideMedia} />}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextArtists && !isFetchingNextArtists && fetchNextArtists()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListHeaderComponent={<Text style={styles.listHeader}>{totalArtists} artists</Text>}
        ListFooterComponent={<LoadingFooter isLoading={isFetchingNextArtists} accentColor={accentColor} />}
        ListEmptyComponent={artistsLoading ? <SkeletonRow title={false} cardWidth={56} cardHeight={56} count={8} isSquare /> : <View style={styles.emptyState}><Text style={styles.emptyStateText}>No artists found</Text></View>}
      />
      <AlphabetScroller availableLetters={artistAvailableLetters} onLetterPress={(l) => scrollToLetter(l, artistSections, artistsSectionListRef)} accentColor={accentColor} />
    </View>
  );

  const renderPlaylistsView = () => (
    <View style={styles.listContainer}>
      <SectionList
        ref={playlistsSectionListRef}
        sections={playlistSections}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <PlaylistRow item={item} onPress={() => handlePlaylistPress(item)} hideMedia={hideMedia} />}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListHeaderComponent={
          <View style={styles.playlistsHeader}>
            <Text style={styles.listHeader}>{totalPlaylists} {totalPlaylists === 1 ? 'playlist' : 'playlists'}</Text>
          </View>
        }
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        ListEmptyComponent={playlistsLoading ? <SkeletonRow title={false} cardWidth={56} cardHeight={56} count={8} isSquare /> : <View style={styles.emptyState}><Text style={styles.emptyStateText}>No playlists yet</Text></View>}
      />
      {playlistSections.length > 0 && (
        <AlphabetScroller availableLetters={playlistAvailableLetters} onLetterPress={(l) => scrollToLetter(l, playlistSections, playlistsSectionListRef)} accentColor={accentColor} />
      )}
    </View>
  );

  const renderSongsView = () => (
    <View style={styles.listContainer}>
      <SectionList
        ref={songsSectionListRef}
        sections={songSections}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => <SongRow item={item} onPress={() => handleSongPress(item)} hideMedia={hideMedia} />}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextSongs && !isFetchingNextSongs && fetchNextSongs()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />}
        ListHeaderComponent={<Text style={styles.listHeader}>{totalSongs} songs</Text>}
        ListFooterComponent={<LoadingFooter isLoading={isFetchingNextSongs} accentColor={accentColor} />}
        ListEmptyComponent={songsLoading ? <SkeletonRow title={false} cardWidth={64} cardHeight={64} count={8} isSquare /> : <View style={styles.emptyState}><Text style={styles.emptyStateText}>No songs found</Text></View>}
      />
      <AlphabetScroller availableLetters={songAvailableLetters} onLetterPress={(l) => scrollToLetter(l, songSections, songsSectionListRef)} accentColor={accentColor} />
    </View>
  );

  if (!hasMusicLibraries) {
    return (
      <SafeAreaView style={styles.noLibraryContainer} edges={['top']}>
        <Text style={styles.noLibraryTitle}>No music library found</Text>
        <Text style={styles.noLibrarySubtitle}>Add a music library in Jellyfin</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />
      <BrowseHeader title="Music" searchFilter="Audio" accentColor={accentColor} showFilterButton={false} />

      <TabsContainer>
        <PillTabButton label="Home" active={viewMode === 'home'} onPress={() => setViewMode('home')} accentColor={accentColor} />
        <PillTabButton label="Songs" active={viewMode === 'songs'} onPress={() => setViewMode('songs')} accentColor={accentColor} />
        <PillTabButton label="Albums" active={viewMode === 'albums'} onPress={() => setViewMode('albums')} accentColor={accentColor} />
        <PillTabButton label="Artists" active={viewMode === 'artists'} onPress={() => setViewMode('artists')} accentColor={accentColor} />
        <PillTabButton label="Playlists" active={viewMode === 'playlists'} onPress={() => setViewMode('playlists')} accentColor={accentColor} />
      </TabsContainer>

      {viewMode === 'home' && renderHomeView()}
      {viewMode === 'songs' && renderSongsView()}
      {viewMode === 'albums' && renderAlbumsView()}
      {viewMode === 'artists' && renderArtistsView()}
      {viewMode === 'playlists' && renderPlaylistsView()}

      <CreatePlaylistModal
        visible={showCreatePlaylist}
        onClose={() => { setShowCreatePlaylist(false); setNewPlaylistName(''); }}
        playlistName={newPlaylistName}
        onChangePlaylistName={setNewPlaylistName}
        onConfirm={() => {
          const name = newPlaylistName.trim();
          if (!name) { Alert.alert('Error', 'Please enter a playlist name'); return; }
          createPlaylistMutation.mutate(name);
        }}
        isPending={createPlaylistMutation.isPending}
        accentColor={accentColor}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  listContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  listContent: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  listHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  horizontalItem: {
    marginRight: 12,
  },
  tracksSection: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  playlistsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  noLibraryContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noLibraryTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
  },
  noLibrarySubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 80,
  },
});
