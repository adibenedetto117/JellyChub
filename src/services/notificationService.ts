import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';

export interface DownloadCompleteInfo {
  itemName: string;
  itemType: string;
  quality?: 'original' | 'high' | 'medium' | 'low';
  fileSize?: number; // in bytes
  seriesName?: string; // for episodes
  artistName?: string; // for audio/audiobooks
  seasonInfo?: string; // e.g., "S1 E5"
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatQuality(quality?: string): string {
  switch (quality) {
    case 'original':
      return 'Original';
    case 'high':
      return 'High (15 Mbps)';
    case 'medium':
      return 'Medium (8 Mbps)';
    case 'low':
      return 'Low (4 Mbps)';
    default:
      return '';
  }
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationType = 'downloadComplete' | 'nowPlaying';

class NotificationService {
  private hasPermission = false;

  async initialize(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      this.hasPermission = finalStatus === 'granted';

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('downloads', {
          name: 'Downloads',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0ea5e9',
        });

        await Notifications.setNotificationChannelAsync('playback', {
          name: 'Now Playing',
          importance: Notifications.AndroidImportance.LOW,
          vibrationPattern: undefined,
          lightColor: '#0ea5e9',
        });
      }

      return this.hasPermission;
    } catch {
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch {
      return false;
    }
  }

  private isNotificationEnabled(type: NotificationType): boolean {
    const settings = useSettingsStore.getState();
    switch (type) {
      case 'downloadComplete':
        return settings.notifications.downloadComplete;
      case 'nowPlaying':
        return settings.notifications.nowPlaying;
      default:
        return false;
    }
  }

  async showDownloadComplete(info: DownloadCompleteInfo): Promise<void> {
    if (!this.hasPermission || !this.isNotificationEnabled('downloadComplete')) {
      return;
    }

    try {
      // Build notification title with context
      let title = 'Download Complete';
      if (info.itemType === 'Episode' && info.seriesName) {
        title = `${info.seriesName}`;
      } else if ((info.itemType === 'Audio' || info.itemType === 'AudioBook') && info.artistName) {
        title = `${info.artistName}`;
      }

      // Build notification body with details
      const bodyParts: string[] = [];

      // Main item name with optional season/episode info
      if (info.itemType === 'Episode' && info.seasonInfo) {
        bodyParts.push(`${info.seasonInfo}: ${info.itemName}`);
      } else {
        bodyParts.push(info.itemName);
      }

      // Add quality and file size info
      const detailParts: string[] = [];
      if (info.quality) {
        detailParts.push(formatQuality(info.quality));
      }
      if (info.fileSize && info.fileSize > 0) {
        detailParts.push(formatFileSize(info.fileSize));
      }

      if (detailParts.length > 0) {
        bodyParts.push(detailParts.join(' | '));
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: bodyParts.join('\n'),
          data: { type: 'downloadComplete', itemType: info.itemType },
        },
        trigger: null,
        ...(Platform.OS === 'android' && {
          channelId: 'downloads',
        }),
      });
    } catch {
      // Silently fail
    }
  }

  async showNowPlaying(
    title: string,
    artist?: string,
    artworkUrl?: string
  ): Promise<string | null> {
    if (!this.hasPermission || !this.isNotificationEnabled('nowPlaying')) {
      return null;
    }

    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: artist || 'Now Playing',
          data: { type: 'nowPlaying' },
        },
        trigger: null,
        ...(Platform.OS === 'android' && {
          channelId: 'playback',
        }),
      });
      return identifier;
    } catch {
      return null;
    }
  }

  async dismissNotification(identifier: string): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(identifier);
    } catch {
      // Silently fail
    }
  }

  async dismissAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // Silently fail
    }
  }

  getHasPermission(): boolean {
    return this.hasPermission;
  }
}

export const notificationService = new NotificationService();
