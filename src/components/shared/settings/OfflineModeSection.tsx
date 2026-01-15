import { Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { haptics } from '@/utils';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

export function OfflineModeSection() {
  const { t } = useTranslation();

  const {
    accentColor,
    offlineMode,
    setOfflineMode,
  } = useSettingsStore();

  return (
    <SettingsSection title={t('settings.offlineMode')}>
      <SettingsRow
        title={t('settings.offlineMode')}
        subtitle={t('settings.offlineModeDesc')}
        rightElement={
          <Switch
            value={offlineMode}
            onValueChange={(value) => {
              haptics.medium();
              setOfflineMode(value);
            }}
            trackColor={{ false: '#3a3a3a', true: accentColor }}
          />
        }
      />
    </SettingsSection>
  );
}
