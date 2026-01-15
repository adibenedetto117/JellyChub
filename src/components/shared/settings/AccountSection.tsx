import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';
import { getDisplayUsername, getDisplayServerName } from '@/utils';

interface AccountSectionProps {
  currentUserName?: string;
  activeServerName?: string;
  hideMedia: boolean;
  onSwitchUser: () => void;
  onLogout: () => void;
}

export function AccountSection({
  currentUserName,
  activeServerName,
  hideMedia,
  onSwitchUser,
  onLogout,
}: AccountSectionProps) {
  const { t } = useTranslation();

  return (
    <SettingsSection title={t('settings.account')}>
      <SettingsRow
        title={getDisplayUsername(currentUserName, hideMedia)}
        subtitle={getDisplayServerName(activeServerName, hideMedia)}
      />
      <SettingsRow
        title={t('settings.switchUser')}
        onPress={onSwitchUser}
        rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
      />
      <SettingsRow
        title={t('settings.changeServer')}
        onPress={() => router.push('/(auth)/server-select')}
        rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
      />
      <SettingsRow
        title="Custom Headers"
        onPress={() => router.push('/settings/custom-headers' as any)}
        rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
      />
      <SettingsRow
        title={t('settings.signOut')}
        onPress={onLogout}
        rightElement={<Text style={{ color: '#ef4444' }}>{'>'}</Text>}
      />
    </SettingsSection>
  );
}
