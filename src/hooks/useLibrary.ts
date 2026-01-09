import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useDebounce } from './useDebounce';
import {
  getLibraries,
  getItems,
  getItem,
  getResumeItems,
  getLatestMedia,
  getNextUp,
  getSimilarItems,
  getSeasons,
  getEpisodes,
  getAlbumTracks,
  search,
  markAsFavorite,
  markAsPlayed,
} from '@/api';
import type { BaseItem } from '@/types/jellyfin';
import type { LibraryQueryParams } from '@/api/library';

// Default stale times for different query types
const STALE_TIMES = {
  libraries: Infinity, // Libraries rarely change
  items: 1000 * 60 * 5, // 5 minutes for item lists
  item: 1000 * 60 * 10, // 10 minutes for individual items
  resume: 1000 * 30, // 30 seconds for continue watching
  latest: 1000 * 60 * 5, // 5 minutes for latest media
  nextUp: 1000 * 30, // 30 seconds for next up
  similar: 1000 * 60 * 30, // 30 minutes for similar items
  seasons: 1000 * 60 * 60, // 1 hour for seasons (rarely change)
  episodes: 1000 * 60 * 30, // 30 minutes for episodes
  tracks: 1000 * 60 * 60, // 1 hour for album tracks
  search: 1000 * 60 * 2, // 2 minutes for search results
};

export function useLibraries() {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId!),
    enabled: !!userId,
    staleTime: STALE_TIMES.libraries,
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
}

export function useItems<T extends BaseItem = BaseItem>(params: LibraryQueryParams) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useInfiniteQuery({
    queryKey: ['items', userId, params],
    queryFn: ({ pageParam = 0 }) =>
      getItems<T>(userId!, { ...params, startIndex: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const totalFetched = pages.reduce((acc, p) => acc + p.Items.length, 0);
      return totalFetched < lastPage.TotalRecordCount ? totalFetched : undefined;
    },
    enabled: !!userId,
    staleTime: STALE_TIMES.items,
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

export function useItem<T extends BaseItem = BaseItem>(itemId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem<T>(userId!, itemId),
    enabled: !!userId && !!itemId,
    staleTime: STALE_TIMES.item,
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

export function useResumeItems(limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['resume', userId, limit],
    queryFn: () => getResumeItems(userId!, limit),
    enabled: !!userId,
    staleTime: STALE_TIMES.resume,
  });
}

export function useLatestMedia(parentId?: string, limit = 16) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['latest', userId, parentId, limit],
    queryFn: () => getLatestMedia(userId!, parentId, limit),
    enabled: !!userId,
    staleTime: STALE_TIMES.latest,
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

export function useNextUp(seriesId?: string, limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['nextUp', userId, seriesId, limit],
    queryFn: () => getNextUp(userId!, seriesId, limit),
    enabled: !!userId,
    staleTime: STALE_TIMES.nextUp,
  });
}

export function useSimilarItems(itemId: string, limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['similar', itemId, userId, limit],
    queryFn: () => getSimilarItems(itemId, userId!, limit),
    enabled: !!userId && !!itemId,
    staleTime: STALE_TIMES.similar,
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
}

export function useSeasons(seriesId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['seasons', seriesId, userId],
    queryFn: () => getSeasons(seriesId, userId!),
    enabled: !!userId && !!seriesId,
    staleTime: STALE_TIMES.seasons,
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
}

export function useEpisodes(seriesId: string, seasonId?: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['episodes', seriesId, seasonId, userId],
    queryFn: () => getEpisodes(seriesId, userId!, seasonId),
    enabled: !!userId && !!seriesId,
    staleTime: STALE_TIMES.episodes,
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
  });
}

export function useAlbumTracks(albumId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['tracks', albumId, userId],
    queryFn: () => getAlbumTracks(albumId, userId!),
    enabled: !!userId && !!albumId,
    staleTime: STALE_TIMES.tracks,
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
  });
}

export function useSearch(searchTerm: string, limit = 20) {
  const userId = useAuthStore((state) => state.currentUser?.Id);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  return useQuery({
    queryKey: ['search', userId, debouncedSearchTerm, limit],
    queryFn: () => search(userId!, debouncedSearchTerm, { limit }),
    enabled: !!userId && debouncedSearchTerm.length >= 2,
    staleTime: STALE_TIMES.search,
  });
}

export function useFavoriteMutation() {
  const userId = useAuthStore((state) => state.currentUser?.Id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) =>
      markAsFavorite(userId!, itemId, isFavorite),
    onSuccess: (_, { itemId }) => {
      // Invalidate only the specific item query - UI will update via optimistic updates or refetch
      queryClient.invalidateQueries({ queryKey: ['item', userId, itemId] });
      // Invalidate favorite songs list (needed for favorites view)
      queryClient.invalidateQueries({ queryKey: ['favoriteSongs'] });
      // Note: We don't invalidate all tracks/playlistTracks anymore as it causes excessive refetching
      // The favorite status change will be reflected when the user navigates back to those views
    },
  });
}

export function usePlayedMutation() {
  const userId = useAuthStore((state) => state.currentUser?.Id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, played, seriesId }: { itemId: string; played: boolean; seriesId?: string }) =>
      markAsPlayed(userId!, itemId, played),
    onSuccess: (_, { itemId, seriesId }) => {
      // Invalidate the specific item query
      queryClient.invalidateQueries({ queryKey: ['item', userId, itemId] });
      // Invalidate resume items (played status affects continue watching)
      queryClient.invalidateQueries({ queryKey: ['resume', userId] });
      // Invalidate next up (played status affects next episode suggestions)
      queryClient.invalidateQueries({ queryKey: ['nextUp', userId] });
      // Only invalidate episodes for the specific series if provided
      if (seriesId) {
        queryClient.invalidateQueries({ queryKey: ['episodes', seriesId] });
      }
    },
  });
}
