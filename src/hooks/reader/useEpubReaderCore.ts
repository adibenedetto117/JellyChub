import { useState, useRef, useCallback } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { WebView } from 'react-native-webview';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { downloadManager } from '@/services';
import { getItem } from '@/api';
import {
  type ReaderTheme,
  type TocItem,
  type PendingHighlight,
  type EpubReaderCore,
  type UseEpubReaderCoreOptions,
  THEMES,
} from './epub';
import { getEpubReaderHtml } from './epub/readerHtml';
import { useEpubDownload } from './epub/useEpubDownload';
import { useEpubProgress } from './epub/useEpubProgress';
import { useEpubBookmarks } from './epub/useEpubBookmarks';
import { useEpubHighlights } from './epub/useEpubHighlights';

export { type ReaderTheme, THEMES, type TocItem, type PendingHighlight, type EpubReaderCore, type UseEpubReaderCoreOptions };
export { HIGHLIGHT_COLORS } from './epub';

export function useEpubReaderCore({ itemId, startCfi }: UseEpubReaderCoreOptions): EpubReaderCore {
  const webViewRef = useRef<WebView>(null);

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((s) => s.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const getDownloadByItemId = useDownloadStore((s) => s.getDownloadByItemId);
  const userId = currentUser?.Id ?? '';

  const downloaded = getDownloadedItem(itemId ?? '');
  const downloadInProgress = getDownloadByItemId(itemId ?? '');
  const isDownloading = downloadInProgress?.status === 'downloading' || downloadInProgress?.status === 'pending';

  const savedSettings = useReadingProgressStore((s) => s.readerSettings);
  const setReaderSettings = useReadingProgressStore((s) => s.setReaderSettings);

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId!),
    enabled: !!userId && !!itemId,
  });

  const download = useEpubDownload(itemId);
  const progressState = useEpubProgress(itemId, item, startCfi);

  const [isReaderReady, setIsReaderReady] = useState(false);
  const [isConfirmedEpub, setIsConfirmedEpub] = useState(false);
  const [locationsReady, setLocationsReady] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(savedSettings.theme);
  const [fontSize, setFontSize] = useState(savedSettings.fontSize);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(download.loadingStage);

  const bookmarks = useEpubBookmarks(
    itemId,
    item?.Name ?? 'Unknown Book',
    progressState.currentCfi,
    progressState.progress,
    webViewRef
  );

  const highlights = useEpubHighlights(itemId, webViewRef);

  const injectEpubData = useCallback(() => {
    if (!download.fileUri || !webViewRef.current) return;

    const chunkSize = 500000;
    const chunks: string[] = [];
    for (let i = 0; i < download.fileUri.length; i += chunkSize) {
      chunks.push(download.fileUri.substring(i, i + chunkSize));
    }

    webViewRef.current.injectJavaScript(`window.epubBase64 = ""; true;`);

    let script = 'window.epubBase64 = "';
    for (const chunk of chunks) {
      const escaped = chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      script += escaped;
    }
    script += '"; true;';

    webViewRef.current.injectJavaScript(script);

    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`initReaderWithData(); true;`);
    }, 50);
  }, [download.fileUri]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }

    const msgType = data.type as string;

    if (msgType === 'log') {
      if (__DEV__) {
        console.log('[EPUB]', data.message);
      }
      return;
    }

    if (msgType === 'tap') {
      setShowControls(prev => !prev);
      return;
    }

    if (msgType === 'webviewReady') {
      setLoadingStage('Parsing book...');
      injectEpubData();
      return;
    }

    if (msgType === 'ready') {
      setIsReaderReady(true);
      setIsConfirmedEpub(true);
      setLoadingStage('Preparing pages...');
      if (progressState.pendingCfiRef.current) {
        const cfi = progressState.pendingCfiRef.current.replace(/"/g, '\\"');
        webViewRef.current?.injectJavaScript(`goToCfi("${cfi}"); true;`);
      }
      highlights.injectHighlights();
      return;
    }

    if (msgType === 'locationsReady') {
      setLocationsReady(true);
      setLoadingStage('Almost ready...');
      if (progressState.pendingCfiRef.current) {
        progressState.setIsNavigating(true);
        const cfi = progressState.pendingCfiRef.current.replace(/"/g, '\\"');
        webViewRef.current?.injectJavaScript(`goToCfi("${cfi}"); true;`);
        progressState.pendingCfiRef.current = null;
      } else if (progressState.savedPercent !== null && progressState.savedPercent > 0) {
        progressState.setIsNavigating(true);
        webViewRef.current?.injectJavaScript(`goToPercent(${progressState.savedPercent}); true;`);
        progressState.setSavedPercent(null);
      }
      return;
    }

    if (msgType === 'navigationComplete') {
      progressState.setIsNavigating(false);
      return;
    }

    if (msgType === 'styleChangeComplete') {
      return;
    }

    if (msgType === 'relocated') {
      if (data.cfi) progressState.setCurrentCfi(data.cfi as string);
      if (typeof data.progress === 'number' && data.progress >= 0) {
        const progressValue = Math.round(data.progress * 100);
        progressState.setProgress(progressValue / 100);
      }
      if (data.href) {
        const dataHref = data.href as string;
        const matchingTocItem = toc.find(t => {
          const tocHrefBase = t.href.split('#')[0];
          const dataHrefBase = dataHref.split('#')[0];
          return tocHrefBase === dataHrefBase || t.href === dataHref;
        });
        if (matchingTocItem) {
          setCurrentChapterHref(matchingTocItem.href);
        }
      }
      return;
    }

    if (msgType === 'toc') {
      setToc((data.items as TocItem[]) || []);
      return;
    }

    if (msgType === 'wrongFormat') {
      if (data.format === 'pdf') {
        router.replace(`/reader/pdf?itemId=${itemId}`);
      }
      return;
    }

    if (msgType === 'error') {
      if (__DEV__) {
        console.error('[EPUB Error]', data.message);
      }
      return;
    }

    if (msgType === 'textSelected') {
      highlights.setPendingHighlight({
        cfiRange: data.cfiRange as string,
        text: data.text as string,
      });
      highlights.setShowColorPicker(true);
      return;
    }

    if (msgType === 'highlightClicked') {
      const highlight = highlights.itemHighlights.find(h => h.cfiRange === data.cfiRange);
      if (highlight) {
        highlights.setSelectedHighlight(highlight);
        highlights.setNoteText(highlight.note || '');
        highlights.setShowNoteEditor(true);
      }
    }
  }, [injectEpubData, highlights, itemId, progressState, toc]);

  const handleThemeChange = useCallback((t: ReaderTheme) => {
    setTheme(t);
    setReaderSettings({ theme: t });
    setShowSettings(false);
    const colors = THEMES[t];
    webViewRef.current?.injectJavaScript(`setReaderThemeWithProgress("${colors.bg}", "${colors.text}", 0); true;`);
  }, [setReaderSettings]);

  const handleFontSizeChange = useCallback((delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    setFontSize(newSize);
    setReaderSettings({ fontSize: newSize });
    const colors = THEMES[theme];
    webViewRef.current?.injectJavaScript(`setFontSizeWithProgress(${newSize}, 0, "${colors.bg}", "${colors.text}"); true;`);
  }, [fontSize, setReaderSettings, theme]);

  const handleTocSelect = useCallback((href: string) => {
    const escapedHref = href.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`goToHref("${escapedHref}"); true;`);
    setCurrentChapterHref(href);
    setShowToc(false);
    setShowControls(false);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch {
      // Failed to start download
    }
  }, [item, activeServerId]);

  const themeColors = THEMES[theme];

  const getReaderHtml = useCallback(() => getEpubReaderHtml({
    backgroundColor: themeColors.bg,
    textColor: themeColors.text,
    fontSize,
    accentColor,
  }), [themeColors.bg, themeColors.text, fontSize, accentColor]);

  return {
    item,
    itemId,

    status: download.status,
    loadingStage,
    downloadProgress: download.downloadProgress,
    errorMsg: download.errorMsg,

    fileUri: download.fileUri,
    isReaderReady,
    isConfirmedEpub,
    locationsReady,
    isNavigating: progressState.isNavigating,

    showControls,
    setShowControls,
    showSettings,
    setShowSettings,
    showToc,
    setShowToc,
    showBookmarks: bookmarks.showBookmarks,
    setShowBookmarks: bookmarks.setShowBookmarks,
    showHighlights: highlights.showHighlights,
    setShowHighlights: highlights.setShowHighlights,
    showColorPicker: highlights.showColorPicker,
    setShowColorPicker: highlights.setShowColorPicker,
    showNoteEditor: highlights.showNoteEditor,
    setShowNoteEditor: highlights.setShowNoteEditor,

    theme,
    fontSize,
    progress: progressState.progress,

    toc,
    currentCfi: progressState.currentCfi,
    currentChapterHref,

    itemBookmarks: bookmarks.itemBookmarks,
    handleAddBookmark: bookmarks.handleAddBookmark,
    handleBookmarkPress: bookmarks.handleBookmarkPress,
    handleRemoveBookmark: bookmarks.handleRemoveBookmark,

    itemHighlights: highlights.itemHighlights,
    pendingHighlight: highlights.pendingHighlight,
    setPendingHighlight: highlights.setPendingHighlight,
    selectedHighlight: highlights.selectedHighlight,
    setSelectedHighlight: highlights.setSelectedHighlight,
    noteText: highlights.noteText,
    setNoteText: highlights.setNoteText,
    handleColorSelect: highlights.handleColorSelect,
    handleSaveNote: highlights.handleSaveNote,
    handleDeleteHighlight: highlights.handleDeleteHighlight,
    handleHighlightPress: highlights.handleHighlightPress,

    handleThemeChange,
    handleFontSizeChange,

    handleTocSelect,

    downloaded,
    isDownloading,
    handleDownload,

    webViewRef,
    handleMessage,
    getReaderHtml,

    accentColor,
    hideMedia,
    themeColors,
    progressPercent: progressState.progressPercent,
  };
}
