import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoverByGenre } from '@/hooks';
import { PosterGrid } from '@/components/shared/jellyseerr';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/theme';
import { goBack } from '@/utils';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

export default function GenreBrowseScreen() {
  const { type, id, name, from } = useLocalSearchParams<{ type: string; id: string; name: string; from?: string }>();
  const accentColor = useSettingsStore((s) => s.accentColor);

  const handleGoBack = () => {
    goBack(from, '/(tabs)/requests');
  };

  const mediaType = type as 'movie' | 'tv';
  const genreId = id ? parseInt(id, 10) : undefined;
  const genreName = name ? decodeURIComponent(name) : 'Genre';

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useDiscoverByGenre(mediaType, genreId);

  const items = (data?.pages.flatMap((page) =>
    page.results.map((item) => ({
      ...item,
      mediaType: mediaType,
    }))
  ) ?? []).filter((item): item is JellyseerrDiscoverItem & { mediaType: 'movie' | 'tv' } =>
    item != null && item.id != null
  );

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    const currentPath = `/(tabs)/jellyseerr/genre/${type}/${id}`;
    router.push(`/(tabs)/jellyseerr/${item.mediaType}/${item.id}?from=${encodeURIComponent(currentPath)}`);
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: genreName,
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerLeft: () => (
            <Pressable onPress={handleGoBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => router.push('/search')} style={styles.headerButtonRight}>
              <Ionicons name="search" size={22} color="#fff" />
            </Pressable>
          ),
        }}
      />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>No {mediaType === 'movie' ? 'movies' : 'shows'} found</Text>
        </View>
      ) : (
        <PosterGrid
          items={items}
          onItemPress={handleItemPress}
          onEndReached={handleEndReached}
          isFetchingMore={isFetchingNextPage}
          accentColor={accentColor}
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
  headerButton: {
    marginRight: 16,
  },
  headerButtonRight: {
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: 12,
  },
});
