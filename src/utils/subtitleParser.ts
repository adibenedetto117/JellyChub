/**
 * Subtitle parsing utilities for VTT, SRT, and ASS/SSA formats
 */

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export const IMAGE_BASED_SUBTITLE_CODECS = [
  'pgs', 'pgssub', 'hdmv_pgs_subtitle', 'dvdsub', 'dvd_subtitle',
  'vobsub', 'dvbsub', 'dvb_subtitle', 'xsub',
];

/**
 * Check if a subtitle codec is text-based (not image-based)
 */
export function isTextBasedSubtitle(codec?: string): boolean {
  if (!codec) return true;
  return !IMAGE_BASED_SUBTITLE_CODECS.includes(codec.toLowerCase());
}

/**
 * Parse time string to milliseconds
 * Supports formats: HH:MM:SS.mmm, MM:SS.mmm, HH:MM:SS,mmm
 */
export function parseSubtitleTime(timeStr: string): number {
  const cleaned = timeStr.replace(',', '.').trim();
  const parts = cleaned.split(':');

  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600000 + parseFloat(parts[1]) * 60000 + parseFloat(parts[2]) * 1000;
  } else if (parts.length === 2) {
    return parseFloat(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
  }
  return 0;
}

/**
 * Parse ASS/SSA subtitle format
 */
export function parseAssSubtitles(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    if (line.startsWith('Dialogue:')) {
      const parts = line.substring(9).split(',');
      if (parts.length >= 10) {
        const startTime = parseSubtitleTime(parts[1]);
        const endTime = parseSubtitleTime(parts[2]);
        // Text is everything after the 9th comma, remove ASS style tags
        const subtitleText = parts.slice(9).join(',')
          .replace(/\{[^}]*\}/g, '')
          .replace(/\\N/g, '\n')
          .replace(/\\n/g, '\n')
          .trim();
        if (subtitleText) {
          cues.push({ start: startTime, end: endTime, text: subtitleText });
        }
      }
    }
  }

  return cues;
}

/**
 * Parse VTT/SRT subtitle format
 */
export function parseVttSrtSubtitles(text: string): SubtitleCue[] {
  const cues: SubtitleCue[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.includes('-->')) {
      const [startStr, endStr] = line.split('-->').map(s => s.trim());
      const start = parseSubtitleTime(startStr);
      const end = parseSubtitleTime(endStr.split(' ')[0]);
      const textLines: string[] = [];
      i++;
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i].trim());
        i++;
      }
      if (textLines.length > 0) {
        cues.push({
          start,
          end,
          text: textLines.join('\n').replace(/<[^>]+>/g, '')
        });
      }
    }
    i++;
  }

  return cues;
}

/**
 * Parse subtitle text into cues, auto-detecting format
 */
export function parseSubtitles(text: string): SubtitleCue[] {
  // Check if ASS/SSA format (has [Script Info] or Dialogue:)
  const isAss = text.includes('[Script Info]') || text.includes('Dialogue:');

  const cues = isAss ? parseAssSubtitles(text) : parseVttSrtSubtitles(text);

  // Sort cues by start time to ensure correct order
  cues.sort((a, b) => a.start - b.start);

  return cues;
}

/**
 * Binary search to find the active subtitle cue at a given position
 */
export function findSubtitleCue(cues: SubtitleCue[], position: number): SubtitleCue | null {
  if (cues.length === 0) return null;

  let left = 0;
  let right = cues.length - 1;
  let bestMatch: SubtitleCue | null = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cue = cues[mid];

    if (position >= cue.start && position <= cue.end) {
      return cue;
    } else if (position < cue.start) {
      right = mid - 1;
    } else {
      bestMatch = cue;
      left = mid + 1;
    }
  }

  // Allow small buffer after cue end
  if (bestMatch && position >= bestMatch.start && position <= bestMatch.end + 100) {
    return bestMatch;
  }

  return null;
}

/**
 * Subtitle cache for avoiding repeated parsing
 */
export const subtitleCache = new Map<string, SubtitleCue[]>();

/**
 * Get cached subtitles or parse and cache them
 */
export function getCachedSubtitles(cacheKey: string, text?: string): SubtitleCue[] | null {
  if (subtitleCache.has(cacheKey)) {
    return subtitleCache.get(cacheKey)!;
  }

  if (text) {
    const cues = parseSubtitles(text);
    subtitleCache.set(cacheKey, cues);
    return cues;
  }

  return null;
}
