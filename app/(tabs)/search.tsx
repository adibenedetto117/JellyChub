import { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore, useSettingsStore } from '@/stores';
import { search } from '@/api';
import type { SearchMediaType } from '@/api';
import {
  SearchInput,
  SearchResults,
  SearchFilters,
  DEFAULT_FILTER_OPTIONS,
  type SearchFilterValue,
} from '@/components/shared/search';
import { useDebounce } from '@/hooks';

export default function SearchScreen() {
  const { t } = useTranslation();
  const { filter: filterParam } = useLocalSearchParams<{ filter?: string }>();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<SearchFilterValue>(() => {
    if (filterParam && DEFAULT_FILTER_OPTIONS.some(f => f.value === filterParam)) {
      return filterParam as SearchFilterValue;
    }
    return 'all';
  });
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const userId = currentUser?.Id ?? '';

  useEffect(() => {
    if (filterParam && DEFAULT_FILTER_OPTIONS.some(f => f.value === filterParam)) {
      setActiveFilter(filterParam as SearchFilterValue);
    }
  }, [filterParam]);

  const handleBack = () => {
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.back();
    }
  };

  const debouncedQuery = useDebounce(query, 300);

  const searchOptions = useMemo(() => ({
    limit: 50,
    includeItemTypes: activeFilter !== 'all' ? [activeFilter as SearchMediaType] : undefined,
  }), [activeFilter]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', userId, debouncedQuery, activeFilter],
    queryFn: () => search(userId, debouncedQuery, searchOptions),
    enabled: !!userId && debouncedQuery.length >= 2,
    staleTime: 1000 * 60 * 5,
  });

  const results = data?.SearchHints ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4">
        <View className="flex-row items-center justify-between mb-4">
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700', flex: 1 }}>
            {t('search.title')}
          </Text>
          <Pressable
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full bg-surface"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={accentColor} />
          </Pressable>
        </View>

        <SearchInput
          value={query}
          onChangeText={setQuery}
          isLoading={(isLoading || isFetching) && debouncedQuery.length >= 2}
          placeholder={t('search.placeholder')}
        />

        <SearchFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </View>

      <SearchResults
        results={results}
        isLoading={isLoading}
        query={debouncedQuery}
        returnPath="/(tabs)/search"
      />
    </SafeAreaView>
  );
}
