import { Text } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

interface IntegrationsSectionProps {
  jellyseerrAuthToken: string | null;
  jellyseerrConnectionStatus: string | null;
  jellyseerrUsername: string | null;
  radarrApiKey: string | null;
  radarrConnectionStatus: string | null;
  sonarrApiKey: string | null;
  sonarrConnectionStatus: string | null;
  openSubtitlesApiKey: string | null;
  hideMedia: boolean;
  onOpenSubtitlesPress: () => void;
}

function getConnectionStatus(apiKey: string | null, status: string | null) {
  if (!apiKey) return { color: 'rgba(255,255,255,0.5)', icon: '○' };
  if (status === 'error') return { color: '#ef4444', icon: '●' };
  if (status === 'connected') return { color: '#22c55e', icon: '●' };
  return { color: '#f59e0b', icon: '●' };
}

export function IntegrationsSection({
  jellyseerrAuthToken,
  jellyseerrConnectionStatus,
  jellyseerrUsername,
  radarrApiKey,
  radarrConnectionStatus,
  sonarrApiKey,
  sonarrConnectionStatus,
  openSubtitlesApiKey,
  hideMedia,
  onOpenSubtitlesPress,
}: IntegrationsSectionProps) {
  const { t } = useTranslation();

  const getJellyseerrSubtitle = () => {
    if (!jellyseerrAuthToken) return t('settings.notConfigured');
    if (jellyseerrConnectionStatus === 'error') return t('settings.connectionError');
    return `${t('settings.connected')} (${hideMedia ? 'User' : jellyseerrUsername})`;
  };

  return (
    <SettingsSection title={t('settings.integrations')}>
      <SettingsRow
        title={t('settings.jellyseerr')}
        subtitle={getJellyseerrSubtitle()}
        onPress={() => router.push('/settings/jellyseerr')}
        rightElement={
          <Text style={{ color: getConnectionStatus(jellyseerrAuthToken, jellyseerrConnectionStatus).color }}>
            {getConnectionStatus(jellyseerrAuthToken, jellyseerrConnectionStatus).icon}
          </Text>
        }
      />
      <SettingsRow
        title={t('settings.radarr')}
        subtitle={radarrApiKey ? (radarrConnectionStatus === 'error' ? t('settings.connectionError') : t('settings.connected')) : t('settings.notConfigured')}
        onPress={() => router.push('/settings/radarr')}
        rightElement={
          <Text style={{ color: getConnectionStatus(radarrApiKey, radarrConnectionStatus).color }}>
            {getConnectionStatus(radarrApiKey, radarrConnectionStatus).icon}
          </Text>
        }
      />
      <SettingsRow
        title={t('settings.sonarr')}
        subtitle={sonarrApiKey ? (sonarrConnectionStatus === 'error' ? t('settings.connectionError') : t('settings.connected')) : t('settings.notConfigured')}
        onPress={() => router.push('/settings/sonarr')}
        rightElement={
          <Text style={{ color: getConnectionStatus(sonarrApiKey, sonarrConnectionStatus).color }}>
            {getConnectionStatus(sonarrApiKey, sonarrConnectionStatus).icon}
          </Text>
        }
      />
      <SettingsRow
        title={t('settings.opensubtitles')}
        subtitle={openSubtitlesApiKey ? t('settings.connected') : t('settings.notConfigured')}
        onPress={onOpenSubtitlesPress}
        rightElement={
          <Text style={{ color: openSubtitlesApiKey ? '#22c55e' : 'rgba(255,255,255,0.5)' }}>
            {openSubtitlesApiKey ? '●' : '○'}
          </Text>
        }
      />
    </SettingsSection>
  );
}
