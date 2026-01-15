import { useState, useEffect } from 'react';
import { Text, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSettingsStore, useDownloadStore } from '@/stores';
import { formatBytes, getCacheSize, clearImageCache, type CacheInfo } from '@/utils';
import { downloadManager } from '@/services';
import { SettingsSection } from './SettingsSection';
import { SettingsRow } from './SettingsRow';

export function DownloadsSection() {
  const { t } = useTranslation();
  const [cacheInfo, setCacheInfo] = useState<CacheInfo | null>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const { accentColor } = useSettingsStore();
  const { usedStorage } = useDownloadStore();

  useEffect(() => {
    getCacheSize().then(setCacheInfo);
  }, []);

  const handleClearImageCache = async () => {
    Alert.alert(
      'Clear Image Cache',
      'This will clear all cached images. They will be re-downloaded as needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            await clearImageCache();
            const newCacheInfo = await getCacheSize();
            setCacheInfo(newCacheInfo);
            setIsClearingCache(false);
          },
        },
      ]
    );
  };

  const handleRemoveWatched = () => {
    Alert.alert(
      'Remove Watched Downloads',
      'This will remove all downloaded content that you have already watched. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const count = await downloadManager.removeWatchedDownloads();
            Alert.alert('Done', count > 0 ? `Removed ${count} watched download${count !== 1 ? 's' : ''}.` : 'No watched downloads found to remove.');
          },
        },
      ]
    );
  };

  return (
    <>
      <SettingsSection title={t('settings.downloadsSection')}>
        <SettingsRow
          title={t('downloads.title')}
          subtitle={`${formatBytes(usedStorage)} used`}
          onPress={() => router.push('/(tabs)/downloads')}
          rightElement={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>{'>'}</Text>}
        />
        <SettingsRow
          title="Remove Watched Now"
          subtitle="Remove all completed downloads you've watched"
          onPress={handleRemoveWatched}
          rightElement={<Text style={{ color: accentColor }}>Clean</Text>}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.storageCache')}>
        <SettingsRow title="Downloads" subtitle={formatBytes(usedStorage)} />
        <SettingsRow
          title="Image Cache"
          subtitle="Managed by system"
          onPress={handleClearImageCache}
          rightElement={
            isClearingCache ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Text style={{ color: accentColor }}>Clear</Text>
            )
          }
        />
      </SettingsSection>
    </>
  );
}
