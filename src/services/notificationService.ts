import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useSettingsStore } from '@/stores/settingsStore';

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

  async showDownloadComplete(itemName: string, itemType: string): Promise<void> {
    if (!this.hasPermission || !this.isNotificationEnabled('downloadComplete')) {
      return;
    }

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Download Complete',
          body: `${itemName} is ready to play offline`,
          data: { type: 'downloadComplete', itemType },
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
