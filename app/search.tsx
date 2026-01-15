import { useState, useMemo } from 'react';
import { View, Keyboard } from 'react-native';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import { search } from '@/api';
import { SearchInput, SearchResults } from '@/components/shared/search';
import { useDebounce } from '@/hooks';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const user = useAuthStore((s) => s.currentUser);
  const userId = user?.Id ?? '';

  const handleBack = () => {
    Keyboard.dismiss();
    if (router.canDismiss()) {
      router.dismiss();
    } else {
      router.back();
    }
  };

  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['search', userId, debouncedQuery],
    queryFn: () => search(userId, debouncedQuery, { limit: 50 }),
    enabled: !!userId && debouncedQuery.length >= 2,
  });

  const results = useMemo(() => {
    const items = data?.SearchHints ?? [];
    return [...items].sort((a, b) => {
      const q = query.toLowerCase().replace(/[^a-z0-9]/g, '');
      const aName = (a.Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const bName = (b.Name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const aScore = aName === q ? 100 : aName.startsWith(q) ? 50 : 0;
      const bScore = bName === q ? 100 : bName.startsWith(q) ? 50 : 0;
      return bScore - aScore;
    });
  }, [data?.SearchHints, query]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0a0a0a' }} edges={['top']}>
      <View style={{ alignItems: 'center', paddingTop: 8, paddingBottom: 10 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#333' }} />
      </View>

      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <SearchInput
          value={query}
          onChangeText={setQuery}
          isLoading={isLoading}
          autoFocus
          showBackButton
          onBackPress={handleBack}
          containerStyle="modal"
          placeholder="Search..."
        />
      </View>

      <SearchResults
        results={results}
        isLoading={isLoading}
        query={debouncedQuery}
        showResultsCount={false}
        startTypingText="Type to search your library"
        emptyStateText={`No results for "${query}"`}
        returnPath="/search"
        style="modal"
      />
    </SafeAreaView>
  );
}
