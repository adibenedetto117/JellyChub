import { View, Text, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useSettingsStore } from '@/stores';
import { useResponsive } from '@/hooks';
import { getLibraries } from '@/api';
import { AnimatedGradient, SearchButton, SkeletonRow } from '@/components/shared/ui';
import {
  LibraryContentRow,
  LibraryEmptyState,
  LibraryFilterChips,
  DEFAULT_LIBRARY_FILTERS,
} from '@/components/shared/library';
import type { CollectionType } from '@/types/jellyfin';

export default function LibraryScreen() {
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const { isTablet, isTV, fontSize } = useResponsive();

  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const userId = currentUser?.Id ?? '';

  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;

  const { data: libraries, refetch: refetchLibraries, isLoading: isLoadingLibraries } = useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId),
    enabled: !!userId,
    staleTime: Infinity,
  });

  const browsableLibraries = useMemo(() => {
    if (!libraries) return [];
    return libraries.filter((lib) => {
      const excludeTypes = ['playlists'];
      if (lib.CollectionType && excludeTypes.includes(lib.CollectionType)) {
        return false;
      }
      if (activeFilter !== 'all' && lib.CollectionType !== activeFilter) {
        return false;
      }
      return true;
    });
  }, [libraries, activeFilter]);

  const availableFilters = useMemo(() => {
    if (!libraries) return [DEFAULT_LIBRARY_FILTERS[0]];
    const types = new Set(libraries.map(lib => lib.CollectionType).filter(Boolean));
    return DEFAULT_LIBRARY_FILTERS.filter(opt => opt.key === 'all' || types.has(opt.key as CollectionType));
  }, [libraries]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchLibraries();
    setRefreshing(false);
  }, [refetchLibraries]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <AnimatedGradient intensity="subtle" />

      <View style={[styles.header, { paddingHorizontal: horizontalPadding, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <Animated.View entering={FadeIn.duration(400)}>
          <Text style={[styles.headerTitle, { fontSize: fontSize['3xl'] }]}>{t('nav.library')}</Text>
          <Text style={[styles.headerSubtitle, { fontSize: fontSize.sm }]}>
            {browsableLibraries.length} {browsableLibraries.length === 1 ? 'collection' : 'collections'}
          </Text>
        </Animated.View>
        <SearchButton />
      </View>

      <LibraryFilterChips
        filters={availableFilters}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        accentColor={accentColor}
        horizontalPadding={horizontalPadding}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {isLoadingLibraries && (
          <View style={{ paddingTop: 16 }}>
            <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
            <SkeletonRow cardWidth={100} cardHeight={150} count={4} />
          </View>
        )}

        {browsableLibraries.map((library) => (
          <LibraryContentRow
            key={library.Id}
            library={library}
            userId={userId}
            accentColor={accentColor}
            hideMedia={hideMedia}
          />
        ))}

        {userId && !isLoadingLibraries && browsableLibraries.length === 0 && (
          <LibraryEmptyState
            title="No libraries found"
            subtitle={
              activeFilter !== 'all'
                ? 'Try a different filter or add libraries in Jellyfin'
                : 'Add libraries in your Jellyfin server'
            }
            icon="library-outline"
            accentColor={accentColor}
            fontSize={fontSize}
            actionLabel={activeFilter !== 'all' ? 'Show all libraries' : undefined}
            onAction={activeFilter !== 'all' ? () => setActiveFilter('all') : undefined}
          />
        )}

        <View style={{ height: isTablet ? 100 : 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
});
