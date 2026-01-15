import { useState, useCallback, useRef, useEffect } from 'react';
import { getSubtitleUrl } from '@/api';
import {
  SubtitleCue,
  isTextBasedSubtitle,
  parseSubtitles,
  findSubtitleCue,
  subtitleCache,
} from '@/utils/subtitleParser';
import { SUBTITLE_LOAD_MAX_RETRIES, SUBTITLE_LOAD_TIMEOUT } from '@/constants/videoPlayer';

export interface SubtitleTrack {
  index: number;
  language?: string;
  title?: string;
  isDefault?: boolean;
  isForced?: boolean;
  codec?: string;
}

interface UseVideoSubtitlesOptions {
  itemId: string;
  mediaSourceId: string | undefined;
  subtitleOffset?: number;
}

interface UseVideoSubtitlesReturn {
  // State
  subtitleCues: SubtitleCue[];
  externalSubtitleCues: SubtitleCue[] | null;
  currentSubtitle: string;
  selectedSubtitleIndex: number | undefined;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectSubtitle: (index: number | undefined) => Promise<void>;
  setExternalSubtitles: (cues: SubtitleCue[]) => void;
  clearExternalSubtitles: () => void;
  updateCurrentSubtitle: (positionMs: number) => void;
}

export function useVideoSubtitles({
  itemId,
  mediaSourceId,
  subtitleOffset = 0,
}: UseVideoSubtitlesOptions): UseVideoSubtitlesReturn {
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [externalSubtitleCues, setExternalSubtitleCues] = useState<SubtitleCue[] | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingLoadRef = useRef<{ itemId: string; mediaSourceId: string; index: number } | null>(null);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const loadSubtitleTrack = useCallback(async (
    loadItemId: string,
    loadMediaSourceId: string,
    index: number,
    retryCount = 0
  ): Promise<boolean> => {
    const loadRequest = { itemId: loadItemId, mediaSourceId: loadMediaSourceId, index };
    pendingLoadRef.current = loadRequest;

    setIsLoading(true);
    setError(null);

    // Check cache first
    const cacheKey = `${loadItemId}-${loadMediaSourceId}-${index}`;
    const cachedCues = subtitleCache.get(cacheKey);
    if (cachedCues && cachedCues.length > 0) {
      if (pendingLoadRef.current === loadRequest) {
        setSubtitleCues(cachedCues);
        setIsLoading(false);
        console.log(`[Subtitles] Loaded ${cachedCues.length} cues from cache`);
      }
      return true;
    }

    const tryFetch = async (format: string): Promise<string | null> => {
      try {
        const url = getSubtitleUrl(loadItemId, loadMediaSourceId, index, format);
        console.log(`[Subtitles] Trying format ${format}: ${url}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), SUBTITLE_LOAD_TIMEOUT);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          console.warn(`[Subtitles] HTTP ${res.status} for format ${format}`);
          return null;
        }
        const text = await res.text();
        console.log(`[Subtitles] Got ${text.length} bytes for format ${format}`);
        return text;
      } catch (e: any) {
        console.warn(`[Subtitles] Fetch error for format ${format}:`, e?.message || e);
        return null;
      }
    };

    try {
      // Try multiple formats in order of preference
      let text = await tryFetch('vtt');
      if (!text || text.length < 10) {
        text = await tryFetch('srt');
      }
      if (!text || text.length < 10) {
        text = await tryFetch('ass');
      }
      if (!text || text.length < 10) {
        text = await tryFetch('ssa');
      }

      // Check if this request is still current
      if (pendingLoadRef.current !== loadRequest) {
        console.log('[Subtitles] Load cancelled - newer request pending');
        return false;
      }

      if (!text || text.length < 10) {
        // Retry with exponential backoff
        if (retryCount < SUBTITLE_LOAD_MAX_RETRIES) {
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`[Subtitles] Retrying in ${delay}ms (attempt ${retryCount + 2}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSubtitleTrack(loadItemId, loadMediaSourceId, index, retryCount + 1);
        }
        console.error('[Subtitles] All format attempts failed after retries');
        if (pendingLoadRef.current === loadRequest) {
          setSubtitleCues([]);
          setIsLoading(false);
          setError('Failed to load subtitles');
        }
        return false;
      }

      // Parse subtitles
      const cues = parseSubtitles(text);

      // Final race condition check
      if (pendingLoadRef.current !== loadRequest) {
        console.log('[Subtitles] Load cancelled - newer request pending');
        return false;
      }

      // Cache and set the parsed cues
      subtitleCache.set(cacheKey, cues);
      setSubtitleCues(cues);
      setIsLoading(false);
      console.log(`[Subtitles] Successfully loaded ${cues.length} cues`);
      return cues.length > 0;
    } catch (err: any) {
      console.error('[Subtitles] Error loading subtitle track:', err?.message || err);
      if (pendingLoadRef.current === loadRequest) {
        setSubtitleCues([]);
        setIsLoading(false);
        setError('Error loading subtitles');
      }
      return false;
    }
  }, []);

  const selectSubtitle = useCallback(async (index: number | undefined) => {
    setSelectedSubtitleIndex(index);
    setCurrentSubtitle('');
    setExternalSubtitleCues(null);

    if (index === undefined || !mediaSourceId) {
      pendingLoadRef.current = null;
      setSubtitleCues([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    await loadSubtitleTrack(itemId, mediaSourceId, index);
  }, [itemId, mediaSourceId, loadSubtitleTrack]);

  const setExternalSubtitles = useCallback((cues: SubtitleCue[]) => {
    setExternalSubtitleCues(cues);
    setSelectedSubtitleIndex(undefined);
    setSubtitleCues([]);
    setCurrentSubtitle('');
  }, []);

  const clearExternalSubtitles = useCallback(() => {
    setExternalSubtitleCues(null);
  }, []);

  const updateCurrentSubtitle = useCallback((positionMs: number) => {
    const activeCues = externalSubtitleCues || (selectedSubtitleIndex !== undefined ? subtitleCues : null);

    if (activeCues && activeCues.length > 0) {
      const adjustedPosition = positionMs - subtitleOffset;
      const activeCue = findSubtitleCue(activeCues, adjustedPosition);
      setCurrentSubtitle(activeCue?.text || '');
    } else {
      setCurrentSubtitle('');
    }
  }, [externalSubtitleCues, selectedSubtitleIndex, subtitleCues, subtitleOffset]);

  return {
    subtitleCues,
    externalSubtitleCues,
    currentSubtitle,
    selectedSubtitleIndex,
    isLoading,
    error,
    selectSubtitle,
    setExternalSubtitles,
    clearExternalSubtitles,
    updateCurrentSubtitle,
  };
}

export { isTextBasedSubtitle };
