import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from '@/providers';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoverByGenre } from '@/hooks';
import { JellyseerrPosterCard } from '@/components/jellyseerr';
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

  // Filter out null/undefined items and ensure each has a valid id
  const items = (data?.pages.flatMap((page) =>
    page.results.map((item) => ({
      ...item,
      mediaType: mediaType,
    }))
  ) ?? []).filter((item): item is JellyseerrDiscoverItem & { mediaType: 'movie' | 'tv' } =>
    item != null && item.id != null
  );

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    // Pass current genre screen as source, so back navigates here
    const currentPath = `/(tabs)/jellyseerr/genre/${type}/${id}`;
    router.push(`/(tabs)/jellyseerr/${item.mediaType}/${item.id}?from=${encodeURIComponent(currentPath)}`);
  };

  const renderItem = ({ item }: { item: JellyseerrDiscoverItem }) => (
    <View style={styles.itemContainer}>
      <JellyseerrPosterCard
        item={item}
        onPress={() => handleItemPress(item)}
        size="medium"
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: genreName,
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
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyText}>No {mediaType === 'movie' ? 'movies' : 'shows'} found</Text>
        </View>
      ) : (
        <FlatList
          key={`genre-${genreId}-${mediaType}`}
          data={items}
          keyExtractor={(item, index) => `${item.mediaType}-${item.id}-${index}`}
          renderItem={renderItem}
          numColumns={3}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator color={accentColor} />
              </View>
            ) : null
          }
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={5}
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
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
    gap: 8,
  },
  itemContainer: {
    marginBottom: 16,
    flex: 1,
    maxWidth: '33.33%',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
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
