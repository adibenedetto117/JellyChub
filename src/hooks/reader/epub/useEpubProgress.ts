import { useState, useEffect, useRef } from 'react';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { reportPlaybackProgress, generatePlaySessionId } from '@/api';
import type { BaseItem } from '@/types';

export interface EpubProgressState {
  progress: number;
  setProgress: (p: number) => void;
  currentCfi: string | null;
  setCurrentCfi: (cfi: string | null) => void;
  savedPercent: number | null;
  setSavedPercent: (p: number | null) => void;
  pendingCfiRef: React.MutableRefObject<string | null>;
  isNavigating: boolean;
  setIsNavigating: (n: boolean) => void;
  progressPercent: number;
}

export function useEpubProgress(
  itemId: string | undefined,
  item: BaseItem | undefined,
  startCfi?: string
): EpubProgressState {
  const decodedStartCfi = startCfi ? decodeURIComponent(startCfi) : undefined;
  const updateProgressPercent = useReadingProgressStore((s) => s.updateProgressPercent);

  const [progress, setProgress] = useState(0);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [savedPercent, setSavedPercent] = useState<number | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [playSessionId] = useState(() => generatePlaySessionId());
  const pendingCfiRef = useRef<string | null>(null);

  useEffect(() => {
    if (!itemId) return;
    const stored = useReadingProgressStore.getState().progress[itemId];

    if (decodedStartCfi) {
      pendingCfiRef.current = decodedStartCfi;
      setCurrentCfi(decodedStartCfi);
      setIsNavigating(true);
    } else if (stored?.position && typeof stored.position === 'string' && stored.percent >= 0) {
      pendingCfiRef.current = stored.position;
      setCurrentCfi(stored.position);
      setProgress(stored.percent / 100);
      setSavedPercent(stored.percent / 100);
      setIsNavigating(true);
    } else if (stored?.percent !== undefined && stored.percent > 0) {
      setSavedPercent(stored.percent / 100);
      setProgress(stored.percent / 100);
      setIsNavigating(true);
    }
  }, [itemId, decodedStartCfi]);

  useEffect(() => {
    if (!item || !currentCfi) return;

    const save = () => {
      const author = item.People?.find((p: { Type?: string }) => p.Type === 'Author')?.Name;
      useReadingProgressStore.getState().updateProgress(item.Id!, {
        itemId: item.Id!,
        itemName: item.Name ?? 'Unknown',
        itemType: 'Book',
        coverImageTag: item.ImageTags?.Primary,
        author,
        position: currentCfi,
        total: 1,
        percent: Math.round(progress * 100),
      });

      const totalTicks = item.RunTimeTicks || 10000000000;
      const positionTicks = Math.round(totalTicks * progress);
      reportPlaybackProgress({
        ItemId: item.Id!,
        MediaSourceId: item.Id!,
        PositionTicks: positionTicks,
        IsPaused: true,
        IsMuted: false,
        PlaySessionId: playSessionId,
      }).catch(() => {});
    };

    const interval = setInterval(save, 10000);
    return () => {
      clearInterval(interval);
      save();
    };
  }, [item, currentCfi, progress, playSessionId]);

  const handleProgressUpdate = (newProgress: number) => {
    setProgress(newProgress);
    if (itemId) {
      updateProgressPercent(itemId, Math.round(newProgress * 100));
    }
  };

  return {
    progress,
    setProgress: handleProgressUpdate,
    currentCfi,
    setCurrentCfi,
    savedPercent,
    setSavedPercent,
    pendingCfiRef,
    isNavigating,
    setIsNavigating,
    progressPercent: Math.round(progress * 100),
  };
}
