import { useState, useMemo, useCallback } from 'react';
import type { WebView } from 'react-native-webview';
import { useReadingProgressStore, type EbookBookmark } from '@/stores/readingProgressStore';

export interface EpubBookmarksState {
  showBookmarks: boolean;
  setShowBookmarks: (show: boolean) => void;
  itemBookmarks: EbookBookmark[];
  handleAddBookmark: () => void;
  handleBookmarkPress: (cfi: string) => void;
  handleRemoveBookmark: (id: string) => void;
}

export function useEpubBookmarks(
  itemId: string | undefined,
  bookTitle: string,
  currentCfi: string | null,
  progress: number,
  webViewRef: React.RefObject<WebView | null>
): EpubBookmarksState {
  const ebookBookmarks = useReadingProgressStore((s) => s.ebookBookmarks);
  const addEbookBookmark = useReadingProgressStore((s) => s.addEbookBookmark);
  const removeEbookBookmark = useReadingProgressStore((s) => s.removeEbookBookmark);

  const [showBookmarks, setShowBookmarks] = useState(false);

  const itemBookmarks = useMemo(() =>
    ebookBookmarks.filter(b => b.itemId === itemId).sort((a, b) => a.progress - b.progress),
    [ebookBookmarks, itemId]
  );

  const handleAddBookmark = useCallback(() => {
    if (!currentCfi || !itemId) return;
    const progressPercent = Math.round(progress * 100);
    addEbookBookmark({
      itemId,
      bookTitle,
      cfi: currentCfi,
      name: `Page ${progressPercent}%`,
      progress: progressPercent,
    });
  }, [currentCfi, itemId, progress, addEbookBookmark, bookTitle]);

  const handleBookmarkPress = useCallback((cfi: string) => {
    webViewRef.current?.injectJavaScript(`goToCfi("${cfi}"); true;`);
    setShowBookmarks(false);
  }, [webViewRef]);

  const handleRemoveBookmark = useCallback((id: string) => {
    removeEbookBookmark(id);
  }, [removeEbookBookmark]);

  return {
    showBookmarks,
    setShowBookmarks,
    itemBookmarks,
    handleAddBookmark,
    handleBookmarkPress,
    handleRemoveBookmark,
  };
}
