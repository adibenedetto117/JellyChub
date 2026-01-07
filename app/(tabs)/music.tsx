import { View, Text, FlatList, SectionList, Pressable, RefreshControl, ScrollView, Dimensions, ActivityIndicator, StyleSheet, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { useState, useCallback, useMemo, useRef, memo } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import { getLibraries, getItems, getImageUrl, getLatestMedia, getArtists, createPlaylist, getFavoriteSongs } from '@/api';
import { SkeletonGrid, SearchButton, HomeButton, AnimatedGradient } from '@/components/ui';
import { colors } from '@/theme';
import type { BaseItem, MusicAlbum } from '@/types/jellyfin';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ALBUM_SIZE = (SCREEN_WIDTH - 48) / 2;
const HORIZONTAL_ALBUM_SIZE = 140;

type ViewMode = 'home' | 'albums' | 'artists' | 'playlists';

const AlbumCard = memo(function AlbumCard({ item, onPress, size = ALBUM_SIZE }: { item: BaseItem; onPress: () => void; size?: number }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 400, tag: item.ImageTags.Primary })
    : null;

  const artist = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.albumCard, { opacity: pressed ? 0.8 : 1 }]}>
      <View style={[styles.albumImageContainer, { width: size, height: size }]}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.albumImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.albumPlaceholder}>
            <Text style={styles.albumPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.albumTitle, { width: size }]} numberOfLines={1}>
        {item.Name}
      </Text>
      {artist ? (
        <Text style={[styles.albumArtist, { width: size }]} numberOfLines={1}>
          {artist}
        </Text>
      ) : null}
    </Pressable>
  );
});

const CompactAlbumCard = memo(function CompactAlbumCard({ item, onPress }: { item: BaseItem; onPress: () => void }) {
  const getItemImageUrl = () => {
    if (item.ImageTags?.Primary) {
      return getImageUrl(item.Id, 'Primary', { maxWidth: 200, tag: item.ImageTags.Primary });
    }
    const albumId = (item as any)?.AlbumId;
    const albumTag = (item as any)?.AlbumPrimaryImageTag;
    if (albumId && albumTag) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200, tag: albumTag });
    }
    if (albumId) {
      return getImageUrl(albumId, 'Primary', { maxWidth: 200 });
    }
    return null;
  };

  const imageUrl = getItemImageUrl();
  const artist = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.compactCard, { backgroundColor: pressed ? colors.surface.default : 'rgba(255,255,255,0.05)' }]}>
      <View style={styles.compactImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.compactImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.compactPlaceholder}>
            <Text style={styles.compactPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.compactInfo}>
        <Text style={styles.compactTitle} numberOfLines={1}>{item.Name}</Text>
        {artist ? <Text style={styles.compactArtist} numberOfLines={1}>{artist}</Text> : null}
      </View>
    </Pressable>
  );
});

