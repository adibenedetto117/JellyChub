import type { SubtitleFontColor, SubtitleBackgroundColor, SubtitleSize } from '@/types/player';

export const SUBTITLE_TEXT_COLORS: { name: string; color: SubtitleFontColor }[] = [
  { name: 'White', color: '#ffffff' },
  { name: 'Yellow', color: '#ffff00' },
  { name: 'Cyan', color: '#00ffff' },
  { name: 'Green', color: '#00ff00' },
];

export const SUBTITLE_BG_COLORS: { name: string; color: SubtitleBackgroundColor }[] = [
  { name: 'None', color: 'none' },
  { name: 'Black', color: '#000000' },
  { name: 'Dark Gray', color: '#333333' },
];

export const SUBTITLE_SIZES: { label: string; value: SubtitleSize }[] = [
  { label: 'Small', value: 'small' },
  { label: 'Medium', value: 'medium' },
  { label: 'Large', value: 'large' },
  { label: 'Extra Large', value: 'extraLarge' },
];

export const AUDIO_SUBTITLE_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'rus', name: 'Russian' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'zho', name: 'Chinese' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'tur', name: 'Turkish' },
  { code: 'pol', name: 'Polish' },
  { code: 'nld', name: 'Dutch' },
  { code: 'swe', name: 'Swedish' },
  { code: 'nor', name: 'Norwegian' },
  { code: 'dan', name: 'Danish' },
  { code: 'fin', name: 'Finnish' },
  { code: 'und', name: 'Unknown' },
];

export function getLanguageName(code: string): string {
  return AUDIO_SUBTITLE_LANGUAGES.find((l) => l.code === code)?.name ?? code.toUpperCase();
}
