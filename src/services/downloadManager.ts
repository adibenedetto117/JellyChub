import * as FileSystem from 'expo-file-system/legacy';
import { useDownloadStore } from '@/stores/downloadStore';
import { useAuthStore } from '@/stores/authStore';
import { getStreamUrl, getAudioStreamUrl } from '@/api';
import type { BaseItem } from '@/types/jellyfin';

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}jellychub/downloads/`;

interface DownloadTask {
  id: string;
  downloadResumable: FileSystem.DownloadResumable | null;
}

class DownloadManager {
  private activeTasks: Map<string, DownloadTask> = new Map();
  private isProcessing = false;

  async ensureDownloadDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
  }

  async startDownload(item: BaseItem, serverId: string): Promise<string | null> {
    const store = useDownloadStore.getState();
    const authStore = useAuthStore.getState();
    const server = authStore.servers.find((s) => s.id === serverId);

    if (!server) return null;

    await this.ensureDownloadDirectory();

    const isAudio = item.Type === 'Audio' || item.Type === 'AudioBook';
    const extension = isAudio ? 'mp3' : 'mp4';
    const localPath = `${DOWNLOAD_DIR}${item.Id}.${extension}`;

    const existingDownload = store.getDownloadByItemId(item.Id);
    if (existingDownload) {
      if (existingDownload.status === 'completed') {
        return existingDownload.id;
      }
      if (existingDownload.status === 'downloading') {
        return existingDownload.id;
      }
    }

    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const estimatedSize = item.MediaSources?.[0]?.Size ?? 500 * 1024 * 1024;

    const downloadId = store.addDownload(item, serverId, estimatedSize);

    this.processQueue();

    return downloadId;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const store = useDownloadStore.getState();

    while (true) {
      const nextDownload = store.getNextPendingDownload();
      if (!nextDownload) break;

      store.setActiveDownload(nextDownload.id);
      store.setDownloadStatus(nextDownload.id, 'downloading');

      try {
        await this.executeDownload(nextDownload.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Download failed';
        store.setDownloadStatus(nextDownload.id, 'failed', message);
      }
    }

    this.isProcessing = false;
  }

  private async executeDownload(downloadId: string): Promise<void> {
    const store = useDownloadStore.getState();
    const authStore = useAuthStore.getState();

    const download = store.downloads.find((d) => d.id === downloadId);
    if (!download) return;

    const server = authStore.servers.find((s) => s.id === download.serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    const item = download.item;
    const isAudio = item.Type === 'Audio' || item.Type === 'AudioBook';
    const extension = isAudio ? 'mp3' : 'mp4';
    const localPath = `${DOWNLOAD_DIR}${item.Id}.${extension}`;

    let downloadUrl: string;
    if (isAudio) {
      downloadUrl = getAudioStreamUrl(item.Id);
    } else {
      const mediaSourceId = item.MediaSources?.[0]?.Id ?? item.Id;
      downloadUrl = getStreamUrl(item.Id, mediaSourceId);
    }

    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      localPath,
      {
        headers: {
          'X-Emby-Token': server.accessToken ?? '',
        },
      },
      (progress) => {
        const downloaded = progress.totalBytesWritten;
        store.updateDownloadProgress(downloadId, downloaded);
      }
    );

    this.activeTasks.set(downloadId, {
      id: downloadId,
      downloadResumable,
    });

    const result = await downloadResumable.downloadAsync();

    this.activeTasks.delete(downloadId);

    if (result?.uri) {
      store.completeDownload(downloadId, result.uri);
    } else {
      throw new Error('Download failed - no result');
    }
  }

  async pauseDownload(downloadId: string): Promise<void> {
    const task = this.activeTasks.get(downloadId);
    if (task?.downloadResumable) {
      await task.downloadResumable.pauseAsync();
    }
    useDownloadStore.getState().pauseDownload(downloadId);
    this.activeTasks.delete(downloadId);
  }

  async resumeDownload(downloadId: string): Promise<void> {
    useDownloadStore.getState().resumeDownload(downloadId);
    this.processQueue();
  }

  async cancelDownload(downloadId: string): Promise<void> {
    const task = this.activeTasks.get(downloadId);
    if (task?.downloadResumable) {
      await task.downloadResumable.pauseAsync();
    }
    this.activeTasks.delete(downloadId);

    const store = useDownloadStore.getState();
    const download = store.downloads.find((d) => d.id === downloadId);

    if (download?.localPath) {
      try {
        await FileSystem.deleteAsync(download.localPath, { idempotent: true });
      } catch {
      }
    }

    store.removeDownload(downloadId);
  }

  async deleteDownload(downloadId: string): Promise<void> {
    const store = useDownloadStore.getState();
    const download = store.downloads.find((d) => d.id === downloadId);

    if (download?.localPath) {
      try {
        await FileSystem.deleteAsync(download.localPath, { idempotent: true });
      } catch {
      }
    }

    store.removeDownload(downloadId);
  }

  async getLocalPath(itemId: string): Promise<string | null> {
    const store = useDownloadStore.getState();
    const download = store.getDownloadedItem(itemId);
    return download?.localPath ?? null;
  }

  isDownloaded(itemId: string): boolean {
    return useDownloadStore.getState().isItemDownloaded(itemId);
  }

  async getStorageInfo(): Promise<{
    used: number;
    available: number;
    total: number;
  }> {
    const freeSpace = await FileSystem.getFreeDiskStorageAsync();
    const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
    const store = useDownloadStore.getState();

    return {
      used: store.usedStorage,
      available: freeSpace,
      total: totalSpace,
    };
  }

  async clearAllDownloads(): Promise<void> {
    const store = useDownloadStore.getState();

    for (const task of this.activeTasks.values()) {
      if (task.downloadResumable) {
        await task.downloadResumable.pauseAsync();
      }
    }
    this.activeTasks.clear();

    try {
      await FileSystem.deleteAsync(DOWNLOAD_DIR, { idempotent: true });
      await this.ensureDownloadDirectory();
    } catch {
    }

    store.downloads.forEach((d) => store.removeDownload(d.id));
  }
}

export const downloadManager = new DownloadManager();
