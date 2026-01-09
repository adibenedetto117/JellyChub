import { View, Text, Pressable, ScrollView, StyleSheet, Dimensions, useWindowDimensions } from 'react-native';
import { useSettingsStore } from '@/stores';
import { Ionicons } from '@expo/vector-icons';

export interface AudioTrackInfo {
  index: number;
  language?: string;
  title?: string;
  codec?: string;
  channels?: number;
  isDefault?: boolean;
}

export interface SubtitleTrackInfo {
  index: number;
  language?: string;
  title?: string;
  isDefault?: boolean;
  isForced?: boolean;
  codec?: string;
}

interface Props {
  onClose: () => void;
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  selectedAudioIndex: number | undefined;
  selectedSubtitleIndex: number | undefined;
  onSelectAudio: (index: number) => void;
  onSelectSubtitle: (index: number | undefined) => void;
}

const IMAGE_BASED_CODECS = [
  'pgs', 'pgssub', 'hdmv_pgs_subtitle', 'hdmv_pgs',
  'dvdsub', 'dvd_subtitle', 'vobsub',
  'dvbsub', 'dvb_subtitle', 'xsub',
];

function isImageBasedCodec(codec?: string): boolean {
  if (!codec) return false;
  return IMAGE_BASED_CODECS.includes(codec.toLowerCase());
}

// Shared language map for both audio and subtitle tracks
const LANGUAGE_MAP: Record<string, string> = {
  // Major world languages
  eng: 'English',
  spa: 'Spanish',
  fre: 'French',
  fra: 'French',
  ger: 'German',
  deu: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  rus: 'Russian',
  jpn: 'Japanese',
  kor: 'Korean',
  chi: 'Chinese',
  zho: 'Chinese',
  cmn: 'Mandarin',
  yue: 'Cantonese',
  ara: 'Arabic',
  hin: 'Hindi',
  ben: 'Bengali',
  pan: 'Punjabi',
  tam: 'Tamil',
  tel: 'Telugu',
  mar: 'Marathi',
  urd: 'Urdu',
  vie: 'Vietnamese',
  tha: 'Thai',
  ind: 'Indonesian',
  may: 'Malay',
  msa: 'Malay',
  fil: 'Filipino',
  tgl: 'Tagalog',
  // European languages
  nld: 'Dutch',
  dut: 'Dutch',
  pol: 'Polish',
  ukr: 'Ukrainian',
  ces: 'Czech',
  cze: 'Czech',
  slk: 'Slovak',
  slo: 'Slovak',
  hun: 'Hungarian',
  ron: 'Romanian',
  rum: 'Romanian',
  bul: 'Bulgarian',
  hrv: 'Croatian',
  srp: 'Serbian',
  slv: 'Slovenian',
  bos: 'Bosnian',
  mkd: 'Macedonian',
  mac: 'Macedonian',
  ell: 'Greek',
  gre: 'Greek',
  tur: 'Turkish',
  swe: 'Swedish',
  nor: 'Norwegian',
  nob: 'Norwegian',
  nno: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  est: 'Estonian',
  lav: 'Latvian',
  lit: 'Lithuanian',
  isl: 'Icelandic',
  ice: 'Icelandic',
  cat: 'Catalan',
  eus: 'Basque',
  baq: 'Basque',
  glg: 'Galician',
  // Middle Eastern & African
  heb: 'Hebrew',
  fas: 'Persian',
  per: 'Persian',
  kur: 'Kurdish',
  amh: 'Amharic',
  swa: 'Swahili',
  zul: 'Zulu',
  afr: 'Afrikaans',
  // Other Asian
  nep: 'Nepali',
  sin: 'Sinhala',
  mya: 'Burmese',
  bur: 'Burmese',
  khm: 'Khmer',
  lao: 'Lao',
  mon: 'Mongolian',
  // Special codes
  und: 'Unknown',
  mul: 'Multiple',
  zxx: 'No Language',
  qaa: 'Original',
  mis: 'Miscellaneous',
};

function getLanguageName(lang?: string): string | null {
  if (!lang) return null;
  return LANGUAGE_MAP[lang.toLowerCase()] || lang.toUpperCase();
}

