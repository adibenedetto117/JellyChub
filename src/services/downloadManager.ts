import * as FileSystem from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import { useDownloadStore } from '@/stores/downloadStore';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getStreamUrl, getAudioStreamUrl, getBookDownloadUrl } from '@/api';
import { notificationService } from './notificationService';
import { encryptionService } from './encryptionService';
import type { BaseItem } from '@/types/jellyfin';

export type DownloadQualityOption = 'original' | 'high' | 'medium' | 'low';

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}jellychub/downloads/`;

interface DownloadTask {
  id: string;
  downloadResumable: FileSystem.DownloadResumable | null;
}

class DownloadManager {
  private activeTasks: Map<string, DownloadTask> = new Map();
  private isProcessing = false;
  private isPaused = false;

  async ensureDownloadDirectory(): Promise<void> {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
  }

  async checkWifiConnection(): Promise<boolean> {
    try {
      const networkState = await Network.getNetworkStateAsync();
      return networkState.type === Network.NetworkStateType.WIFI;
    } catch {
      return true;
    }
  }

  async canStartDownload(): Promise<{ canStart: boolean; reason?: string }> {
    const settings = useSettingsStore.getState();

    if (this.isPaused) {
      return { canStart: false, reason: 'Downloads are paused' };
    }

    if (settings.downloadOverWifiOnly) {
      const isWifi = await this.checkWifiConnection();
      if (!isWifi) {
        return { canStart: false, reason: 'WiFi-only mode enabled. Connect to WiFi to download.' };
      }
    }

    return { canStart: true };
  }

  async startDownload(item: BaseItem, serverId: string, quality?: DownloadQualityOption): Promise<string | null> {
    const store = useDownloadStore.getState();
    const authStore = useAuthStore.getState();
    const server = authStore.servers.find((s) => s.id === serverId);

    if (!server) return null;

    await this.ensureDownloadDirectory();

    const isAudio = item.Type === 'Audio' || item.Type === 'AudioBook';
    const isBook = item.Type === 'Book';
    const extension = isAudio ? 'mp3' : isBook ? (item.Container?.toLowerCase() || 'epub') : 'mp4';
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

    const downloadId = store.addDownload(item, serverId, estimatedSize, quality);

    this.processQueue();

    return downloadId;
  }

  async startBatchDownload(items: BaseItem[], serverId: string): Promise<string[]> {
    const downloadIds: string[] = [];
    for (const item of items) {
      const id = await this.startDownload(item, serverId);
      if (id) downloadIds.push(id);
    }
    return downloadIds;
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const store = useDownloadStore.getState();

    while (true) {
      const { canStart } = await this.canStartDownload();
      if (!canStart) {
        break;
      }

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

  private getDownloadBitrate(quality?: DownloadQualityOption): { bitrate: number | null; useTranscode: boolean } {
    // Use per-download quality if provided, otherwise fall back to global setting
    const settings = useSettingsStore.getState();
    const effectiveQuality = quality ?? settings.downloadQuality;

    switch (effectiveQuality) {
      case 'original':
        return { bitrate: null, useTranscode: false };
      case 'high':
        return { bitrate: 15000000, useTranscode: true }; // 15 Mbps
      case 'medium':
        return { bitrate: 8000000, useTranscode: true }; // 8 Mbps
      case 'low':
        return { bitrate: 4000000, useTranscode: true }; // 4 Mbps
      default:
        return { bitrate: null, useTranscode: false };
    }
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
    const isBook = item.Type === 'Book';
    const extension = isAudio ? 'mp3' : isBook ? (item.Container?.toLowerCase() || 'epub') : 'mp4';
    const localPath = `${DOWNLOAD_DIR}${item.Id}.${extension}`;

    let downloadUrl: string;
    if (isBook) {
      downloadUrl = getBookDownloadUrl(item.Id);
    } else if (isAudio) {
      downloadUrl = getAudioStreamUrl(item.Id);
    } else {
      const mediaSourceId = item.MediaSources?.[0]?.Id ?? item.Id;
      const { bitrate, useTranscode } = this.getDownloadBitrate(download.quality);
      downloadUrl = getStreamUrl(item.Id, mediaSourceId, {
        maxStreamingBitrate: bitrate ?? undefined,
        transcode: useTranscode,
      });
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
      const encryptedPath = `${localPath}.enc`;
      await encryptionService.encryptFile(result.uri, encryptedPath);
      await FileSystem.deleteAsync(result.uri, { idempotent: true });

      const fileInfo = await FileSystem.getInfoAsync(encryptedPath);
      const actualFileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : download.totalBytes;

      store.completeDownload(downloadId, encryptedPath, actualFileSize);

      // Build rich notification info
      const itemType = item.Type || 'Media';
      let seasonInfo: string | undefined;
      let artistName: string | undefined;

      if (itemType === 'Episode') {
        const seasonNum = item.ParentIndexNumber;
        const episodeNum = item.IndexNumber;
        if (seasonNum !== undefined && episodeNum !== undefined) {
          seasonInfo = `S${seasonNum} E${episodeNum}`;
        }
      } else if (itemType === 'Audio' || itemType === 'AudioBook') {
        artistName = (item as any).Artists?.join(', ') || (item as any).AlbumArtist;
      }

      notificationService.showDownloadComplete({
        itemName: item.Name || 'Download',
        itemType,
        quality: download.quality,
        fileSize: actualFileSize,
        seriesName: item.SeriesName,
        artistName,
        seasonInfo,
      });
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

  async pauseAllDownloads(): Promise<void> {
    this.isPaused = true;
    for (const task of this.activeTasks.values()) {
      if (task.downloadResumable) {
        try {
          await task.downloadResumable.pauseAsync();
        } catch {}
      }
    }
    this.activeTasks.clear();
    useDownloadStore.getState().pauseAllDownloads();
  }

  async resumeAllDownloads(): Promise<void> {
    this.isPaused = false;
    useDownloadStore.getState().resumeAllDownloads();
    this.processQueue();
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  async removeWatchedDownloads(): Promise<number> {
    const store = useDownloadStore.getState();
    const completedDownloads = store.downloads.filter((d) => d.status === 'completed');
    let removedCount = 0;

    for (const download of completedDownloads) {
      const isWatched = download.item.UserData?.Played === true;
      if (isWatched) {
        await this.deleteDownload(download.id);
        removedCount++;
      }
    }

    return removedCount;
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
        await FileSystem.deleteAsync(`${download.localPath}.marker`, { idempotent: true });
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
        await FileSystem.deleteAsync(`${download.localPath}.marker`, { idempotent: true });
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

  async getDecryptedPath(itemId: string): Promise<string | null> {
    const store = useDownloadStore.getState();
    const download = store.getDownloadedItem(itemId);
    if (!download?.localPath) return null;

    const fileInfo = await FileSystem.getInfoAsync(download.localPath);
    if (!fileInfo.exists) return null;

    if (download.localPath.endsWith('.enc')) {
      return encryptionService.getDecryptedUri(download.localPath);
    }

    return download.localPath;
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
