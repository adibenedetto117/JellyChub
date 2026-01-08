import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';

export interface VideoPreferences {
  subtitleOffset: number; // in milliseconds
  lastUpdated: number;
}

interface VideoPreferencesState {
  preferences: Record<string, VideoPreferences>; // keyed by itemId

  // Actions
  setSubtitleOffset: (itemId: string, offset: number) => void;
  getSubtitleOffset: (itemId: string) => number;
  clearPreferences: (itemId: string) => void;
  clearAllPreferences: () => void;
}

export const useVideoPreferencesStore = create<VideoPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: {},

      setSubtitleOffset: (itemId, offset) => {
        set((state) => ({
          preferences: {
            ...state.preferences,
            [itemId]: {
              ...state.preferences[itemId],
              subtitleOffset: offset,
              lastUpdated: Date.now(),
            },
          },
        }));
      },

      getSubtitleOffset: (itemId) => {
        return get().preferences[itemId]?.subtitleOffset ?? 0;
      },

      clearPreferences: (itemId) => {
        set((state) => {
          const { [itemId]: _, ...rest } = state.preferences;
          return { preferences: rest };
        });
      },

      clearAllPreferences: () => {
        set({ preferences: {} });
      },
    }),
    {
      name: 'video-preferences-storage',
      storage: createJSONStorage(() => appStorage),
    }
  )
);

// Selectors
export const selectSubtitleOffset = (itemId: string) => (state: VideoPreferencesState) =>
  state.preferences[itemId]?.subtitleOffset ?? 0;
