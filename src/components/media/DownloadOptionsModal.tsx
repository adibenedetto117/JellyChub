import { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator, StyleSheet, Modal, Switch } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/stores';
import { getPlaybackInfo } from '@/api';
import { getAudioStreams, getSubtitleStreams, formatBytes } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';

export type DownloadQuality = 'original' | 'high' | 'medium' | 'low';

interface DownloadOptionsModalProps {
  item: BaseItem;
  userId: string;
  visible: boolean;
  onClose: () => void;
  onConfirm: (audioIndex?: number, subtitleIndex?: number, quality?: DownloadQuality) => void;
}

interface DropdownOption<T = number | undefined> {
  value: T;
  label: string;
  subtitle?: string;
}

function ChevronDownIcon({ size = 16, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{
        width: 0, height: 0,
        borderLeftWidth: size * 0.35, borderRightWidth: size * 0.35, borderTopWidth: size * 0.4,
        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: color
      }} />
    </View>
  );
}

function CheckIcon({ size = 18, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <View style={{ width: size * 0.35, height: size * 0.55, borderRightWidth: 2, borderBottomWidth: 2, borderColor: color, transform: [{ rotate: '45deg' }], marginTop: -size * 0.1 }} />
    </View>
  );
}

interface DropdownProps<T> {
  label: string;
  options: DropdownOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  accentColor: string;
}

function Dropdown<T>({ label, options, selectedValue, onSelect, accentColor }: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === selectedValue);

  return (
    <>
      <Text style={styles.dropdownLabel}>{label}</Text>
      <Pressable
        onPress={() => setIsOpen(true)}
        style={styles.dropdownButton}
      >
        <View style={styles.dropdownButtonContent}>
          <Text style={styles.dropdownButtonText} numberOfLines={1}>
            {selectedOption?.label || 'Select...'}
          </Text>
          {selectedOption?.subtitle && (
            <Text style={styles.dropdownButtonSubtext} numberOfLines={1}>
              {selectedOption.subtitle}
            </Text>
          )}
        </View>
        <ChevronDownIcon size={14} color="rgba(255,255,255,0.5)" />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.dropdownOverlay} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdownMenu}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>{label}</Text>
              <Pressable onPress={() => setIsOpen(false)} style={styles.dropdownCloseBtn}>
                <Text style={styles.dropdownCloseBtnText}>Done</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.dropdownScroll} showsVerticalScrollIndicator={false}>
              {options.map((option, index) => (
                <Pressable
                  key={String(option.value ?? 'none')}
                  onPress={() => {
                    onSelect(option.value);
                    setIsOpen(false);
                  }}
                  style={[
                    styles.dropdownOption,
                    selectedValue === option.value && { backgroundColor: accentColor + '20' },
                    index === options.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.dropdownOptionContent}>
                    <Text style={styles.dropdownOptionText}>{option.label}</Text>
                    {option.subtitle && (
                      <Text style={styles.dropdownOptionSubtext}>{option.subtitle}</Text>
                    )}
                  </View>
                  {selectedValue === option.value && (
                    <CheckIcon size={18} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Quality options with bitrate and estimated storage per hour
const getQualityOptions = (t: (key: string) => string): DropdownOption<DownloadQuality>[] => [
  { value: 'original', label: t('downloads.qualityOriginal'), subtitle: t('downloads.qualityOriginalDesc') },
  { value: 'high', label: t('downloads.qualityHigh'), subtitle: t('downloads.qualityHighDesc') },
  { value: 'medium', label: t('downloads.qualityMedium'), subtitle: t('downloads.qualityMediumDesc') },
  { value: 'low', label: t('downloads.qualityLow'), subtitle: t('downloads.qualityLowDesc') },
];

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

  // Set defaults when data loads
  useEffect(() => {
    if (audioTracks.length > 0 && selectedAudio === undefined) {
      const defaultAudio = audioTracks.find(a => a.IsDefault) || audioTracks[0];
      setSelectedAudio(defaultAudio?.Index);
    }
  }, [audioTracks]);

  // Reset when modal closes/opens
  useEffect(() => {
    if (!visible) {
      setSelectedAudio(undefined);
      setSelectedSubtitle(undefined);
    } else {
      // Reset to current settings when modal opens
      setSelectedQuality(downloadQuality);
      setWifiOnly(downloadOverWifiOnly);
      setAutoRemove(autoRemoveWatchedDownloads);
    }
  }, [visible, downloadQuality, downloadOverWifiOnly, autoRemoveWatchedDownloads]);

  if (!visible) return null;

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

  const audioOptions: DropdownOption[] = audioTracks.map(track => ({
    value: track.Index,
    label: track.DisplayTitle || getLanguageName(track.Language),
    subtitle: `${track.Codec?.toUpperCase() || ''} • ${track.Channels}ch${track.IsDefault ? ' • Default' : ''}`,
  }));

  const subtitleOptions: DropdownOption[] = [
    { value: undefined, label: 'None' },
    ...subtitleTracks.map(track => ({
      value: track.Index,
      label: track.DisplayTitle || getLanguageName(track.Language),
      subtitle: `${track.Codec?.toUpperCase() || ''}${track.IsForced ? ' • Forced' : ''}${track.IsDefault ? ' • Default' : ''}`,
    })),
  ];

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>Download Options</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.loadingText}>Loading options...</Text>
          </View>
        ) : (
          <View style={styles.content}>
            {/* File Info */}
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={2}>{item.Name}</Text>
              {fileSize && (
                <Text style={styles.fileSize}>Estimated size: {formatBytes(fileSize)}</Text>
              )}
            </View>

            {/* Audio Dropdown */}
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

            {/* Subtitle Dropdown */}
            <View style={styles.dropdownContainer}>
              <Dropdown
                label="Subtitles"
                options={subtitleOptions}
                selectedValue={selectedSubtitle}
                onSelect={setSelectedSubtitle}
                accentColor={accentColor}
              />
            </View>

            {/* Quality Dropdown */}
            <View style={styles.dropdownContainer}>
              <Dropdown<DownloadQuality>
                label={t('downloads.downloadQuality')}
                options={getQualityOptions(t)}
                selectedValue={selectedQuality}
                onSelect={setSelectedQuality}
                accentColor={accentColor}
              />
            </View>

            {/* Settings Toggles */}
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
              <View style={styles.settingRow}>
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

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              // Save settings if changed
              if (selectedQuality !== downloadQuality) setDownloadQuality(selectedQuality);
              if (wifiOnly !== downloadOverWifiOnly) setDownloadOverWifiOnly(wifiOnly);
              if (autoRemove !== autoRemoveWatchedDownloads) setAutoRemoveWatchedDownloads(autoRemove);
              onConfirm(selectedAudio, selectedSubtitle, selectedQuality);
            }}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#fff',
    fontSize: 16,
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
  dropdownLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dropdownButtonContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  dropdownButtonSubtext: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownMenu: {
    width: '85%',
    maxWidth: 380,
    maxHeight: '70%',
    backgroundColor: '#242424',
    borderRadius: 16,
    overflow: 'hidden',
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  dropdownHeaderText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dropdownCloseBtnText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdownScroll: {
    maxHeight: 350,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  dropdownOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  dropdownOptionText: {
    color: '#fff',
    fontSize: 15,
  },
  dropdownOptionSubtext: {
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
