import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
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

export function useLibraries() {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['libraries', userId],
    queryFn: () => getLibraries(userId!),
    enabled: !!userId,
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
  });
}

export function useItem<T extends BaseItem = BaseItem>(itemId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem<T>(userId!, itemId),
    enabled: !!userId && !!itemId,
  });
}

export function useResumeItems(limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['resume', userId, limit],
    queryFn: () => getResumeItems(userId!, limit),
    enabled: !!userId,
  });
}

export function useLatestMedia(parentId?: string, limit = 16) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['latest', userId, parentId, limit],
    queryFn: () => getLatestMedia(userId!, parentId, limit),
    enabled: !!userId,
  });
}

export function useNextUp(seriesId?: string, limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['nextUp', userId, seriesId, limit],
    queryFn: () => getNextUp(userId!, seriesId, limit),
    enabled: !!userId,
  });
}

export function useSimilarItems(itemId: string, limit = 12) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['similar', itemId, userId, limit],
    queryFn: () => getSimilarItems(itemId, userId!, limit),
    enabled: !!userId && !!itemId,
  });
}

export function useSeasons(seriesId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['seasons', seriesId, userId],
    queryFn: () => getSeasons(seriesId, userId!),
    enabled: !!userId && !!seriesId,
  });
}

export function useEpisodes(seriesId: string, seasonId?: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['episodes', seriesId, seasonId, userId],
    queryFn: () => getEpisodes(seriesId, userId!, seasonId),
    enabled: !!userId && !!seriesId,
  });
}

export function useAlbumTracks(albumId: string) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['tracks', albumId, userId],
    queryFn: () => getAlbumTracks(albumId, userId!),
    enabled: !!userId && !!albumId,
  });
}

export function useSearch(searchTerm: string, limit = 20) {
  const userId = useAuthStore((state) => state.currentUser?.Id);

  return useQuery({
    queryKey: ['search', userId, searchTerm, limit],
    queryFn: () => search(userId!, searchTerm, limit),
    enabled: !!userId && searchTerm.length >= 2,
  });
}

export function useFavoriteMutation() {
  const userId = useAuthStore((state) => state.currentUser?.Id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isFavorite }: { itemId: string; isFavorite: boolean }) =>
      markAsFavorite(userId!, itemId, isFavorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
}

export function usePlayedMutation() {
  const userId = useAuthStore((state) => state.currentUser?.Id);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, played }: { itemId: string; played: boolean }) =>
      markAsPlayed(userId!, itemId, played),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['item'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['resume'] });
    },
  });
}
