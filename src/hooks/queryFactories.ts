import { useQuery, useInfiniteQuery, UseQueryOptions, UseInfiniteQueryOptions } from '@tanstack/react-query';
import { useJellyseerrStatus } from './useJellyseerr';

/**
 * Query Factory Utilities
 * Creates hooks with consistent patterns for Jellyseerr (and potentially other) APIs
 */

type JellyseerrQueryKey = ['jellyseerr', ...string[]];

interface PaginatedResponse<T> {
  page: number;
  totalPages: number;
  results: T[];
}

/**
 * Create a simple Jellyseerr query hook
 */
export function createJellyseerrQuery<TData>(
  queryKey: JellyseerrQueryKey,
  queryFn: () => Promise<TData>,
  options?: {
    staleTime?: number;
    retry?: number;
    enabled?: (isReady: boolean) => boolean;
  }
) {
  return function useGeneratedQuery() {
    const { isReady } = useJellyseerrStatus();
    const { staleTime = 10 * 60 * 1000, retry, enabled } = options ?? {};

    return useQuery({
      queryKey,
      queryFn,
      enabled: enabled ? enabled(isReady) : isReady,
      staleTime,
      ...(retry !== undefined && { retry }),
    });
  };
}

/**
 * Create a Jellyseerr query hook with a parameter
 */
export function createJellyseerrQueryWithParam<TData, TParam>(
  getQueryKey: (param: TParam) => JellyseerrQueryKey,
  queryFn: (param: TParam) => Promise<TData>,
  options?: {
    staleTime?: number;
    retry?: number;
    isParamValid?: (param: TParam) => boolean;
  }
) {
  return function useGeneratedQuery(param: TParam) {
    const { isReady } = useJellyseerrStatus();
    const { staleTime = 10 * 60 * 1000, retry, isParamValid } = options ?? {};

    const paramValid = isParamValid ? isParamValid(param) : param !== undefined && param !== null;

    return useQuery({
      queryKey: getQueryKey(param),
      queryFn: () => queryFn(param),
      enabled: isReady && paramValid,
      staleTime,
      ...(retry !== undefined && { retry }),
    });
  };
}

/**
 * Create an infinite query hook for paginated Jellyseerr endpoints
 */
export function createJellyseerrInfiniteQuery<TData extends PaginatedResponse<any>>(
  queryKey: JellyseerrQueryKey,
  queryFn: (page: number) => Promise<TData>,
  options?: {
    staleTime?: number;
    enabled?: (isReady: boolean) => boolean;
  }
) {
  return function useGeneratedInfiniteQuery() {
    const { isReady } = useJellyseerrStatus();
    const { staleTime = 10 * 60 * 1000, enabled } = options ?? {};

    return useInfiniteQuery({
      queryKey,
      queryFn: ({ pageParam = 1 }) => queryFn(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      enabled: enabled ? enabled(isReady) : isReady,
      staleTime,
    });
  };
}

/**
 * Create an infinite query hook with a parameter
 */
export function createJellyseerrInfiniteQueryWithParam<TData extends PaginatedResponse<any>, TParam>(
  getQueryKey: (param: TParam) => JellyseerrQueryKey,
  queryFn: (param: TParam, page: number) => Promise<TData>,
  options?: {
    staleTime?: number;
    isParamValid?: (param: TParam) => boolean;
  }
) {
  return function useGeneratedInfiniteQuery(param: TParam) {
    const { isReady } = useJellyseerrStatus();
    const { staleTime = 10 * 60 * 1000, isParamValid } = options ?? {};

    const paramValid = isParamValid ? isParamValid(param) : param !== undefined && param !== null;

    return useInfiniteQuery({
      queryKey: getQueryKey(param),
      queryFn: ({ pageParam = 1 }) => queryFn(param, pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) =>
        lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined,
      enabled: isReady && paramValid,
      staleTime,
    });
  };
}

// Export query key factories for consistent key generation
export const jellyseerrKeys = {
  all: ['jellyseerr'] as const,
  discover: () => [...jellyseerrKeys.all, 'discover'] as const,
  discoverMovies: () => [...jellyseerrKeys.discover(), 'movies'] as const,
  discoverTv: () => [...jellyseerrKeys.discover(), 'tv'] as const,
  trending: () => [...jellyseerrKeys.all, 'trending'] as const,
  popular: (type: 'movies' | 'tv') => [...jellyseerrKeys.all, 'popular', type] as const,
  upcoming: () => [...jellyseerrKeys.all, 'upcoming', 'movies'] as const,
  search: (query: string) => [...jellyseerrKeys.all, 'search', query] as const,
  movie: (id: number) => [...jellyseerrKeys.all, 'movie', id] as const,
  tv: (id: number) => [...jellyseerrKeys.all, 'tv', id] as const,
  genres: (type: 'movie' | 'tv') => [...jellyseerrKeys.all, 'genres', type] as const,
  genreDiscover: (type: 'movie' | 'tv', genreId: number) =>
    [...jellyseerrKeys.all, 'genre', type, genreId] as const,
  requests: {
    all: () => [...jellyseerrKeys.all, 'requests'] as const,
    my: (userId?: number) => [...jellyseerrKeys.all, 'requests', 'my', userId] as const,
    pending: () => [...jellyseerrKeys.all, 'requests', 'pending'] as const,
    filtered: (filter?: string) => [...jellyseerrKeys.all, 'requests', 'all', filter] as const,
  },
  user: () => [...jellyseerrKeys.all, 'user'] as const,
};
