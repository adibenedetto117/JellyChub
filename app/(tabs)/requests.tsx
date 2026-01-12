import { View, Text, ScrollView, RefreshControl, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useSettingsStore, selectHasJellyseerr } from '@/stores/settingsStore';
import {
  useJellyseerrUser,
  useTrending,
  usePopularMovies,
  usePopularTv,
  useUpcomingMovies,
  useJellyseerrSearch,
  useAllRequests,
  usePendingRequests,
  useApproveRequest,
  useDeclineRequest,
  useDeleteRequest,
  useJellyseerrServerStatus,
  useJellyseerrAbout,
  useJellyseerrCacheStats,
  useFlushCache,
  useJellyseerrJobs,
  useRunJob,
  useCancelJob,
  useJellyfinSyncStatus,
  useStartJellyfinSync,
  useCancelJellyfinSync,
} from '@/hooks';
import { JellyseerrPosterCard, RequestCard } from '@/components/jellyseerr';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem, JellyseerrMediaRequest, JellyseerrJob } from '@/types/jellyseerr';
import { hasPermission, JELLYSEERR_PERMISSIONS, REQUEST_STATUS, MEDIA_STATUS, COMMON_GENRES } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

function getItemStatus(item: JellyseerrDiscoverItem): number | undefined {
  return item?.mediaInfo?.status;
}

type TabType = 'discover' | 'requests' | 'admin';
type FilterType = 'all' | 'pending' | 'approved' | 'available';

