import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { queryCacheStorage } from '@/stores/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - balanced caching
      gcTime: 1000 * 60 * 60 * 24, // 24 hour cache
      retry: 0, // No retries - fail fast
      refetchOnWindowFocus: false,
      refetchOnMount: true, // Refetch stale data on mount
      refetchOnReconnect: true, // Sync when network reconnects
    },
    mutations: {
      retry: 0,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: queryCacheStorage,
  key: 'JELLYCHUB_QUERY_CACHE',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 1000 * 60 * 60 * 24 * 7, // Cache persists for 7 days
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      // Only persist successful queries - never persist pending/error states
      if (query.state.status !== 'success') return false;

      // Only persist certain queries - artists, libraries, items metadata
      const queryKey = query.queryKey;
      if (!Array.isArray(queryKey)) return false;
      const key = queryKey[0];
      const persistableKeys = [
        'artists',
        'libraries',
        'item',
        'albums',
        'latestMusic',
        'favoriteMusic',
        'genres',
        'artistAlbums',
        'tracks',
        'similar',
        'musicArtists',
        'musicAlbums',
        'recentMusic',
        'playlists',
        'playlistTracks',
        // Home screen data
        'resume',
        'nextUp',
        'latestMedia',
        'suggestions',
        'favorites',
        // Library screen data
        'libraryPreview',
        'libraryDetail',
        // Movies/Shows screen data
        'moviesData',
        'showsData',
        'booksData',
        // Person/Cast data - cached forever
        'person',
        'person-items',
      ];
      return persistableKeys.includes(key as string);
    },
  },
});

interface Props {
  children: ReactNode;
}

export function QueryProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export { queryClient };
