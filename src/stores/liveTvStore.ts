import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';

export type ChannelSortOption = 'number' | 'name' | 'recent';
export type ChannelFilterOption = 'all' | 'favorites' | 'tv' | 'radio';
export type EPGViewMode = 'grid' | 'list';

interface LiveTvState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  favoriteChannelIds: string[];
  recentChannelIds: string[];
  channelSort: ChannelSortOption;
  channelFilter: ChannelFilterOption;
  epgViewMode: EPGViewMode;
  lastWatchedChannelId: string | null;
  channelGroups: Record<string, string[]>;

  addFavoriteChannel: (channelId: string) => void;
  removeFavoriteChannel: (channelId: string) => void;
  toggleFavoriteChannel: (channelId: string) => void;
  isFavoriteChannel: (channelId: string) => boolean;

  addRecentChannel: (channelId: string) => void;
  clearRecentChannels: () => void;

  setChannelSort: (sort: ChannelSortOption) => void;
  setChannelFilter: (filter: ChannelFilterOption) => void;
  setEpgViewMode: (mode: EPGViewMode) => void;
  setLastWatchedChannelId: (channelId: string | null) => void;

  addChannelToGroup: (groupName: string, channelId: string) => void;
  removeChannelFromGroup: (groupName: string, channelId: string) => void;
  createGroup: (groupName: string) => void;
  deleteGroup: (groupName: string) => void;
  renameGroup: (oldName: string, newName: string) => void;
  getChannelsInGroup: (groupName: string) => string[];
  getGroupNames: () => string[];
}

const MAX_RECENT_CHANNELS = 20;

export const useLiveTvStore = create<LiveTvState>()(
  persist(
    (set, get) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      favoriteChannelIds: [],
      recentChannelIds: [],
      channelSort: 'number',
      channelFilter: 'all',
      epgViewMode: 'grid',
      lastWatchedChannelId: null,
      channelGroups: {},

      addFavoriteChannel: (channelId) =>
        set((state) => ({
          favoriteChannelIds: state.favoriteChannelIds.includes(channelId)
            ? state.favoriteChannelIds
            : [...state.favoriteChannelIds, channelId],
        })),

      removeFavoriteChannel: (channelId) =>
        set((state) => ({
          favoriteChannelIds: state.favoriteChannelIds.filter((id) => id !== channelId),
        })),

      toggleFavoriteChannel: (channelId) => {
        const { favoriteChannelIds } = get();
        if (favoriteChannelIds.includes(channelId)) {
          set({ favoriteChannelIds: favoriteChannelIds.filter((id) => id !== channelId) });
        } else {
          set({ favoriteChannelIds: [...favoriteChannelIds, channelId] });
        }
      },

      isFavoriteChannel: (channelId) => get().favoriteChannelIds.includes(channelId),

      addRecentChannel: (channelId) =>
        set((state) => {
          const filtered = state.recentChannelIds.filter((id) => id !== channelId);
          const updated = [channelId, ...filtered].slice(0, MAX_RECENT_CHANNELS);
          return { recentChannelIds: updated, lastWatchedChannelId: channelId };
        }),

      clearRecentChannels: () => set({ recentChannelIds: [] }),

      setChannelSort: (sort) => set({ channelSort: sort }),
      setChannelFilter: (filter) => set({ channelFilter: filter }),
      setEpgViewMode: (mode) => set({ epgViewMode: mode }),
      setLastWatchedChannelId: (channelId) => set({ lastWatchedChannelId: channelId }),

      addChannelToGroup: (groupName, channelId) =>
        set((state) => {
          const group = state.channelGroups[groupName] ?? [];
          if (group.includes(channelId)) return state;
          return {
            channelGroups: {
              ...state.channelGroups,
              [groupName]: [...group, channelId],
            },
          };
        }),

      removeChannelFromGroup: (groupName, channelId) =>
        set((state) => {
          const group = state.channelGroups[groupName];
          if (!group) return state;
          return {
            channelGroups: {
              ...state.channelGroups,
              [groupName]: group.filter((id) => id !== channelId),
            },
          };
        }),

      createGroup: (groupName) =>
        set((state) => {
          if (state.channelGroups[groupName]) return state;
          return {
            channelGroups: {
              ...state.channelGroups,
              [groupName]: [],
            },
          };
        }),

      deleteGroup: (groupName) =>
        set((state) => {
          const { [groupName]: _, ...rest } = state.channelGroups;
          return { channelGroups: rest };
        }),

      renameGroup: (oldName, newName) =>
        set((state) => {
          const group = state.channelGroups[oldName];
          if (!group || state.channelGroups[newName]) return state;
          const { [oldName]: _, ...rest } = state.channelGroups;
          return {
            channelGroups: {
              ...rest,
              [newName]: group,
            },
          };
        }),

      getChannelsInGroup: (groupName) => get().channelGroups[groupName] ?? [],

      getGroupNames: () => Object.keys(get().channelGroups),
    }),
    {
      name: 'livetv-storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        favoriteChannelIds: state.favoriteChannelIds,
        recentChannelIds: state.recentChannelIds,
        channelSort: state.channelSort,
        channelFilter: state.channelFilter,
        epgViewMode: state.epgViewMode,
        lastWatchedChannelId: state.lastWatchedChannelId,
        channelGroups: state.channelGroups,
      }),
    }
  )
);

export const selectFavoriteChannelIds = (state: LiveTvState) => state.favoriteChannelIds;
export const selectRecentChannelIds = (state: LiveTvState) => state.recentChannelIds;
export const selectChannelSort = (state: LiveTvState) => state.channelSort;
export const selectChannelFilter = (state: LiveTvState) => state.channelFilter;
export const selectEpgViewMode = (state: LiveTvState) => state.epgViewMode;
export const selectLastWatchedChannelId = (state: LiveTvState) => state.lastWatchedChannelId;
export const selectChannelGroups = (state: LiveTvState) => state.channelGroups;