const ArtistRow = memo(function ArtistRow({ item, onPress }: { item: BaseItem; onPress: () => void }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;

  return (
    <Pressable onPress={onPress} style={styles.artistRow}>
      <View style={styles.artistRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.artistRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.artistRowPlaceholder}>
            <Text style={styles.artistRowPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <Text style={styles.artistRowName} numberOfLines={1}>
        {item.Name}
      </Text>
    </Pressable>
  );
});

const AlbumRow = memo(function AlbumRow({ item, onPress }: { item: BaseItem; onPress: () => void }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;

  const artist = (item as any)?.AlbumArtist ?? (item as any)?.Artists?.[0] ?? '';

  return (
    <Pressable onPress={onPress} style={styles.albumRow}>
      <View style={styles.albumRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.albumRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.albumRowPlaceholder}>
            <Text style={styles.albumRowPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <View style={styles.albumRowInfo}>
        <Text style={styles.albumRowName} numberOfLines={1}>
          {item.Name}
        </Text>
        {artist ? (
          <Text style={styles.albumRowArtist} numberOfLines={1}>
            {artist}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
});

const FULL_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '#'];

const AlphabetScroller = memo(function AlphabetScroller({ availableLetters, onLetterPress, accentColor }: { availableLetters: string[]; onLetterPress: (letter: string) => void; accentColor: string }) {
  return (
    <View style={styles.alphabetContainer}>
      {FULL_ALPHABET.map((letter) => {
        const isAvailable = availableLetters.includes(letter);
        return (
          <Pressable
            key={letter}
            onPress={() => onLetterPress(letter)}
            style={styles.alphabetLetter}
          >
            <Text style={[
              styles.alphabetLetterText,
              { color: isAvailable ? accentColor : 'rgba(255,255,255,0.2)' }
            ]}>
              {letter}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const PlaylistRow = memo(function PlaylistRow({ item, onPress }: { item: BaseItem; onPress: () => void }) {
  const imageUrl = item.ImageTags?.Primary
    ? getImageUrl(item.Id, 'Primary', { maxWidth: 120, tag: item.ImageTags.Primary })
    : null;

  return (
    <Pressable onPress={onPress} style={styles.playlistRow}>
      <View style={styles.playlistRowImageContainer}>
        {imageUrl ? (
          <Image source={imageUrl} style={styles.playlistRowImage} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <View style={styles.playlistRowPlaceholder}>
            <Text style={styles.playlistRowPlaceholderText}>{item.Name?.charAt(0) ?? '?'}</Text>
          </View>
        )}
      </View>
      <Text style={styles.playlistRowName} numberOfLines={1}>
        {item.Name}
      </Text>
    </Pressable>
  );
});

const SectionHeader = memo(function SectionHeader({ title, onSeeAll, icon }: { title: string; onSeeAll?: () => void; icon?: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        {icon && <Ionicons name={icon as any} size={18} color="#fff" style={{ marginRight: 8 }} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {onSeeAll && (
        <Pressable onPress={onSeeAll}>
          <Text style={styles.seeAllText}>See all</Text>
        </Pressable>
      )}
    </View>
  );
});

const TabButton = memo(function TabButton({ label, active, onPress, accentColor }: { label: string; active: boolean; onPress: () => void; accentColor: string }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  }, [scale]);

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View style={[styles.tabButton, { backgroundColor: active ? accentColor : 'rgba(255,255,255,0.1)' }, animatedStyle]}>
        <Text style={[styles.tabButtonText, { color: active ? '#fff' : 'rgba(255,255,255,0.7)' }]}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

export default function MusicScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  const { data: libraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
  });

  const musicLibrary = libraries?.find((l) => l.CollectionType === 'music');

  const { data: recentlyPlayed, refetch: refetchRecent } = useQuery({
    queryKey: ['recentMusic', userId, musicLibrary?.Id],
    queryFn: () => getItems<MusicAlbum>(userId, {
      parentId: musicLibrary?.Id,
      includeItemTypes: ['MusicAlbum'],
      sortBy: 'DatePlayed',
      sortOrder: 'Descending',
      limit: 10,
      recursive: true,
    }),
    enabled: !!userId && !!musicLibrary,
  });

  const { data: recentlyAdded, refetch: refetchAdded } = useQuery({
    queryKey: ['latestMusic', userId, musicLibrary?.Id],
    queryFn: () => getLatestMedia(userId, musicLibrary?.Id, 10),
    enabled: !!userId && !!musicLibrary,
  });

  const { data: favorites, refetch: refetchFavorites } = useQuery({
    queryKey: ['favoriteSongs', userId],
    queryFn: () => getFavoriteSongs(userId),
    enabled: !!userId,
    staleTime: 0,
  });

  const { data: allAlbums, isLoading: albumsLoading, refetch: refetchAlbums, fetchNextPage: fetchNextAlbums, hasNextPage: hasNextAlbums, isFetchingNextPage: isFetchingNextAlbums } = useInfiniteQuery({
    queryKey: ['musicAlbums', userId, musicLibrary?.Id],
    queryFn: ({ pageParam = 0 }) =>
      getItems<MusicAlbum>(userId, {
        parentId: musicLibrary?.Id,
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
    enabled: !!userId && !!musicLibrary && viewMode === 'albums',
    staleTime: 1000 * 60 * 30, // 30 minutes - albums don't change often
  });

  const { data: allArtists, isLoading: artistsLoading, refetch: refetchArtists, fetchNextPage: fetchNextArtists, hasNextPage: hasNextArtists, isFetchingNextPage: isFetchingNextArtists } = useInfiniteQuery({
    queryKey: ['musicArtists', userId, musicLibrary?.Id],
    queryFn: ({ pageParam = 0 }) =>
      getArtists(userId, musicLibrary?.Id, {
        startIndex: pageParam,
        limit: 30,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId && !!musicLibrary && viewMode === 'artists',
    staleTime: 1000 * 60 * 60, // 1 hour - artists don't change often
  });

  const { data: playlists, isLoading: playlistsLoading, refetch: refetchPlaylists } = useQuery({
    queryKey: ['playlists', userId],
    queryFn: () => getItems<BaseItem>(userId, {
      includeItemTypes: ['Playlist'],
      sortBy: 'SortName',
      sortOrder: 'Ascending',
      recursive: true,
      fields: ['ChildCount', 'Overview'],
    }),
    enabled: !!userId && viewMode === 'playlists',
  });

  const albums = allAlbums?.pages.flatMap((p) => p.Items) ?? [];
  const artists = allArtists?.pages.flatMap((p) => p.Items) ?? [];
  const totalAlbums = allAlbums?.pages[0]?.TotalRecordCount ?? 0;
  const totalArtists = allArtists?.pages[0]?.TotalRecordCount ?? 0;

  const albumsSectionListRef = useRef<SectionList<BaseItem>>(null);
  const artistsSectionListRef = useRef<SectionList<BaseItem>>(null);
  const playlistsSectionListRef = useRef<SectionList<BaseItem>>(null);

  const playlistItems = playlists?.Items ?? [];
  const totalPlaylists = playlistItems.length;

  // Group playlists by first letter for section list
  const { sections: playlistSections, availableLetters: playlistAvailableLetters } = useMemo(() => {
    if (!playlistItems.length) return { sections: [], availableLetters: [] };

    const grouped: Record<string, BaseItem[]> = {};
    playlistItems.forEach((playlist) => {
      const firstChar = (playlist.Name ?? '?').charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(playlist);
    });

    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return {
      sections: sortedLetters.map((letter) => ({
        title: letter,
        data: grouped[letter],
      })),
      availableLetters: sortedLetters,
    };
  }, [playlistItems]);

  // Group albums by first letter for section list
  const { sections: albumSections, availableLetters: albumAvailableLetters } = useMemo(() => {
    if (!albums.length) return { sections: [], availableLetters: [] };

    const grouped: Record<string, BaseItem[]> = {};
    albums.forEach((album) => {
      const firstChar = (album.Name ?? '?').charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(album);
    });

    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return {
      sections: sortedLetters.map((letter) => ({
        title: letter,
        data: grouped[letter],
      })),
      availableLetters: sortedLetters,
    };
  }, [albums]);

  // Group artists by first letter for section list
  const { sections: artistSections, availableLetters: artistAvailableLetters } = useMemo(() => {
    if (!artists.length) return { sections: [], availableLetters: [] };

    const grouped: Record<string, BaseItem[]> = {};
    artists.forEach((artist) => {
      const firstChar = (artist.Name ?? '?').charAt(0).toUpperCase();
      const letter = /[A-Z]/.test(firstChar) ? firstChar : '#';
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(artist);
    });

    const sortedLetters = Object.keys(grouped).sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });

    return {
      sections: sortedLetters.map((letter) => ({
        title: letter,
        data: grouped[letter],
      })),
      availableLetters: sortedLetters,
    };
  }, [artists]);

  const scrollToAlbumLetter = useCallback((letter: string) => {
    const sectionIndex = albumSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && albumsSectionListRef.current) {
      albumsSectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [albumSections]);

  const scrollToArtistLetter = useCallback((letter: string) => {
    const sectionIndex = artistSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && artistsSectionListRef.current) {
      artistsSectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [artistSections]);

  const scrollToPlaylistLetter = useCallback((letter: string) => {
    const sectionIndex = playlistSections.findIndex((s) => s.title === letter);
    if (sectionIndex !== -1 && playlistsSectionListRef.current) {
      playlistsSectionListRef.current.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: 0,
      });
    }
  }, [playlistSections]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecent(), refetchAdded(), refetchFavorites(), refetchAlbums(), refetchArtists(), refetchPlaylists()]);
    setRefreshing(false);
  }, [refetchRecent, refetchAdded, refetchFavorites, refetchAlbums, refetchArtists, refetchPlaylists]);

  const handleAlbumPress = useCallback((item: BaseItem) => {
    router.push(`/details/album/${item.Id}`);
  }, []);

  const handleArtistPress = useCallback((item: BaseItem) => {
    router.push(`/details/artist/${item.Id}`);
  }, []);

  const handlePlaylistPress = useCallback((item: BaseItem) => {
    router.push(`/playlist/${item.Id}`);
  }, []);

  const createPlaylistMutation = useMutation({
    mutationFn: (name: string) => createPlaylist(userId, name),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['playlists'] });
      setShowCreatePlaylist(false);
      setNewPlaylistName('');
      router.push(`/playlist/${data.Id}`);
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create playlist');
    },
  });

  const handleCreatePlaylist = useCallback(() => {
    setShowCreatePlaylist(true);
  }, []);

  const handleConfirmCreatePlaylist = useCallback(() => {
    const name = newPlaylistName.trim();
    if (!name) {
      Alert.alert('Error', 'Please enter a playlist name');
      return;
    }
    createPlaylistMutation.mutate(name);
  }, [newPlaylistName, createPlaylistMutation]);

  const setViewModeHome = useCallback(() => setViewMode('home'), []);
  const setViewModeAlbums = useCallback(() => setViewMode('albums'), []);
  const setViewModeArtists = useCallback(() => setViewMode('artists'), []);
  const setViewModePlaylists = useCallback(() => setViewMode('playlists'), []);

  const renderHomeView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
    >
      {recentlyPlayed?.Items && recentlyPlayed.Items.length > 0 && (
        <>
          <SectionHeader title="Recently Played" onSeeAll={setViewModeAlbums} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyPlayed.Items.map((item) => (
              <View key={item.Id} style={styles.horizontalItem}>
                <AlbumCard item={item} onPress={() => handleAlbumPress(item)} size={HORIZONTAL_ALBUM_SIZE} />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {recentlyAdded && recentlyAdded.length > 0 && (
        <>
          <SectionHeader title="Recently Added" onSeeAll={setViewModeAlbums} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
            {recentlyAdded.map((item) => (
              <View key={item.Id} style={styles.horizontalItem}>
                <AlbumCard item={item} onPress={() => handleAlbumPress(item)} size={HORIZONTAL_ALBUM_SIZE} />
              </View>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderAlbumsView = () => (
    <View style={styles.albumsContainer}>
      <SectionList
        ref={albumsSectionListRef}
        sections={albumSections}
        contentContainerStyle={styles.albumsListContainer}
        renderItem={({ item }) => (
          <AlbumRow item={item} onPress={() => handleAlbumPress(item)} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextAlbums && !isFetchingNextAlbums && fetchNextAlbums()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        ListHeaderComponent={
          <Text style={styles.listHeader}>{totalAlbums} albums</Text>
        }
        ListFooterComponent={
          isFetchingNextAlbums ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={accentColor} size="small" />
              <Text style={styles.loadingFooterText}>Loading more...</Text>
            </View>
          ) : <View style={styles.bottomSpacer} />
        }
        ListEmptyComponent={
          albumsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading albums...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No albums found</Text>
            </View>
          )
        }
        getItemLayout={(data, index) => ({ length: 64, offset: 64 * index, index })}
      />
      <AlphabetScroller
        availableLetters={albumAvailableLetters}
        onLetterPress={scrollToAlbumLetter}
        accentColor={accentColor}
      />
    </View>
  );

  const renderArtistsView = () => (
    <View style={styles.artistsContainer}>
      <SectionList
        ref={artistsSectionListRef}
        sections={artistSections}
        contentContainerStyle={styles.artistsListContainer}
        renderItem={({ item }) => (
          <ArtistRow item={item} onPress={() => handleArtistPress(item)} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        onEndReached={() => hasNextArtists && !isFetchingNextArtists && fetchNextArtists()}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        ListHeaderComponent={
          <Text style={styles.listHeader}>{totalArtists} artists</Text>
        }
        ListFooterComponent={
          isFetchingNextArtists ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={accentColor} size="small" />
              <Text style={styles.loadingFooterText}>Loading more...</Text>
            </View>
          ) : <View style={styles.bottomSpacer} />
        }
        ListEmptyComponent={
          artistsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading artists...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No artists found</Text>
            </View>
          )
        }
        getItemLayout={(data, index) => ({ length: 56, offset: 56 * index, index })}
      />
      <AlphabetScroller
        availableLetters={artistAvailableLetters}
        onLetterPress={scrollToArtistLetter}
        accentColor={accentColor}
      />
    </View>
  );

  const favoritesCount = favorites?.Items?.length ?? 0;

  const renderPlaylistsView = () => (
    <View style={styles.playlistsContainer}>
      <SectionList
        ref={playlistsSectionListRef}
        sections={playlistSections}
        contentContainerStyle={styles.playlistsListContainer}
        renderItem={({ item }) => (
          <PlaylistRow item={item} onPress={() => handlePlaylistPress(item)} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={[styles.sectionHeaderText, { color: accentColor }]}>{section.title}</Text>
          </View>
        )}
        keyExtractor={(item) => item.Id}
        stickySectionHeadersEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.playlistsHeader}>
              <Text style={styles.listHeader}>{totalPlaylists + 1} {totalPlaylists === 0 ? 'playlist' : 'playlists'}</Text>
              <Pressable
                onPress={handleCreatePlaylist}
                style={({ pressed }) => [styles.newPlaylistButton, { backgroundColor: pressed ? accentColor : accentColor + '20' }]}
              >
                <Text style={[styles.newPlaylistButtonText, { color: accentColor }]}>+ New</Text>
              </Pressable>
            </View>
            {/* Favorites as a special playlist */}
            <Pressable
              onPress={() => router.push('/favorites')}
              style={styles.favoritesPlaylistRow}
            >
              <View style={[styles.favoritesPlaylistIcon, { backgroundColor: accentColor + '20' }]}>
                <Ionicons name="heart" size={24} color={accentColor} />
              </View>
              <View style={styles.favoritesPlaylistInfo}>
                <Text style={styles.favoritesPlaylistName}>Favorites</Text>
                <Text style={styles.favoritesPlaylistCount}>{favoritesCount} {favoritesCount === 1 ? 'song' : 'songs'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
            </Pressable>
          </>
        }
        ListEmptyComponent={
          playlistsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
              <Text style={styles.loadingText}>Loading playlists...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No playlists yet</Text>
            </View>
          )
        }
        ListFooterComponent={<View style={styles.bottomSpacer} />}
        getItemLayout={(data, index) => ({ length: 56, offset: 56 * index, index })}
      />
      {playlistSections.length > 0 && (
        <AlphabetScroller
          availableLetters={playlistAvailableLetters}
          onLetterPress={scrollToPlaylistLetter}
          accentColor={accentColor}
        />
      )}
    </View>
  );

  if (!musicLibrary) {
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
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <HomeButton currentScreen="music" />
          <Text style={styles.headerTitle}>Music</Text>
        </View>
        <SearchButton />
      </View>

      <View style={styles.tabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TabButton label="Home" active={viewMode === 'home'} onPress={setViewModeHome} accentColor={accentColor} />
          <TabButton label="Albums" active={viewMode === 'albums'} onPress={setViewModeAlbums} accentColor={accentColor} />
          <TabButton label="Artists" active={viewMode === 'artists'} onPress={setViewModeArtists} accentColor={accentColor} />
          <TabButton label="Playlists" active={viewMode === 'playlists'} onPress={setViewModePlaylists} accentColor={accentColor} />
        </ScrollView>
      </View>

      {viewMode === 'home' && renderHomeView()}
      {viewMode === 'albums' && renderAlbumsView()}
      {viewMode === 'artists' && renderArtistsView()}
      {viewMode === 'playlists' && renderPlaylistsView()}

      <Modal
        visible={showCreatePlaylist}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreatePlaylist(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setShowCreatePlaylist(false)} />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Playlist</Text>
            <TextInput
              style={[styles.modalInput, { borderColor: accentColor }]}
              placeholder="Playlist name"
              placeholderTextColor="#666"
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
              selectionColor={accentColor}
              onSubmitEditing={handleConfirmCreatePlaylist}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowCreatePlaylist(false);
                  setNewPlaylistName('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalCreateButton, { backgroundColor: accentColor }]}
                onPress={handleConfirmCreatePlaylist}
                disabled={createPlaylistMutation.isPending}
              >
                {createPlaylistMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalCreateText}>Create</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabButton: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Album Card
  albumCard: {
    marginBottom: 16,
  },
  albumImageContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginBottom: 8,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
  },
  albumPlaceholderText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 32,
  },
  albumTitle: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  albumArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginTop: 2,
  },
  // Compact Album Card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  compactImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 12,
  },
  compactImage: {
    width: '100%',
    height: '100%',
  },
  compactPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPlaceholderText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 20,
  },
  compactInfo: {
    flex: 1,
  },
  compactTitle: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 15,
  },
  compactArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  // Album Row
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  albumRowImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 14,
  },
  albumRowImage: {
    width: '100%',
    height: '100%',
  },
  albumRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  albumRowPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '600',
  },
  albumRowInfo: {
    flex: 1,
  },
  albumRowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  albumRowArtist: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  // Albums container with alphabet scroller
  albumsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  albumsListContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Artist Row
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  artistRowImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 14,
  },
  artistRowImage: {
    width: '100%',
    height: '100%',
  },
  artistRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  artistRowPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '600',
  },
  artistRowName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Artists container with alphabet scroller
  artistsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  artistsListContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  // Section headers for alphabet grouping
  sectionHeaderContainer: {
    backgroundColor: colors.background.primary,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Alphabet scroller
  alphabetContainer: {
    position: 'absolute',
    right: 2,
    top: 40,
    bottom: 80,
    width: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  alphabetLetter: {
    paddingVertical: 1,
    paddingHorizontal: 4,
  },
  alphabetLetterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Playlist Row
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  playlistRowImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
    marginRight: 14,
  },
  playlistRowImage: {
    width: '100%',
    height: '100%',
  },
  playlistRowPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  playlistRowPlaceholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '600',
  },
  playlistRowName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  // Playlists container
  playlistsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  playlistsListContainer: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  playlistsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  newPlaylistButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  newPlaylistButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAllText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  // Layout containers
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  horizontalItem: {
    marginRight: 12,
  },
  quickPicksContainer: {
    paddingHorizontal: 16,
  },
  emptyFavorites: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyFavoritesText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyFavoritesSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  favoritesPlaylistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  favoritesPlaylistIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  favoritesPlaylistInfo: {
    flex: 1,
  },
  favoritesPlaylistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  favoritesPlaylistCount: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 2,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  listHeader: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  // Loading states
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingFooterText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginLeft: 8,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginTop: 8,
  },
  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateIconText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 28,
  },
  emptyStateTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // No library state
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
