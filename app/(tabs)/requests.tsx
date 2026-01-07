import { View, Text, ScrollView, RefreshControl, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  useMyRequests,
  useAllRequests,
  usePendingRequests,
  useApproveRequest,
  useDeclineRequest,
  useDeleteRequest,
} from '@/hooks';
import { JellyseerrPosterCard, RequestCard } from '@/components/jellyseerr';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem, JellyseerrMediaRequest } from '@/types/jellyseerr';
import { hasPermission, JELLYSEERR_PERMISSIONS } from '@/types/jellyseerr';

type TabType = 'discover' | 'requests' | 'manage';

// Horizontal media row component
function MediaRow({
  title,
  items,
  onItemPress,
  isLoading,
}: {
  title: string;
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  isLoading?: boolean;
}) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ marginRight: 12 }}>
              <Skeleton width={130} height={195} borderRadius={12} />
            </View>
          ))
        ) : (
          items.slice(0, 15).map((item) => (
            <JellyseerrPosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={() => onItemPress(item)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

export default function RequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [requestFilter, setRequestFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const accentColor = useSettingsStore((s) => s.accentColor);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);

  // User & auth
  const { data: user, refetch: refetchUser } = useJellyseerrUser();

  // Discovery data
  const { data: trending, refetch: refetchTrending, isLoading: loadingTrending } = useTrending();
  const { data: popularMovies, refetch: refetchPopularMovies, isLoading: loadingPopularMovies } = usePopularMovies();
  const { data: popularTv, refetch: refetchPopularTv, isLoading: loadingPopularTv } = usePopularTv();
  const { data: upcoming, refetch: refetchUpcoming, isLoading: loadingUpcoming } = useUpcomingMovies();
  const { data: searchResults, isLoading: isSearching } = useJellyseerrSearch(searchQuery);

  // Requests data with pagination
  const {
    data: myRequests,
    refetch: refetchMyRequests,
    fetchNextPage: fetchNextMyRequests,
    hasNextPage: hasNextMyRequests,
    isFetchingNextPage: isFetchingNextMyRequests,
  } = useMyRequests();
  const {
    data: allRequests,
    refetch: refetchAllRequests,
    fetchNextPage: fetchNextAllRequests,
    hasNextPage: hasNextAllRequests,
    isFetchingNextPage: isFetchingNextAllRequests,
  } = useAllRequests(requestFilter);
  const { data: pendingRequests } = usePendingRequests();

  // Flatten paginated results
  const myRequestsList = useMemo(
    () => myRequests?.pages.flatMap((p) => p.results) ?? [],
    [myRequests]
  );
  const allRequestsList = useMemo(
    () => allRequests?.pages.flatMap((p) => p.results) ?? [],
    [allRequests]
  );

  const approveRequest = useApproveRequest();
  const declineRequest = useDeclineRequest();
  const deleteRequest = useDeleteRequest();

  const canManageRequests = user
    ? hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.MANAGE_REQUESTS)
    : false;

  const pendingCount = pendingRequests?.results?.length ?? 0;
  const myRequestsCount = myRequests?.pages?.[0]?.pageInfo?.results ?? 0;

  const tabs: { id: TabType; label: string; visible: boolean; badge?: number }[] = useMemo(() => [
    { id: 'discover', label: 'Discover', visible: true },
    { id: 'requests', label: 'My Requests', visible: true, badge: myRequestsCount > 0 ? myRequestsCount : undefined },
    { id: 'manage', label: 'Manage', visible: canManageRequests, badge: pendingCount > 0 ? pendingCount : undefined },
  ], [canManageRequests, pendingCount, myRequestsCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchUser(),
      refetchTrending(),
      refetchPopularMovies(),
      refetchPopularTv(),
      refetchUpcoming(),
      refetchMyRequests(),
      refetchAllRequests(),
    ]);
    setRefreshing(false);
  }, [refetchUser, refetchTrending, refetchPopularMovies, refetchPopularTv, refetchUpcoming, refetchMyRequests, refetchAllRequests]);

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    router.push(`/jellyseerr/${item.mediaType}/${item.id}`);
  };

  const handleRequestPress = (request: JellyseerrMediaRequest) => {
    router.push(`/jellyseerr/${request.type}/${request.media.tmdbId}`);
  };

  const handleApprove = (requestId: number) => {
    approveRequest.mutate(requestId);
  };

  const handleDelete = (requestId: number) => {
    deleteRequest.mutate(requestId);
  };

  const handleDecline = (requestId: number) => {
    declineRequest.mutate(requestId);
  };

  if (!hasJellyseerr) {
    return (
      <SafeAreaView style={styles.emptyContainer} edges={['top']}>
        <Ionicons name="film-outline" size={64} color="rgba(255,255,255,0.2)" />
        <Text style={styles.emptyTitle}>Jellyseerr Not Connected</Text>
        <Text style={styles.emptySubtitle}>
          Connect your Jellyseerr server to discover and request movies and TV shows.
        </Text>
        <Pressable
          style={[styles.connectButton, { backgroundColor: accentColor }]}
          onPress={() => router.push('/settings/jellyseerr')}
        >
          <Ionicons name="link-outline" size={18} color="#fff" />
          <Text style={styles.connectButtonText}>Connect Jellyseerr</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const renderDiscoverContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies and TV shows..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="rgba(255,255,255,0.4)" />
            </Pressable>
          )}
        </View>
      </View>

      {searchQuery.length >= 2 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {isSearching ? (
            <View style={styles.gridContainer}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ marginRight: 12, marginBottom: 12 }}>
                  <Skeleton width={130} height={195} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : searchResults?.results.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search-outline" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={styles.noResultsText}>No results found for "{searchQuery}"</Text>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {searchResults?.results.map((item) => (
                <JellyseerrPosterCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          {/* Trending */}
          <MediaRow
            title="Trending Now"
            items={trending?.results ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingTrending}
          />

          {/* Popular Movies */}
          <MediaRow
            title="Popular Movies"
            items={popularMovies?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingPopularMovies}
          />

          {/* Popular TV */}
          <MediaRow
            title="Popular TV Shows"
            items={popularTv?.results?.map(item => ({ ...item, mediaType: 'tv' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingPopularTv}
          />

          {/* Upcoming */}
          <MediaRow
            title="Coming Soon"
            items={upcoming?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingUpcoming}
          />
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const renderRequestsContent = () => (
    <FlatList
      data={myRequestsList}
      keyExtractor={(item) => item.id.toString()}
      renderItem={({ item }) => (
        <RequestCard
          request={item}
          onPress={() => handleRequestPress(item)}
          onDelete={() => handleDelete(item.id)}
          isOwnRequest
          isDeleting={deleteRequest.isPending && deleteRequest.variables === item.id}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
      }
      onEndReached={() => {
        if (hasNextMyRequests && !isFetchingNextMyRequests) {
          fetchNextMyRequests();
        }
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={
        isFetchingNextMyRequests ? (
          <View style={styles.loadingFooter}>
            <ActivityIndicator color={accentColor} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyListContainer}>
          <Ionicons name="document-text-outline" size={48} color="rgba(255,255,255,0.2)" />
          <Text style={styles.emptyListTitle}>No Requests Yet</Text>
          <Text style={styles.emptyListSubtitle}>
            Browse the Discover tab to find and request movies and shows
          </Text>
        </View>
      }
    />
  );

  const renderManageContent = () => (
    <View style={{ flex: 1 }}>
      {/* Filter pills */}
      <View style={styles.filterRow}>
        {(['all', 'pending', 'approved'] as const).map((filter) => {
          const isActive = requestFilter === filter;
          const count = filter === 'pending' ? pendingCount : undefined;
          return (
            <Pressable
              key={filter}
              style={[
                styles.filterPill,
                { backgroundColor: isActive ? accentColor : colors.surface.default },
              ]}
              onPress={() => setRequestFilter(filter)}
            >
              <Text style={[styles.filterPillText, { color: isActive ? '#fff' : colors.text.secondary }]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
              {count !== undefined && count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : accentColor }]}>
                  <Text style={styles.filterBadgeText}>{count}</Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={allRequestsList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            showActions
            userPermissions={user?.permissions ?? 0}
            onApprove={() => handleApprove(item.id)}
            onDecline={() => handleDecline(item.id)}
            isApproving={approveRequest.isPending && approveRequest.variables === item.id}
            isDeclining={declineRequest.isPending && declineRequest.variables === item.id}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        onEndReached={() => {
          if (hasNextAllRequests && !isFetchingNextAllRequests) {
            fetchNextAllRequests();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextAllRequests ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyListContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyListTitle}>All Clear</Text>
            <Text style={styles.emptyListSubtitle}>No requests to manage</Text>
          </View>
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Requests</Text>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.filter((t) => t.visible).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
              <Text
                style={[
                  styles.tabText,
                  { color: isActive ? accentColor : colors.text.tertiary },
                ]}
              >
                {tab.label}
              </Text>
              {tab.badge && (
                <View style={[styles.tabBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                </View>
              )}
              {isActive && <View style={[styles.tabIndicator, { backgroundColor: accentColor }]} />}
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'discover' && renderDiscoverContent()}
      {activeTab === 'requests' && renderRequestsContent()}
      {activeTab === 'manage' && renderManageContent()}
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
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 20,
  },
  tab: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noResultsText: {
    color: colors.text.tertiary,
    marginTop: 12,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
  },
  filterBadge: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyListTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyListSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
