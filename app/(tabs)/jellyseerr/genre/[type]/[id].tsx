import { View, Text, FlatList, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDiscoverByGenre } from '@/hooks';
import { JellyseerrPosterCard } from '@/components/jellyseerr';
import { useSettingsStore } from '@/stores/settingsStore';
import { colors } from '@/theme';
import { goBack } from '@/utils';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

export default function GenreBrowseScreen() {
  const { type, id, name } = useLocalSearchParams<{ type: string; id: string; name: string }>();
  const accentColor = useSettingsStore((s) => s.accentColor);

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

  const items = data?.pages.flatMap((page) =>
    page.results.map((item) => ({
      ...item,
      mediaType: mediaType,
    }))
  ) ?? [];

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    router.push(`/jellyseerr/${item.mediaType}/${item.id}`);
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
            <Pressable onPress={() => goBack('/(tabs)/home')} style={{ marginRight: 16 }}>
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
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.mediaType}-${item.id}`}
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
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No {mediaType === 'movie' ? 'movies' : 'shows'} found</Text>
            </View>
          }
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
    paddingBottom: 32,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  itemContainer: {
    marginBottom: 16,
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
