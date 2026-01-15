import { Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { haptics } from '@/utils';
import { notificationService } from '@/services';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

export function NotificationsSection() {
  const { t } = useTranslation();

  const {
    accentColor,
    notifications,
    setNotificationSetting,
  } = useSettingsStore();

  return (
    <SettingsSection title={t('settings.notifications')}>
      <SettingsRow
        title={t('settings.downloadComplete')}
        subtitle={t('settings.downloadComplete')}
        rightElement={
          <Switch
            value={notifications.downloadComplete}
            onValueChange={(value) => {
              haptics.medium();
              if (value) notificationService.requestPermission();
              setNotificationSetting('downloadComplete', value);
            }}
            trackColor={{ false: '#3a3a3a', true: accentColor }}
          />
        }
      />
      <SettingsRow
        title="Now Playing"
        subtitle="Show notification for current media"
        rightElement={
          <Switch
            value={notifications.nowPlaying}
            onValueChange={(value) => {
              haptics.medium();
              if (value) notificationService.requestPermission();
              setNotificationSetting('nowPlaying', value);
            }}
            trackColor={{ false: '#3a3a3a', true: accentColor }}
          />
        }
      />
    </SettingsSection>
  );
}
