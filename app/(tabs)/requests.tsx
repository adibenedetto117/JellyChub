import { View, Text, ScrollView, RefreshControl, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
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
import { hasPermission, JELLYSEERR_PERMISSIONS, REQUEST_STATUS } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_LIGHT = '#818cf8';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabType = 'discover' | 'requests' | 'manage';
type FilterType = 'all' | 'pending' | 'approved' | 'available';

function StatCard({
  icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
      <LinearGradient
        colors={[`${color}20`, `${color}08`]}
        style={styles.statCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${color}25` }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </Animated.View>
  );
}

function MediaRow({
  title,
  items,
  onItemPress,
  isLoading,
  delay = 0,
}: {
  title: string;
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  isLoading?: boolean;
  delay?: number;
}) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.section}>
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
          items.slice(0, 15).map((item, index) => (
            <JellyseerrPosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={() => onItemPress(item)}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

function FilterPill({
  label,
  isActive,
  count,
  onPress,
}: {
  label: string;
  isActive: boolean;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={isActive ? [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK] : ['transparent', 'transparent']}
        style={[styles.filterPill, !isActive && styles.filterPillInactive]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
            <Text style={styles.filterBadgeText}>{count}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyStateContainer}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
        style={styles.emptyStateGradient}
      >
        <View style={styles.emptyStateIconContainer}>
          <Ionicons name={icon as any} size={48} color={JELLYSEERR_PURPLE} />
        </View>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
        {action && onAction && (
          <Pressable onPress={onAction}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.emptyStateButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.emptyStateButtonText}>{action}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

export default function RequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [requestFilter, setRequestFilter] = useState<FilterType>('all');

  const accentColor = useSettingsStore((s) => s.accentColor);
  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);

  const { data: user, refetch: refetchUser } = useJellyseerrUser();

  const { data: trending, refetch: refetchTrending, isLoading: loadingTrending } = useTrending();
  const { data: popularMovies, refetch: refetchPopularMovies, isLoading: loadingPopularMovies } = usePopularMovies();
  const { data: popularTv, refetch: refetchPopularTv, isLoading: loadingPopularTv } = usePopularTv();
  const { data: upcoming, refetch: refetchUpcoming, isLoading: loadingUpcoming } = useUpcomingMovies();
  const { data: searchResults, isLoading: isSearching } = useJellyseerrSearch(searchQuery);

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

  const stats = useMemo(() => {
    const all = allRequests?.pages.flatMap((p) => p.results) ?? [];
    const pending = all.filter((r) => r.status === REQUEST_STATUS.PENDING).length;
    const approved = all.filter((r) => r.status === REQUEST_STATUS.APPROVED).length;
    const available = all.filter((r) => r.status === REQUEST_STATUS.AVAILABLE || r.status === REQUEST_STATUS.PARTIALLY_AVAILABLE).length;
    const processing = all.filter((r) => r.status === REQUEST_STATUS.APPROVED && r.media?.status === 3).length;
    return { pending, approved, available, processing };
  }, [allRequests]);

  const pendingCount = pendingRequests?.results?.length ?? stats.pending;
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
          style={styles.headerGradient}
        />
        <View style={styles.notConnectedContainer}>
          <View style={styles.notConnectedIconContainer}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.notConnectedIconGradient}
            >
              <Ionicons name="film" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.notConnectedTitle}>Jellyseerr</Text>
          <Text style={styles.notConnectedSubtitle}>
            Discover and request movies and TV shows from your media server
          </Text>
          <Pressable onPress={() => router.push('/settings/jellyseerr')}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.connectButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="link" size={18} color="#fff" />
              <Text style={styles.connectButtonText}>Connect Server</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderDiscoverContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies and TV shows..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <View style={styles.clearButton}>
                <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
          )}
        </View>
      </Animated.View>

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
            <EmptyState
              icon="search-outline"
              title="No Results"
              subtitle={`No movies or shows found for "${searchQuery}"`}
            />
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
          <MediaRow
            title="Trending Now"
            items={trending?.results ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingTrending}
            delay={100}
          />

          <MediaRow
            title="Popular Movies"
            items={popularMovies?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingPopularMovies}
            delay={200}
          />

          <MediaRow
            title="Popular TV Shows"
            items={popularTv?.results?.map(item => ({ ...item, mediaType: 'tv' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingPopularTv}
            delay={300}
          />

          <MediaRow
            title="Coming Soon"
            items={upcoming?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? []}
            onItemPress={handleItemPress}
            isLoading={loadingUpcoming}
            delay={400}
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
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
          <RequestCard
            request={item}
            onPress={() => handleRequestPress(item)}
            onDelete={() => handleDelete(item.id)}
            isOwnRequest
            isDeleting={deleteRequest.isPending && deleteRequest.variables === item.id}
          />
        </Animated.View>
      )}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
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
            <ActivityIndicator color={JELLYSEERR_PURPLE} />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <EmptyState
          icon="film-outline"
          title="No Requests Yet"
          subtitle="Discover movies and TV shows to request from your media server"
          action="Browse Content"
          onAction={() => setActiveTab('discover')}
        />
      }
    />
  );

  const renderManageContent = () => (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsContainer}
        >
          <StatCard icon="time" label="Pending" value={stats.pending} color="#fbbf24" delay={0} />
          <StatCard icon="checkmark-circle" label="Approved" value={stats.approved} color="#3b82f6" delay={100} />
          <StatCard icon="checkmark-done" label="Available" value={stats.available} color="#22c55e" delay={200} />
          <StatCard icon="sync" label="Processing" value={stats.processing} color="#8b5cf6" delay={300} />
        </ScrollView>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterPill
            label="All"
            isActive={requestFilter === 'all'}
            onPress={() => setRequestFilter('all')}
          />
          <FilterPill
            label="Pending"
            isActive={requestFilter === 'pending'}
            count={stats.pending}
            onPress={() => setRequestFilter('pending')}
          />
          <FilterPill
            label="Approved"
            isActive={requestFilter === 'approved'}
            onPress={() => setRequestFilter('approved')}
          />
          <FilterPill
            label="Available"
            isActive={requestFilter === 'available'}
            onPress={() => setRequestFilter('available')}
          />
        </ScrollView>
      </Animated.View>

      <FlatList
        data={allRequestsList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
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
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
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
              <ActivityIndicator color={JELLYSEERR_PURPLE} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="All Clear"
            subtitle="No requests to manage right now"
          />
        }
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}20`, `${JELLYSEERR_PURPLE}05`, 'transparent']}
        style={styles.headerGradient}
      />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.logoGradient}
            >
              <Ionicons name="film" size={16} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Jellyseerr</Text>
            {user && (
              <Text style={styles.headerSubtitle}>Welcome, {user.displayName || user.username || 'User'}</Text>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={styles.tabBar}>
        {tabs.filter((t) => t.visible).map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? JELLYSEERR_PURPLE : colors.text.tertiary },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <View style={[styles.tabBadge, { backgroundColor: JELLYSEERR_PURPLE }]}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              {isActive && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <LinearGradient
                    colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                    style={styles.tabIndicator}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>
              )}
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
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '700',
  },
  tabIndicator: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 56) / 4,
    minWidth: 80,
  },
  statCardGradient: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterPillInactive: {
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    flexGrow: 1,
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    width: '100%',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${JELLYSEERR_PURPLE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIconContainer: {
    marginBottom: 24,
  },
  notConnectedIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConnectedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  notConnectedSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