function getChannelLabel(channels?: number): string {
  if (!channels) return '';
  switch (channels) {
    case 1: return 'Mono';
    case 2: return 'Stereo';
    case 6: return '5.1';
    case 8: return '7.1';
    default: return `${channels}ch`;
  }
}

function getAudioCodecLabel(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    aac: 'AAC',
    ac3: 'DD',
    eac3: 'DD+',
    truehd: 'TrueHD',
    dts: 'DTS',
    'dts-hd': 'DTS-HD',
    flac: 'FLAC',
    opus: 'Opus',
    vorbis: 'Vorbis',
    mp3: 'MP3',
    pcm: 'PCM',
  };
  return codecMap[codec.toLowerCase()] || codec.toUpperCase();
}

function getSubtitleFormatLabel(codec?: string): string {
  if (!codec) return '';
  const codecMap: Record<string, string> = {
    srt: 'SRT',
    ass: 'ASS',
    ssa: 'SSA',
    vtt: 'WebVTT',
    sub: 'SUB',
    pgs: 'PGS',
    dvdsub: 'DVD',
    dvbsub: 'DVB',
    subrip: 'SRT',
    hdmv_pgs: 'PGS',
    mov_text: 'MOV',
  };
  return codecMap[codec.toLowerCase()] || '';
}

