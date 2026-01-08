import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DownloadItem } from '@/types';
import type { BaseItem } from '@/types/jellyfin';
import { appStorage } from './storage';

interface DownloadState {
  // Download queue
  downloads: DownloadItem[];
  activeDownloadId: string | null;

  // Storage info
  usedStorage: number; // in bytes
  maxStorage: number; // in bytes

  // Actions
  addDownload: (item: BaseItem, serverId: string, totalBytes: number) => string;
  updateDownloadProgress: (id: string, downloadedBytes: number) => void;
  setDownloadStatus: (
    id: string,
    status: DownloadItem['status'],
    error?: string
  ) => void;
  completeDownload: (id: string, localPath: string) => void;
  removeDownload: (id: string) => void;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  pauseAllDownloads: () => void;
  resumeAllDownloads: () => void;
  cancelAllDownloads: () => void;

  setActiveDownload: (id: string | null) => void;
  getNextPendingDownload: () => DownloadItem | null;

  setMaxStorage: (bytes: number) => void;
  recalculateUsedStorage: () => void;

  getDownloadByItemId: (itemId: string) => DownloadItem | undefined;
  isItemDownloaded: (itemId: string) => boolean;
  getDownloadedItem: (itemId: string) => DownloadItem | undefined;
}

export const useDownloadStore = create<DownloadState>()(
  persist(
    (set, get) => ({
      downloads: [],
      activeDownloadId: null,
      usedStorage: 0,
      maxStorage: 50 * 1024 * 1024 * 1024, // 50 GB default

      addDownload: (item, serverId, totalBytes) => {
        const id = `download_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        const download: DownloadItem = {
          id,
          itemId: item.Id,
          serverId,
          item,
          status: 'pending',
          progress: 0,
          totalBytes,
          downloadedBytes: 0,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          downloads: [...state.downloads, download],
        }));

        return id;
      },

      updateDownloadProgress: (id, downloadedBytes) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id
              ? {
                  ...d,
                  downloadedBytes,
                  progress:
                    d.totalBytes > 0
                      ? Math.round((downloadedBytes / d.totalBytes) * 100)
                      : 0,
                }
              : d
          ),
        })),

      setDownloadStatus: (id, status, error) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id
              ? {
                  ...d,
                  status,
                  error,
                  ...(status === 'failed' ? { activeDownloadId: null } : {}),
                }
              : d
          ),
          // Clear active if this was the active download and it failed/completed
          activeDownloadId:
            state.activeDownloadId === id &&
            (status === 'failed' || status === 'completed')
              ? null
              : state.activeDownloadId,
        })),

      completeDownload: (id, localPath) =>
        set((state) => {
          const download = state.downloads.find((d) => d.id === id);
          const newUsedStorage = download
            ? state.usedStorage + download.totalBytes
            : state.usedStorage;

          return {
            downloads: state.downloads.map((d) =>
              d.id === id
                ? {
                    ...d,
                    status: 'completed' as const,
                    localPath,
                    progress: 100,
                    downloadedBytes: d.totalBytes,
                    completedAt: new Date().toISOString(),
                  }
                : d
            ),
            activeDownloadId: null,
            usedStorage: newUsedStorage,
          };
        }),

      removeDownload: (id) =>
        set((state) => {
          const download = state.downloads.find((d) => d.id === id);
          const freedSpace =
            download?.status === 'completed' ? download.totalBytes : 0;

          return {
            downloads: state.downloads.filter((d) => d.id !== id),
            activeDownloadId:
              state.activeDownloadId === id ? null : state.activeDownloadId,
            usedStorage: Math.max(0, state.usedStorage - freedSpace),
          };
        }),

      pauseDownload: (id) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id && d.status === 'downloading'
              ? { ...d, status: 'paused' as const }
              : d
          ),
          activeDownloadId:
            state.activeDownloadId === id ? null : state.activeDownloadId,
        })),

      resumeDownload: (id) =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.id === id && d.status === 'paused'
              ? { ...d, status: 'pending' as const }
              : d
          ),
        })),

      pauseAllDownloads: () =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.status === 'downloading' || d.status === 'pending'
              ? { ...d, status: 'paused' as const }
              : d
          ),
          activeDownloadId: null,
        })),

      resumeAllDownloads: () =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.status === 'paused'
              ? { ...d, status: 'pending' as const }
              : d
          ),
        })),

      cancelAllDownloads: () =>
        set((state) => ({
          downloads: state.downloads.map((d) =>
            d.status === 'downloading' || d.status === 'pending'
              ? { ...d, status: 'failed' as const, error: 'Cancelled' }
              : d
          ),
          activeDownloadId: null,
        })),

      setActiveDownload: (id) => set({ activeDownloadId: id }),

      getNextPendingDownload: () => {
        const { downloads } = get();
        return downloads.find((d) => d.status === 'pending') ?? null;
      },

      setMaxStorage: (maxStorage) => set({ maxStorage }),

      recalculateUsedStorage: () => {
        const { downloads } = get();
        const usedStorage = downloads
          .filter((d) => d.status === 'completed')
          .reduce((acc, d) => acc + d.totalBytes, 0);
        set({ usedStorage });
      },

      getDownloadByItemId: (itemId) => {
        return get().downloads.find((d) => d.itemId === itemId);
      },

      isItemDownloaded: (itemId) => {
        const download = get().downloads.find((d) => d.itemId === itemId);
        return download?.status === 'completed';
      },

      getDownloadedItem: (itemId) => {
        return get().downloads.find(
          (d) => d.itemId === itemId && d.status === 'completed'
        );
      },
    }),
    {
      name: 'download-storage',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        downloads: state.downloads.filter((d) => d.status === 'completed'),
        usedStorage: state.usedStorage,
        maxStorage: state.maxStorage,
      }),
    }
  )
);

// Selectors
export const selectPendingDownloads = (state: DownloadState) =>
  state.downloads.filter((d) => d.status === 'pending');

export const selectActiveDownload = (state: DownloadState) =>
  state.downloads.find((d) => d.id === state.activeDownloadId);

export const selectCompletedDownloads = (state: DownloadState) =>
  state.downloads.filter((d) => d.status === 'completed');

export const selectDownloadsByType = (state: DownloadState, type: string) =>
  state.downloads.filter((d) => d.item.Type === type);

export const selectStorageUsage = (state: DownloadState) => ({
  used: state.usedStorage,
  max: state.maxStorage,
  percentage: (state.usedStorage / state.maxStorage) * 100,
  remaining: state.maxStorage - state.usedStorage,
});
