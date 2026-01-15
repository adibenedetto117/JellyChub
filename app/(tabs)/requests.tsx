import { View, Text, ScrollView, RefreshControl, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
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
import { RequestCard, SearchResultsGrid } from '@/components/shared/jellyseerr';
import {
  JELLYSEERR_PURPLE,
  EmptyState,
  MediaRow,
  SettingsSection,
  SettingsCard,
  JobCard,
  FilterModal,
  RequestTabs,
  RequestHeader,
  SearchBar,
  MediaTypeFilter,
  FilterButton,
  RequestFilters,
  NotConnectedView,
  HeaderGradient,
  SyncProgress,
} from '@/components/shared/requests';
import type { TabItem, RequestFilterType } from '@/components/shared/requests';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem, JellyseerrMediaRequest } from '@/types/jellyseerr';
import { hasPermission, JELLYSEERR_PERMISSIONS, REQUEST_STATUS, MEDIA_STATUS } from '@/types/jellyseerr';

function getItemStatus(item: JellyseerrDiscoverItem): number | undefined {
  return item?.mediaInfo?.status;
}

type TabType = 'discover' | 'requests' | 'admin';

export default function RequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [requestFilter, setRequestFilter] = useState<RequestFilterType>('all');
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

  const tabs: TabItem[] = useMemo(() => [
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
      if (mediaFilter !== 'all' && item.mediaType !== mediaFilter) {
        return false;
      }

      const status = getItemStatus(item);

      if (hideAvailable && status === MEDIA_STATUS.AVAILABLE) {
        return false;
      }
      if (hideProcessing && status === MEDIA_STATUS.PROCESSING) {
        return false;
      }
      if (hidePartial && status === MEDIA_STATUS.PARTIALLY_AVAILABLE) {
        return false;
      }

      if (genreFilter.length > 0) {
        const itemGenres = item.genreIds || [];
        const hasMatchingGenre = genreFilter.some((gId) => itemGenres.includes(gId));
        if (!hasMatchingGenre) {
          return false;
        }
      }

      if (minRating > 0 && (item.voteAverage || 0) < minRating) {
        return false;
      }

      if (yearFilter) {
        const releaseDate = item.releaseDate || item.firstAirDate;
        if (releaseDate) {
          const itemYear = new Date(releaseDate).getFullYear();
          if (itemYear !== yearFilter) {
            return false;
          }
        } else {
          return false;
        }
      }

      return true;
    });
  }, [hideAvailable, hideProcessing, hidePartial, mediaFilter, genreFilter, minRating, yearFilter]);

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

  const userName = user?.displayName || user?.username || 'User';

  if (!hasJellyseerr) {
    return <NotConnectedView onConnect={() => router.push('/settings/jellyseerr')} />;
  }

  const filteredSearchResults = filterItems(searchResults?.results ?? []);

  const renderDiscoverContent = () => (
    <ScrollView
      style={styles.flexOne}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.searchContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search movies and TV shows..."
        />

        <View style={styles.compactFilterBar}>
          <MediaTypeFilter value={mediaFilter} onChange={setMediaFilter} />
          <FilterButton onPress={() => setShowFilterModal(true)} activeCount={activeFilterCount} />
        </View>
      </Animated.View>

      {searchQuery.length >= 2 ? (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          <SearchResultsGrid
            items={filteredSearchResults}
            onItemPress={handleItemPress}
            isLoading={isSearching}
            emptyComponent={
              <EmptyState
                icon="search-outline"
                title="No Results"
                subtitle={
                  hasActiveFilters
                    ? `No results found for "${searchQuery}" with current filters`
                    : `No movies or shows found for "${searchQuery}"`
                }
              />
            }
          />
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

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  const renderRequestsContent = () => (
    <View style={styles.flexOne}>
      <RequestFilters
        filter={requestFilter}
        onFilterChange={setRequestFilter}
        pendingCount={stats.pending}
      />

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
      style={styles.flexOne}
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
          <SyncProgress
            progress={syncStatus.progress}
            total={syncStatus.total}
            currentLibraryName={syncStatus.currentLibrary.name}
          />
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

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderGradient />
      <RequestHeader userName={user ? userName : undefined} />
      <RequestTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
      />

      {activeTab === 'discover' && renderDiscoverContent()}
      {activeTab === 'requests' && renderRequestsContent()}
      {activeTab === 'admin' && renderAdminContent()}

      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        hideAvailable={hideAvailable}
        setHideAvailable={setHideAvailable}
        hideProcessing={hideProcessing}
        setHideProcessing={setHideProcessing}
        hidePartial={hidePartial}
        setHidePartial={setHidePartial}
        genreFilter={genreFilter}
        toggleGenre={toggleGenre}
        minRating={minRating}
        setMinRating={setMinRating}
        ratingSource={ratingSource}
        setRatingSource={setRatingSource}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        clearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  flexOne: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  compactFilterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  searchResultsContainer: {
    paddingHorizontal: 16,
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
  adminContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  noJobsText: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});
