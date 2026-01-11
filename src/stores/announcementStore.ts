import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
  expiresAt?: string;
  createdBy: string;
}

interface AnnouncementState {
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  announcements: Announcement[];
  dismissedAnnouncementIds: string[];

  addAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt'>) => void;
  removeAnnouncement: (id: string) => void;
  dismissAnnouncement: (id: string) => void;
  clearDismissed: () => void;
  clearAllAnnouncements: () => void;
}

export const useAnnouncementStore = create<AnnouncementState>()(
  persist(
    (set) => ({
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      announcements: [],
      dismissedAnnouncementIds: [],

      addAnnouncement: (announcement) => {
        const id = `announcement_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        set((state) => ({
          announcements: [
            {
              ...announcement,
              id,
              createdAt: new Date().toISOString(),
            },
            ...state.announcements,
          ],
        }));
      },

      removeAnnouncement: (id) => {
        set((state) => ({
          announcements: state.announcements.filter((a) => a.id !== id),
          dismissedAnnouncementIds: state.dismissedAnnouncementIds.filter((did) => did !== id),
        }));
      },

      dismissAnnouncement: (id) => {
        set((state) => ({
          dismissedAnnouncementIds: [...state.dismissedAnnouncementIds, id],
        }));
      },

      clearDismissed: () => {
        set({ dismissedAnnouncementIds: [] });
      },

      clearAllAnnouncements: () => {
        set({ announcements: [], dismissedAnnouncementIds: [] });
      },
    }),
    {
      name: 'announcement-storage',
      storage: createJSONStorage(() => appStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        announcements: state.announcements,
        dismissedAnnouncementIds: state.dismissedAnnouncementIds,
      }),
    }
  )
);

export const selectAnnouncementHasHydrated = (state: AnnouncementState) => state._hasHydrated;
