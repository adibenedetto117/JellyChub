import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

export function NavigationSection() {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.navigation')}>
      <SettingsRow
        title={t('settings.customizeBottomBar')}
        subtitle={t('settings.chooseNavItems')}
        onPress={() => router.push('/settings/bottom-bar')}
        rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
      />
    </SettingsSection>
  );
}
