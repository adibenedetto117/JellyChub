/**
 * Language code mapping for audio track matching
 * Maps ISO 639-2/B language codes to their common variants
 */
export const AUDIO_LANGUAGE_MAP: Record<string, string[]> = {
  'eng': ['en', 'eng', 'english'],
  'rus': ['ru', 'rus', 'russian'],
  'jpn': ['ja', 'jpn', 'japanese', 'jp'],
  'spa': ['es', 'spa', 'spanish'],
  'fre': ['fr', 'fra', 'fre', 'french'],
  'ger': ['de', 'deu', 'ger', 'german'],
  'ita': ['it', 'ita', 'italian'],
  'por': ['pt', 'por', 'portuguese'],
  'zho': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
  'chi': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
  'kor': ['ko', 'kor', 'korean'],
  'ara': ['ar', 'ara', 'arabic'],
  'hin': ['hi', 'hin', 'hindi'],
  'tha': ['th', 'tha', 'thai'],
  'vie': ['vi', 'vie', 'vietnamese'],
  'pol': ['pl', 'pol', 'polish'],
  'dut': ['nl', 'dut', 'nld', 'dutch'],
  'nld': ['nl', 'dut', 'nld', 'dutch'],
  'swe': ['sv', 'swe', 'swedish'],
  'dan': ['da', 'dan', 'danish'],
  'nor': ['no', 'nor', 'norwegian'],
  'fin': ['fi', 'fin', 'finnish'],
  'tur': ['tr', 'tur', 'turkish'],
  'heb': ['he', 'heb', 'hebrew'],
  'ind': ['id', 'ind', 'indonesian'],
  'ukr': ['uk', 'ukr', 'ukrainian'],
  'ces': ['cs', 'ces', 'cze', 'czech'],
  'cze': ['cs', 'ces', 'cze', 'czech'],
  'hun': ['hu', 'hun', 'hungarian'],
  'ron': ['ro', 'ron', 'rum', 'romanian'],
  'ell': ['el', 'ell', 'gre', 'greek'],
  'gre': ['el', 'ell', 'gre', 'greek'],
};

/**
 * Get language variants for matching
 */
export function getLanguageVariants(languageCode: string): string[] {
  const lang = languageCode.toLowerCase();
  return AUDIO_LANGUAGE_MAP[lang] || [lang];
}

/**
 * Find matching audio track by language
 */
export function findAudioTrackByLanguage(
  availableTracks: any[],
  languageCode: string
): any | undefined {
  const variants = getLanguageVariants(languageCode);
  return availableTracks.find((track: any) => {
    const trackLang = (track.language || '').toLowerCase();
    return variants.some(v => trackLang.includes(v) || v.includes(trackLang));
  });
}

/**
 * Find audio track by index position (fallback method)
 */
export function findAudioTrackByIndex(
  availableTracks: any[],
  jellyfinTracks: any[],
  targetIndex: number
): any | undefined {
  const jellyfinIdx = jellyfinTracks.findIndex((t) => t.index === targetIndex);
  if (jellyfinIdx === -1) return undefined;

  // Tracks are often in reverse order
  const reversedIdx = availableTracks.length - 1 - jellyfinIdx;
  if (reversedIdx >= 0 && reversedIdx < availableTracks.length) {
    return availableTracks[reversedIdx];
  }
  return undefined;
}

/**
 * Select best matching audio track
 */
export function selectAudioTrack(
  availableTracks: any[],
  jellyfinTracks: any[],
  targetIndex: number
): any | undefined {
  const jellyfinTrack = jellyfinTracks.find((t) => t.index === targetIndex);

  // Try matching by language first
  if (jellyfinTrack?.language) {
    const track = findAudioTrackByLanguage(availableTracks, jellyfinTrack.language);
    if (track) return track;
  }

  // Fallback to index-based matching
  return findAudioTrackByIndex(availableTracks, jellyfinTracks, targetIndex);
}
