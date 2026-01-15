import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { jellyseerrClient } from '@/api/external/jellyseerr';
import type { JellyseerrRequestBody, JellyseerrCreateUserBody, JellyseerrUpdateUserBody } from '@/types/jellyseerr';
import { useJellyseerrStatus } from './jellyseerr/useJellyseerrStatus';

export { useJellyseerrStatus };

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

export function useSeasonDetails(tmdbId: number | undefined, seasonNumber: number | undefined) {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'tv', tmdbId, 'season', seasonNumber],
    queryFn: () => jellyseerrClient.getSeasonDetails(tmdbId!, seasonNumber!),
    enabled: isReady && !!tmdbId && seasonNumber !== undefined,
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

export function useJellyseerrUsers() {
  const { isReady } = useJellyseerrStatus();

  return useInfiniteQuery({
    queryKey: ['jellyseerr', 'users'],
    queryFn: ({ pageParam = 0 }) =>
      jellyseerrClient.getUsers({ take: 50, skip: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const totalFetched = allPages.reduce((sum, p) => sum + p.results.length, 0);
      return totalFetched < lastPage.pageInfo.results ? totalFetched : undefined;
    },
    enabled: isReady,
    staleTime: 60 * 1000,
  });
}

export function useJellyseerrUserDetails(userId: number | undefined) {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'user', userId],
    queryFn: () => jellyseerrClient.getUser(userId!),
    enabled: isReady && !!userId,
    staleTime: 2 * 60 * 1000,
  });
}

export function useJellyfinUsers() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'jellyfin-users'],
    queryFn: () => jellyseerrClient.getJellyfinUsers(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateJellyseerrUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: JellyseerrCreateUserBody) => jellyseerrClient.createUser(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'users'] });
    },
  });
}

export function useUpdateJellyseerrUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, body }: { userId: number; body: JellyseerrUpdateUserBody }) =>
      jellyseerrClient.updateUser(userId, body),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'user', variables.userId] });
    },
  });
}

export function useDeleteJellyseerrUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => jellyseerrClient.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'users'] });
    },
  });
}

export function useImportJellyfinUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jellyfinUserIds: string[]) => jellyseerrClient.importUsersFromJellyfin(jellyfinUserIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'jellyfin-users'] });
    },
  });
}

export function useJellyseerrServerStatus() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'status'],
    queryFn: () => jellyseerrClient.getServerStatus(),
    enabled: isReady,
    staleTime: 60 * 1000,
  });
}

export function useJellyseerrAbout() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'about'],
    queryFn: () => jellyseerrClient.getAboutInfo(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJellyseerrMainSettings() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'settings', 'main'],
    queryFn: () => jellyseerrClient.getMainSettings(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJellyseerrCacheStats() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'cache'],
    queryFn: () => jellyseerrClient.getCacheStats(),
    enabled: isReady,
    staleTime: 30 * 1000,
  });
}

export function useFlushCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cacheId: string) => jellyseerrClient.flushCache(cacheId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'cache'] });
    },
  });
}

export function useJellyseerrJobs() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'jobs'],
    queryFn: () => jellyseerrClient.getJobs(),
    enabled: isReady,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useRunJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jellyseerrClient.runJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'jobs'] });
    },
  });
}

export function useCancelJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => jellyseerrClient.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'jobs'] });
    },
  });
}

export function useJellyseerrJellyfinSettings() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'settings', 'jellyfin'],
    queryFn: () => jellyseerrClient.getJellyfinSettings(),
    enabled: isReady,
    staleTime: 5 * 60 * 1000,
  });
}

export function useJellyfinSyncStatus() {
  const { isReady } = useJellyseerrStatus();

  return useQuery({
    queryKey: ['jellyseerr', 'jellyfin', 'sync'],
    queryFn: () => jellyseerrClient.getJellyfinSyncStatus(),
    enabled: isReady,
    staleTime: 10 * 1000,
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.running ? 5 * 1000 : 30 * 1000;
    },
  });
}

export function useStartJellyfinSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jellyseerrClient.startJellyfinSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'jellyfin', 'sync'] });
    },
  });
}

export function useCancelJellyfinSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => jellyseerrClient.cancelJellyfinSync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jellyseerr', 'jellyfin', 'sync'] });
    },
  });
}
