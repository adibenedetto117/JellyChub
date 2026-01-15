import { useState, useEffect } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Switch } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { getPlaybackInfo } from '@/api';
import { getAudioStreams, getSubtitleStreams, formatBytes } from '@/utils';
import { ModalHeader } from './ModalHeader';
import { Dropdown, type DropdownOption } from './Dropdown';
import type { BaseItem } from '@/types/jellyfin';

export type DownloadQuality = 'original' | 'high' | 'medium' | 'low';

interface DownloadOptionsModalProps {
  item: BaseItem;
  userId: string;
  visible: boolean;
  onClose: () => void;
  onConfirm: (audioIndex?: number, subtitleIndex?: number, quality?: DownloadQuality) => void;
}

const getQualityOptions = (t: (key: string) => string): DropdownOption<DownloadQuality>[] => [
  { value: 'original', label: t('downloads.qualityOriginal'), subtitle: t('downloads.qualityOriginalDesc') },
  { value: 'high', label: t('downloads.qualityHigh'), subtitle: t('downloads.qualityHighDesc') },
  { value: 'medium', label: t('downloads.qualityMedium'), subtitle: t('downloads.qualityMediumDesc') },
  { value: 'low', label: t('downloads.qualityLow'), subtitle: t('downloads.qualityLowDesc') },
];

const getLanguageName = (code?: string) => {
  if (!code) return 'Unknown';
  const languages: Record<string, string> = {
    eng: 'English', spa: 'Spanish', fra: 'French', deu: 'German',
    ita: 'Italian', por: 'Portuguese', rus: 'Russian', jpn: 'Japanese',
    kor: 'Korean', zho: 'Chinese', ara: 'Arabic', hin: 'Hindi',
    und: 'Unknown',
  };
  return languages[code.toLowerCase()] || code.toUpperCase();
};