function SettingsSection({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function SettingsCard({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  action,
  onAction,
  isLoading,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  action?: string;
  onAction?: () => void;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.settingsCard}>
      <View style={[styles.settingsCardIcon, { backgroundColor: `${iconColor || JELLYSEERR_PURPLE}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor || JELLYSEERR_PURPLE} />
      </View>
      <View style={styles.settingsCardContent}>
        <Text style={styles.settingsCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsCardSubtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && (
        <Text style={styles.settingsCardValue}>{value}</Text>
      )}
      {action && onAction && (
        <Pressable onPress={onAction} disabled={isLoading} style={styles.settingsCardAction}>
          {isLoading ? (
            <ActivityIndicator size="small" color={JELLYSEERR_PURPLE} />
          ) : (
            <Text style={styles.settingsCardActionText}>{action}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function JobCard({
  job,
  onRun,
  onCancel,
  isRunning,
}: {
  job: JellyseerrJob;
  onRun: () => void;
  onCancel: () => void;
  isRunning: boolean;
}) {
  const nextRun = new Date(job.nextExecutionTime);
  const isValidDate = !isNaN(nextRun.getTime());
  const nextRunText = isValidDate
    ? nextRun.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'N/A';

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={[styles.jobCardIcon, { backgroundColor: job.running ? '#22c55e20' : `${JELLYSEERR_PURPLE}20` }]}>
          <Ionicons
            name={job.running ? 'sync' : 'time-outline'}
            size={18}
            color={job.running ? '#22c55e' : JELLYSEERR_PURPLE}
          />
        </View>
        <View style={styles.jobCardContent}>
          <Text style={styles.jobCardTitle}>{job.name}</Text>
          <Text style={styles.jobCardSubtitle}>
            {job.running ? 'Running...' : `Next: ${nextRunText}`}
          </Text>
        </View>
        <Pressable
          onPress={job.running ? onCancel : onRun}
          disabled={isRunning}
          style={[styles.jobCardButton, job.running && styles.jobCardButtonCancel]}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={job.running ? 'stop' : 'play'}
                size={14}
                color="#fff"
              />
              <Text style={styles.jobCardButtonText}>
                {job.running ? 'Stop' : 'Run'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
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
          <View style={[styles.filterPillBadge, isActive && styles.filterPillBadgeActive]}>
            <Text style={styles.filterPillBadgeText}>{count}</Text>
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

export default function RequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [requestFilter, setRequestFilter] = useState<FilterType>('all');
  const [runningJobId, setRunningJobId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const hideAvailable = useSettingsStore((s) => s.jellyseerrHideAvailable);
  const setHideAvailable = useSettingsStore((s) => s.setJellyseerrHideAvailable);
  const hideProcessing = useSettingsStore((s) => s.jellyseerrHideProcessing);
  const setHideProcessing = useSettingsStore((s) => s.setJellyseerrHideProcessing);
  const hidePartial = useSettingsStore((s) => s.jellyseerrHidePartial);
  const setHidePartial = useSettingsStore((s) => s.setJellyseerrHidePartial);
  const mediaFilter = useSettingsStore((s) => s.jellyseerrMediaFilter);
  const setMediaFilter = useSettingsStore((s) => s.setJellyseerrMediaFilter);
  const genreFilter = useSettingsStore((s) => s.jellyseerrGenreFilter);
  const toggleGenre = useSettingsStore((s) => s.toggleJellyseerrGenre);
  const minRating = useSettingsStore((s) => s.jellyseerrMinRating);
  const setMinRating = useSettingsStore((s) => s.setJellyseerrMinRating);
  const ratingSource = useSettingsStore((s) => s.jellyseerrRatingSource);
  const setRatingSource = useSettingsStore((s) => s.setJellyseerrRatingSource);
  const yearFilter = useSettingsStore((s) => s.jellyseerrYearFilter);
  const setYearFilter = useSettingsStore((s) => s.setJellyseerrYearFilter);
  const clearFilters = useSettingsStore((s) => s.clearJellyseerrFilters);

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
    isFetchingNextPage: isFetchingNextAllRequests,
  } = useAllRequests(requestFilter);
  const { data: pendingRequests } = usePendingRequests();

  const { data: serverStatus, refetch: refetchStatus } = useJellyseerrServerStatus();
  const { data: aboutInfo, refetch: refetchAbout } = useJellyseerrAbout();
  const { data: cacheStats, refetch: refetchCache } = useJellyseerrCacheStats();
  const { data: jobs, refetch: refetchJobs } = useJellyseerrJobs();
  const { data: syncStatus, refetch: refetchSync } = useJellyfinSyncStatus();

  const flushCache = useFlushCache();
  const runJob = useRunJob();
  const cancelJob = useCancelJob();
  const startSync = useStartJellyfinSync();
  const cancelSync = useCancelJellyfinSync();

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

  const isAdmin = user
    ? hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.ADMIN)
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

  const tabs: { id: TabType; label: string; visible: boolean; badge?: number }[] = useMemo(() => [
    { id: 'discover', label: 'Discover', visible: true },
    { id: 'requests', label: 'Requests', visible: true, badge: pendingCount > 0 && canManageRequests ? pendingCount : undefined },
    { id: 'admin', label: 'Admin', visible: isAdmin },
  ], [canManageRequests, pendingCount, isAdmin]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const refreshPromises: Promise<unknown>[] = [
      refetchUser(),
      refetchTrending(),
      refetchPopularMovies(),
      refetchPopularTv(),
      refetchUpcoming(),
      refetchAllRequests(),
    ];
    if (activeTab === 'admin') {
      refreshPromises.push(refetchStatus(), refetchAbout(), refetchCache(), refetchJobs(), refetchSync());
    }
    await Promise.all(refreshPromises);
    setRefreshing(false);
  }, [refetchUser, refetchTrending, refetchPopularMovies, refetchPopularTv, refetchUpcoming, refetchAllRequests, activeTab, refetchStatus, refetchAbout, refetchCache, refetchJobs, refetchSync]);

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    router.push(`/(tabs)/jellyseerr/${item.mediaType}/${item.id}?from=${encodeURIComponent('/(tabs)/requests')}`);
  };

  const handleRequestPress = (request: JellyseerrMediaRequest) => {
    router.push(`/(tabs)/jellyseerr/${request.type}/${request.media.tmdbId}?from=${encodeURIComponent('/(tabs)/requests')}`);
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

  const filterItems = useCallback((items: JellyseerrDiscoverItem[]) => {
    return items.filter((item) => {
      // Media type filter
      if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) {
        return false;
      }

      const status = getItemStatus(item);

      // Status filters
      if (hideAvailable && status === MEDIA_STATUS.AVAILABLE) {
        return false;
      }
      if (hideProcessing && status === MEDIA_STATUS.PROCESSING) {
        return false;
      }
      if (hidePartial && status === MEDIA_STATUS.PARTIALLY_AVAILABLE) {
        return false;
      }

      // Genre filter - item must have at least one of the selected genres
      if (genreFilter.length > 0) {
        const itemGenres = item.genreIds || [];
        const hasMatchingGenre = genreFilter.some((gId) => itemGenres.includes(gId));
        if (!hasMatchingGenre) {
          return false;
        }
      }

      // Rating filter
      if (minRating > 0 && (item.voteAverage || 0) < minRating) {
        return false;
      }

      // Year filter
      if (yearFilter) {
        const releaseDate = item.releaseDate || item.firstAirDate;
        if (releaseDate) {
          const itemYear = new Date(releaseDate).getFullYear();
          if (itemYear !== yearFilter) {
            return false;
          }
        } else {
          return false; // No date means we can't match the year filter
        }
      }

      return true;
    });
  }, [hideAvailable, hideProcessing, hidePartial, mediaFilter, genreFilter, minRating, yearFilter]);

  // Check if any filters are active and count them
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (hideAvailable) count++;
    if (hideProcessing) count++;
    if (hidePartial) count++;
    if (mediaFilter !== 'all') count++;
    if (genreFilter.length > 0) count++;
    if (minRating > 0) count++;
    if (yearFilter !== null) count++;
    return count;
  }, [hideAvailable, hideProcessing, hidePartial, mediaFilter, genreFilter, minRating, yearFilter]);

  const hasActiveFilters = activeFilterCount > 0;

  const handleRunJob = (jobId: string) => {
    setRunningJobId(jobId);
    runJob.mutate(jobId, {
      onSettled: () => setRunningJobId(null),
    });
  };

  const handleCancelJob = (jobId: string) => {
    setRunningJobId(jobId);
    cancelJob.mutate(jobId, {
      onSettled: () => setRunningJobId(null),
    });
  };

  const handleFlushCache = (cacheId: string) => {
    flushCache.mutate(cacheId);
  };

  const handleSync = () => {
    if (syncStatus?.running) {
      cancelSync.mutate();
    } else {
      startSync.mutate();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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

        {/* Compact Filter Bar */}
        <View style={styles.compactFilterBar}>
          {/* Media Type Pills */}
          <View style={styles.mediaFilterRow}>
            <Pressable
              onPress={() => setMediaFilter('all')}
              style={[styles.mediaFilterChip, mediaFilter === 'all' && styles.mediaFilterChipActive]}
            >
              <Text style={[styles.mediaFilterText, mediaFilter === 'all' && styles.mediaFilterTextActive]}>All</Text>
            </Pressable>
            <Pressable
              onPress={() => setMediaFilter('movie')}
              style={[styles.mediaFilterChip, mediaFilter === 'movie' && styles.mediaFilterChipActive]}
            >
              <Ionicons name="film-outline" size={14} color={mediaFilter === 'movie' ? '#fff' : colors.text.muted} />
              <Text style={[styles.mediaFilterText, mediaFilter === 'movie' && styles.mediaFilterTextActive]}>Movies</Text>
            </Pressable>
            <Pressable
              onPress={() => setMediaFilter('tv')}
              style={[styles.mediaFilterChip, mediaFilter === 'tv' && styles.mediaFilterChipActive]}
            >
              <Ionicons name="tv-outline" size={14} color={mediaFilter === 'tv' ? '#fff' : colors.text.muted} />
              <Text style={[styles.mediaFilterText, mediaFilter === 'tv' && styles.mediaFilterTextActive]}>TV</Text>
            </Pressable>
          </View>

          {/* Filter Button */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          >
            <Ionicons name="options" size={18} color={hasActiveFilters ? '#fff' : colors.text.muted} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
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
          ) : filterItems(searchResults?.results ?? []).length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No Results"
              subtitle={
                hasActiveFilters
                  ? `No results found for "${searchQuery}" with current filters`
                  : `No movies or shows found for "${searchQuery}"`
              }
            />
          ) : (
            <FlatList
              data={filterItems(searchResults?.results ?? [])}
              keyExtractor={(item) => `${item.mediaType}-${item.id}`}
              numColumns={3}
              columnWrapperStyle={styles.searchGridRow}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.searchGridItem}>
                  <JellyseerrPosterCard
                    item={item}
                    onPress={() => handleItemPress(item)}
                    size="small"
                  />
                </View>
              )}
            />
          )}
        </View>
      ) : (
        <>
          <MediaRow
            title="Trending Now"
            items={filterItems(trending?.results ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingTrending}
            delay={100}
          />

          <MediaRow
            title="Popular Movies"
            items={filterItems(popularMovies?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingPopularMovies}
            delay={200}
          />

          <MediaRow
            title="Popular TV Shows"
            items={filterItems(popularTv?.results?.map(item => ({ ...item, mediaType: 'tv' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingPopularTv}
            delay={300}
          />

          <MediaRow
            title="Coming Soon"
            items={filterItems(upcoming?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingUpcoming}
            delay={400}
          />
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderRequestsContent = () => (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(300)}>
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
          <Animated.View entering={FadeInRight.delay(Math.min(index, 10) * 30).duration(300)}>
            <RequestCard
              request={item}
              onPress={() => handleRequestPress(item)}
              onDelete={() => handleDelete(item.id)}
              showActions={canManageRequests}
              userPermissions={user?.permissions ?? 0}
              onApprove={() => handleApprove(item.id)}
              onDecline={() => handleDecline(item.id)}
              isOwnRequest={item.requestedBy?.id === user?.id}
              isApproving={approveRequest.isPending && approveRequest.variables === item.id}
              isDeclining={declineRequest.isPending && declineRequest.variables === item.id}
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
            icon="film-outline"
            title="No Requests"
            subtitle={requestFilter === 'all' ? "No requests yet" : "No requests match this filter"}
            action={requestFilter === 'all' ? "Browse Content" : undefined}
            onAction={requestFilter === 'all' ? () => setActiveTab('discover') : undefined}
          />
        }
      />
    </View>
  );

  const renderAdminContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.adminContent}
    >
      <SettingsSection title="Server Status" delay={0}>
        <SettingsCard
          icon="server-outline"
          iconColor="#22c55e"
          title="Version"
          subtitle={serverStatus?.commitTag || 'Unknown'}
          value={serverStatus?.version}
        />
        {serverStatus?.updateAvailable && (
          <SettingsCard
            icon="arrow-up-circle-outline"
            iconColor="#f59e0b"
            title="Update Available"
            subtitle={`${serverStatus.commitsBehind} commits behind`}
          />
        )}
        <SettingsCard
          icon="film-outline"
          title="Total Media"
          value={aboutInfo?.totalMediaItems ?? 0}
        />
        <SettingsCard
          icon="document-text-outline"
          title="Total Requests"
          value={aboutInfo?.totalRequests ?? 0}
        />
      </SettingsSection>

      <SettingsSection title="Library Sync" delay={100}>
        <SettingsCard
          icon={syncStatus?.running ? 'sync' : 'library-outline'}
          iconColor={syncStatus?.running ? '#22c55e' : JELLYSEERR_PURPLE}
          title="Jellyfin Library"
          subtitle={syncStatus?.running ? `Syncing... ${syncStatus.progress}/${syncStatus.total}` : 'Sync media library with Jellyfin'}
          action={syncStatus?.running ? 'Cancel' : 'Sync Now'}
          onAction={handleSync}
          isLoading={startSync.isPending || cancelSync.isPending}
        />
        {syncStatus?.running && syncStatus.currentLibrary && (
          <View style={styles.syncProgress}>
            <View style={styles.syncProgressBar}>
              <View
                style={[
                  styles.syncProgressFill,
                  { width: `${syncStatus.total > 0 ? (syncStatus.progress / syncStatus.total) * 100 : 0}%` },
                ]}
              />
            </View>
            <Text style={styles.syncProgressText}>
              Scanning: {syncStatus.currentLibrary.name}
            </Text>
          </View>
        )}
      </SettingsSection>

      <SettingsSection title="Cache Management" delay={200}>
        <SettingsCard
          icon="speedometer-outline"
          title="API Cache"
          subtitle={`Hits: ${cacheStats?.apiCacheHits ?? 0} / Misses: ${cacheStats?.apiCacheMisses ?? 0}`}
          action="Flush"
          onAction={() => handleFlushCache('apiCache')}
          isLoading={flushCache.isPending}
        />
        <SettingsCard
          icon="image-outline"
          title="Image Cache"
          subtitle={`${cacheStats?.imageCache?.tmdb?.total ?? 0} images`}
          value={formatBytes(cacheStats?.imageCache?.tmdb?.size ?? 0)}
          action="Flush"
          onAction={() => handleFlushCache('imageCache')}
          isLoading={flushCache.isPending}
        />
      </SettingsSection>

      <SettingsSection title="Scheduled Jobs" delay={300}>
        {jobs?.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onRun={() => handleRunJob(job.id)}
            onCancel={() => handleCancelJob(job.id)}
            isRunning={runningJobId === job.id}
          />
        ))}
        {(!jobs || jobs.length === 0) && (
          <Text style={styles.noJobsText}>No scheduled jobs available</Text>
        )}
      </SettingsSection>

      <View style={{ height: 100 }} />
    </ScrollView>
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
      {activeTab === 'admin' && renderAdminContent()}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={styles.filterModalContent}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filters</Text>
              <View style={styles.filterModalActions}>
                {hasActiveFilters && (
                  <Pressable onPress={clearFilters} style={styles.clearAllButton}>
                    <Text style={styles.clearAllText}>Clear All</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => setShowFilterModal(false)} style={styles.closeModalButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </Pressable>
              </View>
            </View>

            <ScrollView style={styles.filterModalScroll} showsVerticalScrollIndicator={false}>
              {/* Genres */}
              <View style={styles.filterModalSection}>
                <Text style={styles.filterModalLabel}>Genres</Text>
                <View style={styles.filterModalChipGrid}>
                  {COMMON_GENRES.map((genre) => {
                    const isActive = genreFilter.includes(genre.id);
                    return (
                      <Pressable
                        key={genre.id}
                        onPress={() => toggleGenre(genre.id)}
                        style={[styles.filterModalChip, isActive && styles.filterModalChipActive]}
                      >
                        <Ionicons
                          name={genre.icon as any}
                          size={16}
                          color={isActive ? '#fff' : colors.text.muted}
                        />
                        <Text style={[styles.filterModalChipText, isActive && styles.filterModalChipTextActive]}>
                          {genre.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Rating */}
              <View style={styles.filterModalSection}>
                <View style={styles.filterModalLabelRow}>
                  <Text style={styles.filterModalLabel}>Minimum Rating</Text>
                  <Text style={styles.ratingValue}>
                    {minRating === 0 ? 'Any' : `${minRating.toFixed(1)}+`}
                  </Text>
                </View>

                {/* Rating Source Selector */}
                <View style={styles.ratingSourceRow}>
                  {(['tmdb', 'imdb', 'any'] as const).map((source) => (
                    <Pressable
                      key={source}
                      onPress={() => setRatingSource(source)}
                      style={[styles.ratingSourceChip, ratingSource === source && styles.ratingSourceChipActive]}
                    >
                      <Text style={[styles.ratingSourceText, ratingSource === source && styles.ratingSourceTextActive]}>
                        {source === 'tmdb' ? 'TMDB' : source === 'imdb' ? 'IMDb' : 'Any'}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Rating Slider */}
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>0</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={9}
                    step={0.5}
                    value={minRating}
                    onValueChange={setMinRating}
                    minimumTrackTintColor={JELLYSEERR_PURPLE}
                    maximumTrackTintColor={colors.surface.elevated}
                    thumbTintColor={JELLYSEERR_PURPLE}
                  />
                  <Text style={styles.sliderLabel}>9</Text>
                </View>
              </View>

              {/* Year */}
              <View style={styles.filterModalSection}>
                <Text style={styles.filterModalLabel}>Release Year</Text>
                <View style={styles.yearGrid}>
                  <Pressable
                    onPress={() => setYearFilter(null)}
                    style={[styles.yearGridChip, yearFilter === null && styles.yearGridChipActive]}
                  >
                    <Text style={[styles.yearGridText, yearFilter === null && styles.yearGridTextActive]}>Any</Text>
                  </Pressable>
                  {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((year) => (
                    <Pressable
                      key={year}
                      onPress={() => setYearFilter(year)}
                      style={[styles.yearGridChip, yearFilter === year && styles.yearGridChipActive]}
                    >
                      <Text style={[styles.yearGridText, yearFilter === year && styles.yearGridTextActive]}>{year}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Hide Status */}
              <View style={styles.filterModalSection}>
                <Text style={styles.filterModalLabel}>Hide by Status</Text>
                <View style={styles.statusGrid}>
                  <Pressable
                    onPress={() => setHideAvailable(!hideAvailable)}
                    style={[styles.statusGridChip, hideAvailable && styles.statusGridChipActive]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={hideAvailable ? '#fff' : '#22c55e'} />
                    <Text style={[styles.statusGridText, hideAvailable && styles.statusGridTextActive]}>Available</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setHidePartial(!hidePartial)}
                    style={[styles.statusGridChip, hidePartial && styles.statusGridChipActive]}
                  >
                    <Ionicons name="pie-chart" size={18} color={hidePartial ? '#fff' : '#f59e0b'} />
                    <Text style={[styles.statusGridText, hidePartial && styles.statusGridTextActive]}>Partial</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setHideProcessing(!hideProcessing)}
                    style={[styles.statusGridChip, hideProcessing && styles.statusGridChipActive]}
                  >
                    <Ionicons name="hourglass" size={18} color={hideProcessing ? '#fff' : '#3b82f6'} />
                    <Text style={[styles.statusGridText, hideProcessing && styles.statusGridTextActive]}>Processing</Text>
                  </Pressable>
                </View>
              </View>

              <View style={{ height: 40 }} />
            </ScrollView>

            <Pressable
              onPress={() => setShowFilterModal(false)}
              style={styles.applyFiltersButton}
            >
              <LinearGradient
                colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                style={styles.applyFiltersGradient}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  mediaFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  mediaFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  mediaFilterChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  mediaFilterText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  mediaFilterTextActive: {
    color: '#fff',
  },
  statusFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    flexWrap: 'wrap',
  },
  filterLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  statusFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statusFilterChipActive: {
    backgroundColor: colors.text.tertiary,
    borderColor: colors.text.tertiary,
  },
  statusFilterText: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  statusFilterTextActive: {
    color: '#fff',
  },
  compactFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  filterModalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  filterModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  filterModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${JELLYSEERR_PURPLE}20`,
  },
  clearAllText: {
    color: JELLYSEERR_PURPLE,
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalScroll: {
    paddingHorizontal: 20,
  },
  filterModalSection: {
    marginTop: 20,
  },
  filterModalLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterModalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingValue: {
    color: JELLYSEERR_PURPLE,
    fontSize: 15,
    fontWeight: '700',
  },
  filterModalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterModalChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  filterModalChipText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterModalChipTextActive: {
    color: '#fff',
  },
  ratingSourceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ratingSourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  ratingSourceChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  ratingSourceText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  ratingSourceTextActive: {
    color: '#fff',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearGridChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  yearGridChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  yearGridText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  yearGridTextActive: {
    color: '#fff',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusGridChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statusGridChipActive: {
    backgroundColor: colors.text.tertiary,
    borderColor: colors.text.tertiary,
  },
  statusGridText: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusGridTextActive: {
    color: '#fff',
  },
  applyFiltersButton: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  applyFiltersGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
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
    gap: 10,
  },
  searchGridRow: {
    justifyContent: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  searchGridItem: {
    flex: 1,
    maxWidth: '33%',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  filterPillBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterPillBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterPillBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
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
    borderRadius: 12,
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
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  statCard: {
    minWidth: 78,
  },
  statCardGradient: {
    borderRadius: 14,
    padding: 10,
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
  settingsSection: { marginBottom: 24 },
  settingsSectionTitle: { color: colors.text.tertiary, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12, paddingHorizontal: 16 },
  settingsCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface.default, borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: colors.border.subtle },
  settingsCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingsCardContent: { flex: 1, marginLeft: 12 },
  settingsCardTitle: { color: "#fff", fontSize: 14, fontWeight: "500" },
  settingsCardSubtitle: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  settingsCardValue: { color: "#fff", fontSize: 14, fontWeight: "600" },
  settingsCardAction: { backgroundColor: JELLYSEERR_PURPLE, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginLeft: 8 },
  settingsCardActionText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  jobCard: { backgroundColor: colors.surface.default, borderRadius: 12, marginHorizontal: 16, marginBottom: 8, padding: 14, borderWidth: 1, borderColor: colors.border.subtle },
  jobCardHeader: { flexDirection: "row", alignItems: "center" },
  jobCardIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  jobCardContent: { flex: 1, marginLeft: 12 },
  jobCardTitle: { color: "#fff", fontSize: 14, fontWeight: "500" },
  jobCardSubtitle: { color: colors.text.muted, fontSize: 12, marginTop: 2 },
  jobCardButton: { flexDirection: "row", alignItems: "center", backgroundColor: JELLYSEERR_PURPLE, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  jobCardButtonCancel: { backgroundColor: "#ef4444" },
  jobCardButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  adminContent: { paddingHorizontal: 16, paddingTop: 8 },
  syncProgress: { marginTop: 8, paddingHorizontal: 14 },
  syncProgressBar: { height: 4, backgroundColor: colors.surface.default, borderRadius: 2, overflow: "hidden" },
  syncProgressFill: { height: "100%", backgroundColor: "#22c55e", borderRadius: 2 },
  syncProgressText: { color: colors.text.tertiary, fontSize: 11, marginTop: 6 },
  noJobsText: { color: colors.text.tertiary, fontSize: 14, textAlign: "center", paddingVertical: 20 },
});

