import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { appStorage } from './storage';

export interface ReadingProgress {
  itemId: string;
  itemName: string;
  itemType: 'Book' | 'AudioBook';
  coverImageTag?: string;
  author?: string;
  // For ebooks: CFI string or position (0-1)
  // For audiobooks: position in ticks
  position: number | string;
  // Total duration/length (not used for ebooks with CFI)
  total: number;
  // Calculated percent (0-100)
  percent: number;
  // Last read timestamp
  lastRead: number;
}

export interface ReaderSettings {
  fontSize: number; // percentage, e.g. 100
  theme: 'dark' | 'light' | 'sepia';
}

export interface AudiobookBookmark {
  id: string;
  itemId: string;
  bookTitle: string;
  positionTicks: number;
  name: string;
  createdAt: string;
}

export interface EbookBookmark {
  id: string;
  itemId: string;
  bookTitle: string;
  cfi: string;
  name: string;
  progress: number;
  createdAt: string;
}

interface ReadingProgressState {
  progress: Record<string, ReadingProgress>;
  bookmarks: AudiobookBookmark[];
  ebookBookmarks: EbookBookmark[];
  readerSettings: ReaderSettings;

  // Progress Actions
  updateProgress: (itemId: string, data: Omit<ReadingProgress, 'percent' | 'lastRead'>) => void;
  updateProgressPercent: (itemId: string, percent: number) => void;
  getProgress: (itemId: string) => ReadingProgress | null;
  getRecentlyReading: (limit?: number) => ReadingProgress[];
  removeProgress: (itemId: string) => void;
  clearAllProgress: () => void;

  // Audiobook Bookmark Actions
  addBookmark: (bookmark: Omit<AudiobookBookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;
  getBookmarksForItem: (itemId: string) => AudiobookBookmark[];

  // Ebook Bookmark Actions
  addEbookBookmark: (bookmark: Omit<EbookBookmark, 'id' | 'createdAt'>) => void;
  removeEbookBookmark: (id: string) => void;
  getEbookBookmarksForItem: (itemId: string) => EbookBookmark[];

  // Reader Settings Actions
  setReaderSettings: (settings: Partial<ReaderSettings>) => void;
}

export const useReadingProgressStore = create<ReadingProgressState>()(
  persist(
    (set, get) => ({
      progress: {},
      bookmarks: [],
      ebookBookmarks: [],
      readerSettings: {
        fontSize: 100,
        theme: 'dark',
      },

      updateProgress: (itemId, data) => {
        // For ebooks with CFI, don't calculate percent from position
        const existingProgress = get().progress[itemId];
        const percent = typeof data.position === 'string'
          ? (existingProgress?.percent ?? 0)
          : (data.total > 0 ? Math.round((data.position / data.total) * 100) : 0);
        set((state) => ({
          progress: {
            ...state.progress,
            [itemId]: {
              ...data,
              percent,
              lastRead: Date.now(),
            },
          },
        }));
      },

      updateProgressPercent: (itemId, percent) => {
        set((state) => {
          const existing = state.progress[itemId];
          if (!existing) return state;
          return {
            progress: {
              ...state.progress,
              [itemId]: {
                ...existing,
                percent: Math.round(percent),
                lastRead: Date.now(),
              },
            },
          };
        });
      },

      getProgress: (itemId) => {
        return get().progress[itemId] ?? null;
      },

      getRecentlyReading: (limit = 10) => {
        const allProgress = Object.values(get().progress);
        // Filter out completed items (100%) and sort by last read
        return allProgress
          .filter((p) => p.percent > 0 && p.percent < 100)
          .sort((a, b) => b.lastRead - a.lastRead)
          .slice(0, limit);
      },

      removeProgress: (itemId) => {
        set((state) => {
          const { [itemId]: _, ...rest } = state.progress;
          return { progress: rest };
        });
      },

      clearAllProgress: () => {
        set({ progress: {} });
      },

      addBookmark: (bookmark) => {
        set((state) => ({
          bookmarks: [
            ...state.bookmarks,
            {
              ...bookmark,
              id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      },

      removeBookmark: (id) => {
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        }));
      },

      getBookmarksForItem: (itemId) => {
        return get().bookmarks.filter((b) => b.itemId === itemId);
      },

      addEbookBookmark: (bookmark) => {
        set((state) => ({
          ebookBookmarks: [
            ...state.ebookBookmarks,
            {
              ...bookmark,
              id: `ebook_bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: new Date().toISOString(),
            },
          ],
        }));
      },

      removeEbookBookmark: (id) => {
        set((state) => ({
          ebookBookmarks: state.ebookBookmarks.filter((b) => b.id !== id),
        }));
      },

      getEbookBookmarksForItem: (itemId) => {
        return get().ebookBookmarks.filter((b) => b.itemId === itemId);
      },

      setReaderSettings: (settings) => {
        set((state) => ({
          readerSettings: {
            ...state.readerSettings,
            ...settings,
          },
        }));
      },
    }),
    {
      name: 'reading-progress-storage',
      storage: createJSONStorage(() => appStorage),
    }
  )
);

// Selectors
export const selectReadingProgress = (itemId: string) => (state: ReadingProgressState) =>
  state.progress[itemId];

export const selectRecentlyReading = (state: ReadingProgressState) =>
  Object.values(state.progress)
    .filter((p) => p.percent > 0 && p.percent < 100)
    .sort((a, b) => b.lastRead - a.lastRead);