export function DownloadOptionsModal({ item, userId, visible, onClose, onConfirm }: DownloadOptionsModalProps) {
  const { t } = useTranslation();
  const accentColor = useSettingsStore((s) => s.accentColor);
  const downloadQuality = useSettingsStore((s) => s.downloadQuality);
  const downloadOverWifiOnly = useSettingsStore((s) => s.downloadOverWifiOnly);
  const autoRemoveWatchedDownloads = useSettingsStore((s) => s.autoRemoveWatchedDownloads);
  const setDownloadQuality = useSettingsStore((s) => s.setDownloadQuality);
  const setDownloadOverWifiOnly = useSettingsStore((s) => s.setDownloadOverWifiOnly);
  const setAutoRemoveWatchedDownloads = useSettingsStore((s) => s.setAutoRemoveWatchedDownloads);

  const [selectedAudio, setSelectedAudio] = useState<number | undefined>(undefined);
  const [selectedSubtitle, setSelectedSubtitle] = useState<number | undefined>(undefined);
  const [selectedQuality, setSelectedQuality] = useState<DownloadQuality>(downloadQuality);
  const [wifiOnly, setWifiOnly] = useState(downloadOverWifiOnly);
  const [autoRemove, setAutoRemove] = useState(autoRemoveWatchedDownloads);

  const { data: playbackInfo, isLoading } = useQuery({
    queryKey: ['playback-download', userId, item.Id],
    queryFn: () => getPlaybackInfo(item.Id, userId),
    enabled: visible && !!userId && !!item.Id,
  });

  const mediaSource = playbackInfo?.MediaSources?.[0];
  const audioTracks = mediaSource ? getAudioStreams(mediaSource) : [];
  const subtitleTracks = mediaSource ? getSubtitleStreams(mediaSource) : [];
  const fileSize = mediaSource?.Size;

  useEffect(() => {
    if (audioTracks.length > 0 && selectedAudio === undefined) {
      const defaultAudio = audioTracks.find(a => a.IsDefault) || audioTracks[0];
      setSelectedAudio(defaultAudio?.Index);
    }
  }, [audioTracks]);

  useEffect(() => {
    if (!visible) {
      setSelectedAudio(undefined);
      setSelectedSubtitle(undefined);
    } else {
      setSelectedQuality(downloadQuality);
      setWifiOnly(downloadOverWifiOnly);
      setAutoRemove(autoRemoveWatchedDownloads);
    }
  }, [visible, downloadQuality, downloadOverWifiOnly, autoRemoveWatchedDownloads]);

  if (!visible) return null;

  const audioOptions: DropdownOption[] = audioTracks.map(track => ({
    value: track.Index,
    label: track.DisplayTitle || getLanguageName(track.Language),
    subtitle: `${track.Codec?.toUpperCase() || ''} ${track.Channels}ch${track.IsDefault ? ' Default' : ''}`,
  }));

  const subtitleOptions: DropdownOption[] = [
    { value: undefined, label: 'None' },
    ...subtitleTracks.map(track => ({
      value: track.Index,
      label: track.DisplayTitle || getLanguageName(track.Language),
      subtitle: `${track.Codec?.toUpperCase() || ''}${track.IsForced ? ' Forced' : ''}${track.IsDefault ? ' Default' : ''}`,
    })),
  ];

  const handleConfirm = () => {
    if (selectedQuality !== downloadQuality) setDownloadQuality(selectedQuality);
    if (wifiOnly !== downloadOverWifiOnly) setDownloadOverWifiOnly(wifiOnly);
    if (autoRemove !== autoRemoveWatchedDownloads) setAutoRemoveWatchedDownloads(autoRemove);
    onConfirm(selectedAudio, selectedSubtitle, selectedQuality);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <ModalHeader title="Download Options" onClose={onClose} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.Name}</Text>
              {fileSize && (
                <Text style={styles.fileSize}>Estimated size: {formatBytes(fileSize)}</Text>
              )}
            </View>

            {audioOptions.length > 0 && (
              <View style={styles.dropdownContainer}>
                <Dropdown
                  label="Audio Track"
                  options={audioOptions}
                  selectedValue={selectedAudio}
                  onSelect={setSelectedAudio}
                  accentColor={accentColor}
                />
              </View>
            )}

            <View style={styles.dropdownContainer}>
              <Dropdown
                label="Subtitles"
                options={subtitleOptions}
                selectedValue={selectedSubtitle}
                onSelect={setSelectedSubtitle}
                accentColor={accentColor}
              />
            </View>

            <View style={styles.dropdownContainer}>
              <Dropdown<DownloadQuality>
                label={t('downloads.downloadQuality')}
                options={getQualityOptions(t)}
                selectedValue={selectedQuality}
                onSelect={setSelectedQuality}
                accentColor={accentColor}
              />
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Wi-Fi Only</Text>
                  <Text style={styles.settingSubtext}>Only download on Wi-Fi</Text>
                </View>
                <Switch
                  value={wifiOnly}
                  onValueChange={setWifiOnly}
                  trackColor={{ false: '#3a3a3a', true: accentColor }}
                />
              </View>
              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <View style={styles.settingInfo}>
                  <Text style={styles.settingLabel}>Auto-Remove Watched</Text>
                  <Text style={styles.settingSubtext}>Delete after watching</Text>
                </View>
                <Switch
                  value={autoRemove}
                  onValueChange={setAutoRemove}
                  trackColor={{ false: '#3a3a3a', true: accentColor }}
                />
              </View>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            style={[styles.downloadButton, { backgroundColor: accentColor }]}
            disabled={isLoading}
          >
            <Text style={styles.downloadText}>Download</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
  },
  content: {
    padding: 16,
  },
  itemInfo: {
    marginBottom: 20,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  fileSize: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  dropdownContainer: {
    marginBottom: 16,
  },
  settingsSection: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  settingSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  downloadButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  downloadText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
