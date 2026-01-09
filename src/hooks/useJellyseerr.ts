import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useSettingsStore, selectHasJellyseerr } from '@/stores/settingsStore';
import { jellyseerrClient } from '@/api/jellyseerr';
import type { JellyseerrRequestBody } from '@/types/jellyseerr';

// Auto-initialize client from stored credentials
function useJellyseerrInit() {
  const jellyseerrUrl = useSettingsStore((s) => s.jellyseerrUrl);
  const jellyseerrAuthToken = useSettingsStore((s) => s.jellyseerrAuthToken);
  const jellyseerrSessionCookie = useSettingsStore((s) => s.jellyseerrSessionCookie);
  const clearJellyseerrCredentials = useSettingsStore((s) => s.clearJellyseerrCredentials);

  // Use ref to avoid re-running effect when function reference changes
  const clearCredentialsRef = useRef(clearJellyseerrCredentials);
  clearCredentialsRef.current = clearJellyseerrCredentials;

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken && !jellyseerrClient.isInitialized()) {
      const isJellyfinAuth = jellyseerrAuthToken === 'jellyfin-auth';
      const isLocalAuth = jellyseerrAuthToken === 'local-auth';

      if (isJellyfinAuth && jellyseerrSessionCookie) {
        // For Jellyfin auth with stored session cookie, use the session
        console.log('[useJellyseerr] Initializing with session cookie');
        jellyseerrClient.initializeWithSession(jellyseerrUrl, jellyseerrSessionCookie);
      } else if (isJellyfinAuth || isLocalAuth) {
        // For Jellyfin/local auth without session cookie, the session may have expired
        // Initialize without auth - API calls may fail with 401
        console.log('[useJellyseerr] Initializing without auth (session may have expired)');
        jellyseerrClient.initialize(jellyseerrUrl);
      } else {
        // API key auth - use the token directly
        console.log('[useJellyseerr] Initializing with API key');
        jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
      }
    }
  }, [jellyseerrUrl, jellyseerrAuthToken, jellyseerrSessionCookie]);
}

// Hook to check if Jellyseerr is ready to use
export function useJellyseerrStatus() {
  const isConfigured = useSettingsStore(selectHasJellyseerr);
  useJellyseerrInit();

  return {
    isConfigured,
    isReady: isConfigured && jellyseerrClient.isInitialized(),
  };
}

export function useJellyseerrUser() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'user'],
    queryFn: () => jellyseerrClient.getCurrentUser(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useDiscoverMovies() {
  const { isReady } = useJellyseerrStatus();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'discover', 'movies'],
    queryFn: ({ pageParam = 1 }) => jellyseerrClient.getDiscoverMovies(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function useDiscoverTv() {
  const { isReady } = useJellyseerrStatus();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'discover', 'tv'],
    queryFn: ({ pageParam = 1 }) => jellyseerrClient.getDiscoverTv(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function useTrending() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'trending'],
    queryFn: () => jellyseerrClient.getTrending(),
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePopularMovies() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'popular', 'movies'],
    queryFn: () => jellyseerrClient.getPopularMovies(),
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePopularTv() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'popular', 'tv'],
    queryFn: () => jellyseerrClient.getPopularTv(),
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function useUpcomingMovies() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'upcoming', 'movies'],
    queryFn: () => jellyseerrClient.getUpcomingMovies(),
    enabled: isReady,
    staleTime: 10 * 60 * 1000,
  });
}

export function useJellyseerrSearch(query: string) {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'search', query],
    queryFn: () => jellyseerrClient.search(query),
    enabled: isReady && query.length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMovieDetails(tmdbId: number | undefined) {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'movie', tmdbId],
    queryFn: () => jellyseerrClient.getMovieDetails(tmdbId!),
    enabled: isReady && !!tmdbId,
    staleTime: 15 * 60 * 1000,
  });
}

export function useTvDetails(tmdbId: number | undefined) {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'tv', tmdbId],
    queryFn: () => jellyseerrClient.getTvDetails(tmdbId!),
    enabled: isReady && !!tmdbId,
    staleTime: 15 * 60 * 1000,
  });
}

export function useMyRequests() {
  const { isReady } = useJellyseerrStatus();
  const { data: user } = useJellyseerrUser();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'requests', 'my', user?.id],
    queryFn: ({ pageParam = 0 }) =>
      jellyseerrClient.getRequests({ requestedBy: user?.id, take: 20, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return totalFetched < lastPage.pageInfo.results ? totalFetched : undefined;
    },
    enabled: isReady && !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

export function useAllRequests(filter?: 'all' | 'approved' | 'pending' | 'available') {
  const { isReady } = useJellyseerrStatus();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'requests', 'all', filter],
    queryFn: ({ pageParam = 0 }) =>
      jellyseerrClient.getRequests({ filter, take: 20, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return totalFetched < lastPage.pageInfo.results ? totalFetched : undefined;
    },
    enabled: isReady,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePendingRequests() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'requests', 'pending'],
    queryFn: () => jellyseerrClient.getRequests({ filter: 'pending', take: 50 }),
    enabled: isReady,
    staleTime: 60 * 1000, // Refresh more often for pending
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: JellyseerrRequestBody) => jellyseerrClient.createRequest(body),
    onSuccess: (_, body) => {
      // Only invalidate requests - the specific movie/tv detail will be refetched when viewed
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'requests'] });
      // Invalidate the specific media item that was requested
      if (body.mediaType === 'movie') {
        queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'movie', body.mediaId] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'tv', body.mediaId] });
      }
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => jellyseerrClient.approveRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'requests'] });
    },
  });
}

export function useDeclineRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => jellyseerrClient.declineRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'requests'] });
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (requestId: number) => jellyseerrClient.deleteRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'requests'] });
    },
  });
}

// Genre discovery
export function useMovieGenres() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'genres', 'movie'],
    queryFn: () => jellyseerrClient.getMovieGenres(),
    enabled: isReady,
    staleTime: 60 * 60 * 1000, // Genres don't change often
  });
}

export function useTvGenres() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'genres', 'tv'],
    queryFn: () => jellyseerrClient.getTvGenres(),
    enabled: isReady,
    staleTime: 60 * 60 * 1000,
  });
}

export function useDiscoverByGenre(mediaType: 'movie' | 'tv', genreId: number | undefined) {
  const { isReady } = useJellyseerrStatus();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'genre', mediaType, genreId],
    queryFn: ({ pageParam = 1 }) => jellyseerrClient.discoverByGenre(mediaType, genreId!, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
    enabled: isReady && !!genreId,
    staleTime: 10 * 60 * 1000,
  });
}
