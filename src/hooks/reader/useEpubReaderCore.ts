import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore, type HighlightColor, type EbookHighlight } from '@/stores/readingProgressStore';
import { encryptionService, downloadManager } from '@/services';
import { getItem, getBookDownloadUrl, reportPlaybackProgress, generatePlaySessionId } from '@/api';
import {
  type ReaderTheme,
  type TocItem,
  type PendingHighlight,
  type EpubReaderCore,
  type UseEpubReaderCoreOptions,
  THEMES,
  HIGHLIGHT_COLORS,
} from './epub';
import { getEpubReaderHtml } from './epub/readerHtml';

export { type ReaderTheme, THEMES, HIGHLIGHT_COLORS, type TocItem, type PendingHighlight, type EpubReaderCore, type UseEpubReaderCoreOptions };

export function useEpubReaderCore({ itemId, startCfi }: UseEpubReaderCoreOptions): EpubReaderCore {
  const decodedStartCfi = startCfi ? decodeURIComponent(startCfi) : undefined;
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
  const updateProgressPercent = useReadingProgressStore((s) => s.updateProgressPercent);

  const [status, setStatus] = useState<'downloading' | 'ready' | 'error'>('downloading');
  const [loadingStage, setLoadingStage] = useState<string>('Connecting...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [isReaderReady, setIsReaderReady] = useState(false);
  const [isConfirmedEpub, setIsConfirmedEpub] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showToc, setShowToc] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>(savedSettings.theme);
  const [fontSize, setFontSize] = useState(savedSettings.fontSize);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [currentCfi, setCurrentCfi] = useState<string | null>(null);
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null);
  const [locationsReady, setLocationsReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [playSessionId] = useState(() => generatePlaySessionId());
  const pendingCfiRef = useRef<string | null>(null);
  const preservedCfiRef = useRef<string | null>(null);
  const isStyleChangingRef = useRef(false);

  const ebookBookmarks = useReadingProgressStore((s) => s.ebookBookmarks);
  const addEbookBookmark = useReadingProgressStore((s) => s.addEbookBookmark);
  const removeEbookBookmark = useReadingProgressStore((s) => s.removeEbookBookmark);

  const ebookHighlights = useReadingProgressStore((s) => s.ebookHighlights);
  const addHighlight = useReadingProgressStore((s) => s.addHighlight);
  const updateHighlight = useReadingProgressStore((s) => s.updateHighlight);
  const removeHighlight = useReadingProgressStore((s) => s.removeHighlight);

  const [showHighlights, setShowHighlights] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<EbookHighlight | null>(null);
  const [noteText, setNoteText] = useState('');

  const itemHighlights = useMemo(() =>
    ebookHighlights.filter(h => h.itemId === itemId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [ebookHighlights, itemId]
  );

  const itemBookmarks = useMemo(() =>
    ebookBookmarks.filter(b => b.itemId === itemId).sort((a, b) => a.progress - b.progress),
    [ebookBookmarks, itemId]
  );

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId!),
    enabled: !!userId && !!itemId,
  });

  useEffect(() => {
    let cancelled = false;

    const download = async () => {
      if (!itemId) return;

      const currentItemId = itemId;

      try {
        setStatus('downloading');
        setDownloadProgress(0);

        let localUri: string;

        const downloaded = getDownloadedItem(currentItemId);
        if (downloaded?.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(downloaded.localPath);
          if (fileInfo.exists) {
            setLoadingStage('Loading downloaded book...');
            setDownloadProgress(1);
            if (downloaded.localPath.endsWith('.enc')) {
              localUri = await encryptionService.getDecryptedUri(downloaded.localPath);
            } else {
              localUri = downloaded.localPath;
            }
          } else {
            localUri = await downloadToCache();
          }
        } else {
          localUri = await downloadToCache();
        }

        async function downloadToCache(): Promise<string> {
          const downloadUrl = getBookDownloadUrl(currentItemId);
          const cacheUri = `${FileSystem.cacheDirectory}book_${currentItemId}`;

          const fileInfo = await FileSystem.getInfoAsync(cacheUri);
          if (!fileInfo.exists) {
            setLoadingStage('Downloading...');

            const downloadResumable = FileSystem.createDownloadResumable(
              downloadUrl,
              cacheUri,
              {},
              (progress) => {
                const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
                setDownloadProgress(pct);
              }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result || result.status !== 200) {
              throw new Error(`Download failed: ${result?.status}`);
            }
          } else {
            setLoadingStage('Loading from cache...');
            setDownloadProgress(1);
          }

          return cacheUri;
        }

        if (cancelled) return;

        setLoadingStage('Reading file...');
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (cancelled) return;

        if (base64.startsWith('JVBERi')) {
          router.replace(`/reader/pdf?itemId=${currentItemId}`);
          return;
        }

        setLoadingStage('Opening book...');
        setFileUri(base64);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Download failed');
          setStatus('error');
        }
      }
    };

    download();
    return () => { cancelled = true; };
  }, [itemId, getDownloadedItem]);

  const [savedPercent, setSavedPercent] = useState<number | null>(null);

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
      const author = item.People?.find(p => p.Type === 'Author')?.Name;
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

  const injectEpubData = useCallback(() => {
    if (!fileUri || !webViewRef.current) return;

    const chunkSize = 500000;
    const chunks = [];
    for (let i = 0; i < fileUri.length; i += chunkSize) {
      chunks.push(fileUri.substring(i, i + chunkSize));
    }

    webViewRef.current.injectJavaScript(`window.epubBase64 = ""; true;`);

    chunks.forEach((chunk) => {
      const escaped = chunk.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      webViewRef.current?.injectJavaScript(`window.epubBase64 += "${escaped}"; true;`);
    });

    webViewRef.current.injectJavaScript(`initReaderWithData(); true;`);
  }, [fileUri]);

  const injectHighlights = useCallback(() => {
    itemHighlights.forEach(highlight => {
      const hexColor = HIGHLIGHT_COLORS[highlight.color];
      const escapedCfi = highlight.cfiRange.replace(/"/g, '\\"');
      webViewRef.current?.injectJavaScript(`addHighlightAnnotation("${escapedCfi}", "${hexColor}", "${highlight.id}"); true;`);
    });
  }, [itemHighlights]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'tap') {
        setShowControls(prev => !prev);
      } else if (data.type === 'webviewReady') {
        setLoadingStage('Parsing book...');
        injectEpubData();
      } else if (data.type === 'ready') {
        setIsReaderReady(true);
        setIsConfirmedEpub(true);
        setLoadingStage('Preparing pages...');
        if (pendingCfiRef.current) {
          webViewRef.current?.injectJavaScript(`goToCfi("${pendingCfiRef.current}"); true;`);
        }
        injectHighlights();
      } else if (data.type === 'locationsReady') {
        setLocationsReady(true);
        setLoadingStage('Almost ready...');
        if (pendingCfiRef.current) {
          setIsNavigating(true);
          webViewRef.current?.injectJavaScript(`goToCfi("${pendingCfiRef.current}"); true;`);
          pendingCfiRef.current = null;
        } else if (savedPercent !== null && savedPercent > 0) {
          setIsNavigating(true);
          webViewRef.current?.injectJavaScript(`lastKnownPercent = ${savedPercent}; goToPercent(${savedPercent}); true;`);
          setSavedPercent(null);
        }
      } else if (data.type === 'navigationComplete') {
        setIsNavigating(false);
        if (isStyleChangingRef.current && preservedCfiRef.current) {
          setCurrentCfi(preservedCfiRef.current);
          isStyleChangingRef.current = false;
        }
      } else if (data.type === 'styleChangeComplete') {
        if (data.cfi) {
          setCurrentCfi(data.cfi);
        }
        if (data.progress !== undefined) {
          const progressValue = Math.round(data.progress * 100);
          setProgress(progressValue / 100);
          if (itemId) {
            updateProgressPercent(itemId, progressValue);
          }
        }
        isStyleChangingRef.current = false;
        preservedCfiRef.current = null;
      } else if (data.type === 'relocated') {
        if (isStyleChangingRef.current) {
          return;
        }
        if (data.cfi) setCurrentCfi(data.cfi);
        if (data.progress !== undefined && data.progress >= 0) {
          const progressValue = Math.round(data.progress * 100);
          setProgress(progressValue / 100);
          if (itemId) {
            updateProgressPercent(itemId, progressValue);
          }
        }
      } else if (data.type === 'toc') {
        setToc(data.items || []);
      } else if (data.type === 'wrongFormat') {
        if (data.format === 'pdf') {
          router.replace(`/reader/pdf?itemId=${itemId}`);
        }
      } else if (data.type === 'error') {
        setErrorMsg(data.message);
      } else if (data.type === 'textSelected') {
        setPendingHighlight({
          cfiRange: data.cfiRange,
          text: data.text,
        });
        setShowColorPicker(true);
      } else if (data.type === 'highlightClicked') {
        const highlight = itemHighlights.find(h => h.cfiRange === data.cfiRange);
        if (highlight) {
          setSelectedHighlight(highlight);
          setNoteText(highlight.note || '');
          setShowNoteEditor(true);
        }
      }
    } catch (e) {
      // Message parse error
    }
  }, [injectEpubData, injectHighlights, itemHighlights, itemId, savedPercent, updateProgressPercent]);

  const handleThemeChange = useCallback((t: ReaderTheme) => {
    if (currentCfi) {
      preservedCfiRef.current = currentCfi;
    }
    isStyleChangingRef.current = true;
    setTheme(t);
    setReaderSettings({ theme: t });
    setShowSettings(false);
    const colors = THEMES[t];
    const progressToPreserve = progress;
    webViewRef.current?.injectJavaScript(`setReaderThemeWithProgress("${colors.bg}", "${colors.text}", ${progressToPreserve}); true;`);
  }, [currentCfi, progress, setReaderSettings]);

  const handleFontSizeChange = useCallback((delta: number) => {
    const newSize = Math.max(50, Math.min(200, fontSize + delta));
    if (currentCfi) {
      preservedCfiRef.current = currentCfi;
    }
    isStyleChangingRef.current = true;
    setFontSize(newSize);
    setReaderSettings({ fontSize: newSize });
    const progressToPreserve = progress;
    const colors = THEMES[theme];
    webViewRef.current?.injectJavaScript(`setFontSizeWithProgress(${newSize}, ${progressToPreserve}, "${colors.bg}", "${colors.text}"); true;`);
  }, [currentCfi, fontSize, progress, setReaderSettings, theme]);

  const handleTocSelect = useCallback((href: string) => {
    const escapedHref = href.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`goToHref("${escapedHref}"); true;`);
    setCurrentChapterHref(href);
    setShowToc(false);
    setShowControls(false);
  }, []);

  const handleAddBookmark = useCallback(() => {
    if (!currentCfi || !itemId) return;
    const progressPercent = Math.round(progress * 100);
    addEbookBookmark({
      itemId,
      bookTitle: item?.Name ?? 'Unknown Book',
      cfi: currentCfi,
      name: `Page ${progressPercent}%`,
      progress: progressPercent,
    });
  }, [currentCfi, itemId, progress, addEbookBookmark, item?.Name]);

  const handleBookmarkPress = useCallback((cfi: string) => {
    webViewRef.current?.injectJavaScript(`goToCfi("${cfi}"); true;`);
    setShowBookmarks(false);
  }, []);

  const handleRemoveBookmark = useCallback((id: string) => {
    removeEbookBookmark(id);
  }, [removeEbookBookmark]);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch (error) {
      // Failed to start download
    }
  }, [item, activeServerId]);

  const handleColorSelect = useCallback((color: HighlightColor) => {
    if (!pendingHighlight || !itemId) return;
    const id = addHighlight({
      itemId,
      cfiRange: pendingHighlight.cfiRange,
      text: pendingHighlight.text,
      color,
    });
    const hexColor = HIGHLIGHT_COLORS[color];
    const escapedCfi = pendingHighlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`addHighlightAnnotation("${escapedCfi}", "${hexColor}", "${id}"); true;`);
    setPendingHighlight(null);
    setShowColorPicker(false);
  }, [pendingHighlight, itemId, addHighlight]);

  const handleSaveNote = useCallback(() => {
    if (!selectedHighlight) return;
    updateHighlight(selectedHighlight.id, { note: noteText });
    setSelectedHighlight(null);
    setNoteText('');
    setShowNoteEditor(false);
  }, [selectedHighlight, noteText, updateHighlight]);

  const handleDeleteHighlight = useCallback((highlight: EbookHighlight) => {
    const escapedCfi = highlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`removeHighlightAnnotation("${escapedCfi}"); true;`);
    removeHighlight(highlight.id);
    setSelectedHighlight(null);
    setShowNoteEditor(false);
  }, [removeHighlight]);

  const handleHighlightPress = useCallback((highlight: EbookHighlight) => {
    const escapedCfi = highlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`goToCfi("${escapedCfi}"); true;`);
    setShowHighlights(false);
  }, []);

  const themeColors = THEMES[theme];
  const progressPercent = Math.round(progress * 100);

  const getReaderHtml = useCallback(() => getEpubReaderHtml({
    backgroundColor: themeColors.bg,
    textColor: themeColors.text,
    fontSize,
    accentColor,
  }), [themeColors.bg, themeColors.text, fontSize, accentColor]);

  return {
    item,
    itemId,

    status,
    loadingStage,
    downloadProgress,
    errorMsg,

    fileUri,
    isReaderReady,
    isConfirmedEpub,
    locationsReady,
    isNavigating,

    showControls,
    setShowControls,
    showSettings,
    setShowSettings,
    showToc,
    setShowToc,
    showBookmarks,
    setShowBookmarks,
    showHighlights,
    setShowHighlights,
    showColorPicker,
    setShowColorPicker,
    showNoteEditor,
    setShowNoteEditor,

    theme,
    fontSize,
    progress,

    toc,
    currentCfi,
    currentChapterHref,

    itemBookmarks,
    handleAddBookmark,
    handleBookmarkPress,
    handleRemoveBookmark,

    itemHighlights,
    pendingHighlight,
    setPendingHighlight,
    selectedHighlight,
    setSelectedHighlight,
    noteText,
    setNoteText,
    handleColorSelect,
    handleSaveNote,
    handleDeleteHighlight,
    handleHighlightPress,

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
    progressPercent,
  };
}
