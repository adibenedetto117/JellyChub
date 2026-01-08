import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSettingsStore } from '@/stores';

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
  tracks: SubtitleTrackInfo[];
  selectedIndex: number | undefined;
  onSelectTrack: (index: number | undefined) => void;
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

function SubtitleIcon({ size = 20 }: { size?: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size * 0.85, height: size * 0.6, borderWidth: 2, borderColor: '#fff', borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          <View style={{ width: size * 0.15, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
          <View style={{ width: size * 0.15, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
          <View style={{ width: size * 0.15, height: 2, backgroundColor: '#fff', borderRadius: 1 }} />
        </View>
      </View>
    </View>
  );
}

export function SubtitleSelector({ onClose, tracks, selectedIndex, onSelectTrack }: Props) {
  const { accentColor } = useSettingsStore();

  const handleSelectTrack = (index: number | undefined) => {
    if (index === selectedIndex) {
      onClose();
      return;
    }
    onSelectTrack(index);
    onClose();
  };

  const getLanguageName = (lang?: string) => {
    if (!lang) return null;
    const langMap: Record<string, string> = {
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
    return langMap[lang.toLowerCase()] || lang.toUpperCase();
  };

  const getTrackLabel = (track: SubtitleTrackInfo) => {
    if (track.title) return track.title;
    if (track.language) return getLanguageName(track.language) || track.language.toUpperCase();
    return `Track ${track.index + 1}`;
  };

  const getFormatLabel = (codec?: string) => {
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
      mov_text: 'MOV Text',
    };
    return codecMap[codec.toLowerCase()] || codec.toUpperCase();
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.modal}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <SubtitleIcon size={18} />
          </View>
          <Text style={styles.headerTitle}>Subtitles</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeX}>
              <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </Pressable>
        </View>

        <ScrollView style={styles.trackList} showsVerticalScrollIndicator={false}>
          <Pressable
            onPress={() => handleSelectTrack(undefined)}
            style={[
              styles.trackItem,
              selectedIndex === undefined && { backgroundColor: accentColor + '20' },
            ]}
          >
            <View style={styles.trackInfo}>
              <View style={styles.trackMainRow}>
                <Text style={[styles.trackLabel, selectedIndex === undefined && { color: accentColor }]}>
                  Off
                </Text>
              </View>
              <Text style={styles.trackDetail}>Disable subtitles</Text>
            </View>
          </Pressable>

          {tracks.length > 0 && <View style={styles.divider} />}

          {tracks.map((track) => {
            const isSelected = selectedIndex === track.index;
            const formatLabel = getFormatLabel(track.codec);
            const langName = track.title ? getLanguageName(track.language) : null;
            const isImageBased = isImageBasedCodec(track.codec);

            const badges: string[] = [];
            if (track.isForced) badges.push('Forced');
            if (track.isDefault) badges.push('Default');
            if (isImageBased) badges.push('Burn-in');

            return (
              <Pressable
                key={track.index}
                onPress={() => handleSelectTrack(track.index)}
                style={[
                  styles.trackItem,
                  isSelected && { backgroundColor: accentColor + '20' },
                  isImageBased && styles.trackItemDisabled,
                ]}
              >
                <View style={styles.trackInfo}>
                  <View style={styles.trackMainRow}>
                    <Text style={[
                      styles.trackLabel,
                      isSelected && { color: accentColor },
                      isImageBased && styles.trackLabelDisabled,
                    ]}>
                      {getTrackLabel(track)}
                    </Text>
                    {badges.map((badge) => (
                      <View
                        key={badge}
                        style={[
                          styles.badge,
                          { backgroundColor: badge === 'Burn-in' ? 'rgba(255,150,50,0.3)' : accentColor + '30' },
                        ]}
                      >
                        <Text style={[
                          styles.badgeText,
                          { color: badge === 'Burn-in' ? '#ff9632' : accentColor },
                        ]}>
                          {badge}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.trackDetailsRow}>
                    {langName && (
                      <>
                        <Text style={[styles.trackDetail, isImageBased && styles.trackDetailDisabled]}>{langName}</Text>
                        {formatLabel && <Text style={styles.trackDetailDot}>-</Text>}
                      </>
                    )}
                    {formatLabel && (
                      <Text style={[styles.trackDetail, isImageBased && styles.trackDetailDisabled]}>{formatLabel}</Text>
                    )}
                  </View>
                  {isImageBased && (
                    <Text style={styles.trackWarning}>Requires transcoding</Text>
                  )}
                </View>
              </Pressable>
            );
          })}

          {tracks.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No subtitle tracks available</Text>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  trackLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
    marginHorizontal: 18,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
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
  trackWarning: {
    color: '#ff9632',
    fontSize: 11,
    marginTop: 4,
  },
});
