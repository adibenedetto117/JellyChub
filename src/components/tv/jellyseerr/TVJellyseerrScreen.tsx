import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore, selectHasJellyseerr } from '@/stores/settingsStore';
import {
  useJellyseerrUser,
  useTrending,
  usePopularMovies,
  usePopularTv,
  useUpcomingMovies,
  useJellyseerrSearch,
  useAllRequests,
  useMyRequests,
} from '@/hooks';
import { TVFocusableButton } from '@/components/tv/navigation/TVFocusableButton';
import { TVJellyseerrMediaRow } from './TVJellyseerrMediaRow';
import { TVJellyseerrPosterCard } from './TVJellyseerrPosterCard';
import { TVJellyseerrRequestCard } from './TVJellyseerrRequestCard';
import { TVJellyseerrSearchInput } from './TVJellyseerrSearchInput';
import { tvConstants } from '@/utils/platform';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem, JellyseerrMediaRequest } from '@/types/jellyseerr';
import { MEDIA_STATUS, hasPermission, JELLYSEERR_PERMISSIONS } from '@/types/jellyseerr';

const TV_ACCENT_GOLD = '#D4A84B';

type TabType = 'discover' | 'requests';
type MediaFilterType = 'all' | 'movie' | 'tv';

export function TVJellyseerrScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>('all');
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);

  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const hideAvailable = useSettingsStore((s) => s.jellyseerrHideAvailable);
  const hideProcessing = useSettingsStore((s) => s.jellyseerrHideProcessing);

  const { data: user, refetch: refetchUser } = useJellyseerrUser();
  const { data: trending, refetch: refetchTrending, isLoading: loadingTrending } = useTrending();
  const { data: popularMovies, refetch: refetchPopularMovies, isLoading: loadingPopularMovies } = usePopularMovies();
  const { data: popularTv, refetch: refetchPopularTv, isLoading: loadingPopularTv } = usePopularTv();
  const { data: upcoming, refetch: refetchUpcoming, isLoading: loadingUpcoming } = useUpcomingMovies();
  const { data: searchResults, isLoading: isSearching } = useJellyseerrSearch(searchQuery);

  const {
    data: allRequests,
    refetch: refetchAllRequests,
    fetchNextPage: fetchNextAllRequests,
    hasNextPage: hasNextAllRequests,
  } = useAllRequests();

  const canManageRequests = user
    ? hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.MANAGE_REQUESTS)
    : false;

  const allRequestsList = useMemo(
    () => allRequests?.pages.flatMap((p) => p.results) ?? [],
    [allRequests]
  );

  const pendingCount = useMemo(
    () => allRequestsList.filter((r) => r.status === 1).length,
    [allRequestsList]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchUser(),
      refetchTrending(),
      refetchPopularMovies(),
      refetchPopularTv(),
      refetchUpcoming(),
      refetchAllRequests(),
    ]);
    setRefreshing(false);
  }, [refetchUser, refetchTrending, refetchPopularMovies, refetchPopularTv, refetchUpcoming, refetchAllRequests]);

  const filterItems = useCallback((items: JellyseerrDiscoverItem[]) => {
    return items.filter((item) => {
      if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) {
        return false;
      }
      const status = item?.mediaInfo?.status;
      if (hideAvailable && status === MEDIA_STATUS.AVAILABLE) {
        return false;
      }
      if (hideProcessing && status === MEDIA_STATUS.PROCESSING) {
        return false;
      }
      return true;
    });
  }, [mediaFilter, hideAvailable, hideProcessing]);

  const handleItemPress = useCallback((item: JellyseerrDiscoverItem) => {
    router.push(`/(tabs)/jellyseerr/${item.mediaType}/${item.id}?from=${encodeURIComponent('/(tabs)/requests')}`);
  }, []);

  const handleRequestPress = useCallback((request: JellyseerrMediaRequest) => {
    router.push(`/(tabs)/jellyseerr/${request.type}/${request.media.tmdbId}?from=${encodeURIComponent('/(tabs)/requests')}`);
  }, []);

  const handleRowFocus = useCallback((rowIndex: number) => {
    setFocusedRowIndex(rowIndex);
  }, []);

  const userName = user?.displayName || user?.username || 'User';

  if (!hasJellyseerr) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="film-outline" size={80} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>Jellyseerr Not Connected</Text>
          <Text style={styles.emptySubtext}>
            Connect to Jellyseerr in Settings to request movies and TV shows
          </Text>
          <View style={styles.emptyAction}>
            <TVFocusableButton
              label="Go to Settings"
              icon="settings-outline"
              onPress={() => router.push('/(tabs)/settings')}
              size="large"
              autoFocus
            />
          </View>
        </View>
      </View>
    );
  }

  const filteredSearchResults = filterItems(searchResults?.results ?? []);

  const renderDiscoverContent = () => (
    <ScrollView
      style={styles.flexOne}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TV_ACCENT_GOLD} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchSection}>
        <TVJellyseerrSearchInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search movies and TV shows..."
        />

        <View style={styles.filterBar}>
          <TVFocusableButton
            label="All"
            onPress={() => setMediaFilter('all')}
            active={mediaFilter === 'all'}
            size="small"
          />
          <TVFocusableButton
            label="Movies"
            icon="film-outline"
            onPress={() => setMediaFilter('movie')}
            active={mediaFilter === 'movie'}
            size="small"
          />
          <TVFocusableButton
            label="TV Shows"
            icon="tv-outline"
            onPress={() => setMediaFilter('tv')}
            active={mediaFilter === 'tv'}
            size="small"
          />
        </View>
      </View>

      {searchQuery.length >= 2 ? (
        <View style={styles.searchResultsSection}>
          <View style={styles.sectionHeader}>
            <Ionicons name="search" size={22} color={TV_ACCENT_GOLD} />
            <Text style={styles.sectionTitle}>Search Results</Text>
            <Text style={styles.resultCount}>{filteredSearchResults.length}</Text>
          </View>

          {isSearching ? (
            <View style={styles.loadingContainer}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={styles.skeletonCard} />
              ))}
            </View>
          ) : filteredSearchResults.length === 0 ? (
            <View style={styles.noResults}>
              <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={filteredSearchResults}
              keyExtractor={(item) => `${item.mediaType}-${item.id}`}
              renderItem={({ item, index }) => (
                <TVJellyseerrPosterCard
                  item={item}
                  onPress={() => handleItemPress(item)}
                  autoFocus={index === 0}
                />
              )}
              contentContainerStyle={styles.searchResultsList}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>
      ) : (
        <>
          <TVJellyseerrMediaRow
            title="Trending Now"
            items={filterItems(trending?.results ?? [])}
            onItemPress={handleItemPress}
            icon="trending-up"
            rowIndex={0}
            autoFocusFirstItem={focusedRowIndex === 0}
            onRowFocus={handleRowFocus}
            isLoading={loadingTrending}
          />

          <TVJellyseerrMediaRow
            title="Popular Movies"
            items={filterItems(popularMovies?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            icon="film-outline"
            rowIndex={1}
            onRowFocus={handleRowFocus}
            isLoading={loadingPopularMovies}
          />

          <TVJellyseerrMediaRow
            title="Popular TV Shows"
            items={filterItems(popularTv?.results?.map(item => ({ ...item, mediaType: 'tv' as const })) ?? [])}
            onItemPress={handleItemPress}
            icon="tv-outline"
            rowIndex={2}
            onRowFocus={handleRowFocus}
            isLoading={loadingPopularTv}
          />

          <TVJellyseerrMediaRow
            title="Coming Soon"
            items={filterItems(upcoming?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            icon="calendar-outline"
            rowIndex={3}
            onRowFocus={handleRowFocus}
            isLoading={loadingUpcoming}
          />
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderRequestsContent = () => (
    <FlatList
      data={allRequestsList}
      keyExtractor={(item) => item.id.toString()}
      horizontal
      renderItem={({ item, index }) => (
        <TVJellyseerrRequestCard
          request={item}
          onPress={() => handleRequestPress(item)}
          autoFocus={index === 0}
        />
      )}
      contentContainerStyle={styles.requestsListContent}
      showsHorizontalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TV_ACCENT_GOLD} />
      }
      ListEmptyComponent={
        <View style={styles.emptyRequests}>
          <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyRequestsTitle}>No Requests</Text>
          <Text style={styles.emptyRequestsSubtext}>
            Browse content and request what you want to watch
          </Text>
        </View>
      }
      onEndReached={() => {
        if (hasNextAllRequests) {
          fetchNextAllRequests();
        }
      }}
      onEndReachedThreshold={0.5}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Jellyseerr</Text>
          {user && (
            <Text style={styles.headerSubtitle}>Welcome, {userName}</Text>
          )}
        </View>
      </View>

      <View style={styles.tabBar}>
        <TVFocusableButton
          label="Discover"
          icon="compass-outline"
          onPress={() => setActiveTab('discover')}
          active={activeTab === 'discover'}
          size="medium"
          autoFocus={activeTab === 'discover'}
        />
        <TVFocusableButton
          label={`Requests${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
          icon="document-text-outline"
          onPress={() => setActiveTab('requests')}
          active={activeTab === 'requests'}
          size="medium"
        />
      </View>

      {activeTab === 'discover' && renderDiscoverContent()}
      {activeTab === 'requests' && (
        <View style={styles.requestsContainer}>
          <View style={styles.requestsHeader}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={22} color={TV_ACCENT_GOLD} />
              <Text style={styles.sectionTitle}>All Requests</Text>
              <Text style={styles.resultCount}>{allRequestsList.length}</Text>
            </View>
          </View>
          {renderRequestsContent()}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingTop: tvConstants.controlBarPadding,
    paddingBottom: 24,
  },
  headerLeft: {
    gap: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    color: TV_ACCENT_GOLD,
    fontSize: 16,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingBottom: 24,
    gap: 16,
  },
  searchSection: {
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 32,
  },
  filterBar: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  searchResultsSection: {
    marginBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tvConstants.controlBarPadding,
    marginBottom: 20,
    gap: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  resultCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
    fontWeight: '400',
  },
  loadingContainer: {
    flexDirection: 'row',
    paddingHorizontal: tvConstants.controlBarPadding,
    gap: 20,
  },
  skeletonCard: {
    width: 200,
    height: 300,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  searchResultsList: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 12,
  },
  noResults: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  noResultsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
  },
  requestsContainer: {
    flex: 1,
  },
  requestsHeader: {
    paddingBottom: 16,
  },
  requestsListContent: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingVertical: 12,
  },
  emptyRequests: {
    width: 400,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 16,
  },
  emptyRequestsTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 24,
    fontWeight: '500',
  },
  emptyRequestsSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 16,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '500',
    marginTop: 24,
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 500,
  },
  emptyAction: {
    marginTop: 32,
  },
});