export function AudioSubtitleSelector({
  onClose,
  audioTracks,
  subtitleTracks,
  selectedAudioIndex,
  selectedSubtitleIndex,
  onSelectAudio,
  onSelectSubtitle,
}: Props) {
  const { accentColor } = useSettingsStore();
  const { width: screenWidth } = useWindowDimensions();

  // Use side-by-side layout on wider screens (landscape or tablets)
  const isWideScreen = screenWidth > 600;

  const getAudioTrackLabel = (track: AudioTrackInfo): string => {
    if (track.title) return track.title;
    if (track.language) return getLanguageName(track.language) || track.language.toUpperCase();
    return `Track ${track.index + 1}`;
  };

  const getSubtitleTrackLabel = (track: SubtitleTrackInfo): string => {
    if (track.title) return track.title;
    if (track.language) return getLanguageName(track.language) || track.language.toUpperCase();
    return `Track ${track.index + 1}`;
  };

  const handleSelectAudio = (index: number) => {
    onSelectAudio(index);
  };

  const handleSelectSubtitle = (index: number | undefined) => {
    onSelectSubtitle(index);
  };

  const renderAudioSection = () => (
    <View style={[styles.section, isWideScreen && styles.sectionWide]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="volume-high" size={18} color="rgba(255,255,255,0.7)" />
        <Text style={styles.sectionTitle}>Audio</Text>
      </View>
      <ScrollView
        style={styles.trackList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.trackListContent}
      >
        {audioTracks.map((track) => {
          const isSelected = selectedAudioIndex === track.index;
          const channelLabel = getChannelLabel(track.channels);
          const codecLabel = getAudioCodecLabel(track.codec);
          const detailParts = [channelLabel, codecLabel].filter(Boolean);

          return (
            <Pressable
              key={track.index}
              onPress={() => handleSelectAudio(track.index)}
              style={[
                styles.trackItem,
                isSelected && { backgroundColor: accentColor + '25' },
              ]}
            >
              <View style={styles.radioOuter}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: accentColor }]} />
                )}
              </View>
              <View style={styles.trackInfo}>
                <Text style={[styles.trackLabel, isSelected && { color: accentColor }]} numberOfLines={1}>
                  {getAudioTrackLabel(track)}
                </Text>
                {detailParts.length > 0 && (
                  <Text style={styles.trackDetail} numberOfLines={1}>
                    {detailParts.join(' - ')}
                  </Text>
                )}
              </View>
              {track.isDefault && (
                <View style={[styles.badge, { backgroundColor: accentColor + '30' }]}>
                  <Text style={[styles.badgeText, { color: accentColor }]}>Default</Text>
                </View>
              )}
            </Pressable>
          );
        })}

        {audioTracks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No audio tracks</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  const renderSubtitleSection = () => (
    <View style={[styles.section, isWideScreen && styles.sectionWide]}>
      <View style={styles.sectionHeader}>
        <Ionicons name="chatbubble-outline" size={18} color="rgba(255,255,255,0.7)" />
        <Text style={styles.sectionTitle}>Subtitles</Text>
      </View>
      <ScrollView
        style={styles.trackList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.trackListContent}
      >
        {/* Off option */}
        <Pressable
          onPress={() => handleSelectSubtitle(undefined)}
          style={[
            styles.trackItem,
            selectedSubtitleIndex === undefined && { backgroundColor: accentColor + '25' },
          ]}
        >
          <View style={styles.radioOuter}>
            {selectedSubtitleIndex === undefined && (
              <View style={[styles.radioInner, { backgroundColor: accentColor }]} />
            )}
          </View>
          <View style={styles.trackInfo}>
            <Text style={[styles.trackLabel, selectedSubtitleIndex === undefined && { color: accentColor }]}>
              Off
            </Text>
          </View>
        </Pressable>

        {subtitleTracks.map((track) => {
          const isSelected = selectedSubtitleIndex === track.index;
          const formatLabel = getSubtitleFormatLabel(track.codec);
          const isImageBased = isImageBasedCodec(track.codec);

          return (
            <Pressable
              key={track.index}
              onPress={() => handleSelectSubtitle(track.index)}
              style={[
                styles.trackItem,
                isSelected && { backgroundColor: accentColor + '25' },
                isImageBased && styles.trackItemDisabled,
              ]}
            >
              <View style={styles.radioOuter}>
                {isSelected && (
                  <View style={[styles.radioInner, { backgroundColor: accentColor }]} />
                )}
              </View>
              <View style={styles.trackInfo}>
                <Text
                  style={[
                    styles.trackLabel,
                    isSelected && { color: accentColor },
                    isImageBased && styles.trackLabelDisabled,
                  ]}
                  numberOfLines={1}
                >
                  {getSubtitleTrackLabel(track)}
                </Text>
                {(formatLabel || isImageBased) && (
                  <Text style={[styles.trackDetail, isImageBased && styles.trackDetailDisabled]} numberOfLines={1}>
                    {isImageBased ? 'Requires transcoding' : formatLabel}
                  </Text>
                )}
              </View>
              <View style={styles.badgeContainer}>
                {track.isForced && (
                  <View style={[styles.badge, { backgroundColor: accentColor + '30' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>Forced</Text>
                  </View>
                )}
                {track.isDefault && !track.isForced && (
                  <View style={[styles.badge, { backgroundColor: accentColor + '30' }]}>
                    <Text style={[styles.badgeText, { color: accentColor }]}>Default</Text>
                  </View>
                )}
                {isImageBased && (
                  <View style={[styles.badge, { backgroundColor: 'rgba(255,150,50,0.3)' }]}>
                    <Text style={[styles.badgeText, { color: '#ff9632' }]}>PGS</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        })}

        {subtitleTracks.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No subtitle tracks</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.modal, isWideScreen && styles.modalWide]}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="language" size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>Audio & Subtitles</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={[styles.content, isWideScreen && styles.contentWide]}>
          {renderAudioSection()}
          {isWideScreen && <View style={styles.dividerVertical} />}
          {!isWideScreen && <View style={styles.dividerHorizontal} />}
          {renderSubtitleSection()}
        </View>

        <Pressable onPress={onClose} style={[styles.doneButton, { backgroundColor: accentColor }]}>
          <Text style={styles.doneButtonText}>Done</Text>
        </Pressable>
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
    width: '92%',
    maxWidth: 420,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalWide: {
    maxWidth: 700,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'column',
  },
  contentWide: {
    flexDirection: 'row',
  },
  section: {
    flex: 1,
    minHeight: 150,
    maxHeight: 280,
  },
  sectionWide: {
    flex: 1,
    maxHeight: 350,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  sectionTitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  trackList: {
    flex: 1,
  },
  trackListContent: {
    paddingBottom: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trackInfo: {
    flex: 1,
    marginRight: 8,
  },
  trackLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  trackDetail: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  dividerHorizontal: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
  emptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },
  doneButton: {
    margin: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  trackItemDisabled: {
    opacity: 0.7,
  },
  trackLabelDisabled: {
    color: 'rgba(255,255,255,0.6)',
  },
  trackDetailDisabled: {
    color: 'rgba(255,255,255,0.35)',
  },
});
