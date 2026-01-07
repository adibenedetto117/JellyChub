import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/stores';

export interface AudioTrackInfo {
  index: number;
  language?: string;
  title?: string;
  codec?: string;
  channels?: number;
  isDefault?: boolean;
}

interface Props {
  onClose: () => void;
  tracks: AudioTrackInfo[];
  selectedIndex: number | undefined;
  onSelectTrack: (index: number) => void;
}

function AudioIcon({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        <View style={{ width: 3, height: size * 0.4, backgroundColor: '#fff', borderRadius: 1 }} />
        <View style={{ width: 3, height: size * 0.7, backgroundColor: '#fff', borderRadius: 1 }} />
        <View style={{ width: 3, height: size * 0.5, backgroundColor: '#fff', borderRadius: 1 }} />
      </View>
    </View>
  );
}

export function AudioTrackSelector({ onClose, tracks, selectedIndex, onSelectTrack }: Props) {
  const { accentColor } = useSettingsStore();

  const handleSelect = (index: number) => {
    if (index === selectedIndex) {
      onClose();
      return;
    }
    onSelectTrack(index);
    onClose();
  };

  const getTrackLabel = (track: AudioTrackInfo) => {
    if (track.title) return track.title;
    if (track.language) {
      const langMap: Record<string, string> = {
        eng: 'English',
        jpn: 'Japanese',
        spa: 'Spanish',
        fre: 'French',
        ger: 'German',
        ita: 'Italian',
        por: 'Portuguese',
        rus: 'Russian',
        kor: 'Korean',
        chi: 'Chinese',
        ara: 'Arabic',
        hin: 'Hindi',
        und: 'Unknown',
      };
      return langMap[track.language.toLowerCase()] || track.language.toUpperCase();
    }
    return `Track ${track.index + 1}`;
  };

  const getChannelLabel = (channels?: number) => {
    if (!channels) return '';
    switch (channels) {
      case 1: return 'Mono';
      case 2: return 'Stereo';
      case 6: return '5.1 Surround';
      case 8: return '7.1 Surround';
      default: return `${channels} channels`;
    }
  };

  const getCodecLabel = (codec?: string) => {
    if (!codec) return '';
    const codecMap: Record<string, string> = {
      aac: 'AAC',
      ac3: 'Dolby Digital',
      eac3: 'Dolby Digital Plus',
      truehd: 'Dolby TrueHD',
      dts: 'DTS',
      'dts-hd': 'DTS-HD',
      flac: 'FLAC',
      opus: 'Opus',
      vorbis: 'Vorbis',
      mp3: 'MP3',
      pcm: 'PCM',
    };
    return codecMap[codec.toLowerCase()] || codec.toUpperCase();
  };

  const isCodecCompatible = (codec?: string) => {
    if (!codec) return true;
    const compatible = ['aac', 'mp3', 'ac3', 'eac3', 'opus', 'vorbis'];
    return compatible.includes(codec.toLowerCase());
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <AudioIcon size={18} />
          </View>
          <Text style={styles.headerTitle}>Audio</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeX}>
              <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </Pressable>
        </View>

        <ScrollView style={styles.trackList} showsVerticalScrollIndicator={false}>
          {tracks.map((track) => {
            const isSelected = selectedIndex === track.index;
            const channelLabel = getChannelLabel(track.channels);
            const codecLabel = getCodecLabel(track.codec);
            const compatible = isCodecCompatible(track.codec);

            return (
              <Pressable
                key={track.index}
                onPress={() => handleSelect(track.index)}
                style={[
                  styles.trackItem,
                  isSelected && { backgroundColor: accentColor + '20' },
                  !compatible && { opacity: 0.6 },
                ]}
              >
                <View style={styles.trackInfo}>
                  <View style={styles.trackMainRow}>
                    <Text style={[styles.trackLabel, isSelected && { color: accentColor }]}>
                      {getTrackLabel(track)}
                    </Text>
                    {track.isDefault && (
                      <View style={[styles.defaultBadge, { backgroundColor: accentColor + '30' }]}>
                        <Text style={[styles.defaultText, { color: accentColor }]}>Default</Text>
                      </View>
                    )}
                    {!compatible && (
                      <View style={[styles.defaultBadge, { backgroundColor: '#f59e0b30' }]}>
                        <Text style={[styles.defaultText, { color: '#f59e0b' }]}>May not play</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.trackDetailsRow}>
                    {channelLabel && (
                      <Text style={styles.trackDetail}>{channelLabel}</Text>
                    )}
                    {channelLabel && codecLabel && (
                      <Text style={styles.trackDetailDot}>-</Text>
                    )}
                    {codecLabel && (
                      <Text style={styles.trackDetail}>{codecLabel}</Text>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          })}

          {tracks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No audio tracks available</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modal: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    width: '88%',
    maxWidth: 400,
    maxHeight: '75%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeX: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLine: {
    position: 'absolute',
    width: 14,
    height: 2,
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  trackList: {
    maxHeight: 420,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  trackInfo: {
    flex: 1,
  },
  trackMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trackDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  trackDetail: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  trackDetailDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13,
    marginHorizontal: 6,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkIcon: {
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkShort: {
    position: 'absolute',
    width: 2,
    height: 6,
    borderRadius: 1,
    transform: [{ rotate: '-45deg' }, { translateX: -2 }, { translateY: 2 }],
  },
  checkLong: {
    position: 'absolute',
    width: 2,
    height: 10,
    borderRadius: 1,
    transform: [{ rotate: '45deg' }, { translateX: 2 }, { translateY: 0 }],
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
});
