import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Dimensions, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';
import {
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { useResponsive } from '@/hooks/useResponsive';
import { downloadManager, encryptionService } from '@/services';
import { getItem, getBookDownloadUrl, reportPlaybackProgress, generatePlaySessionId } from '@/api';
import {
  type PageMode,
  type ReadDirection,
  type FitMode,
  type PageAnimation,
  type ComicPage,
  type ComicReaderCore,
  type UseComicReaderCoreOptions,
  isImageFile,
  sortPagesByFilename,
  isCbrFile,
} from './comic/types';

export type { PageMode, ReadDirection, FitMode, PageAnimation, ComicPage, ComicReaderCore, UseComicReaderCoreOptions };

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function useComicReaderCore({ itemId }: UseComicReaderCoreOptions): ComicReaderCore {
  const responsive = useResponsive();

  const currentUser = useAuthStore((state) => state.currentUser);
  const activeServerId = useAuthStore((s) => s.activeServerId);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const getDownloadByItemId = useDownloadStore((s) => s.getDownloadByItemId);
  const userId = currentUser?.Id ?? '';

  const downloaded = getDownloadedItem(itemId ?? '');
  const downloadInProgress = getDownloadByItemId(itemId ?? '');
  const isDownloading = downloadInProgress?.status === 'downloading' || downloadInProgress?.status === 'pending';

  const [showControls, setShowControls] = useState(true);
  const [pageMode, setPageMode] = useState<PageMode>('single');
  const [readDirection, setReadDirection] = useState<ReadDirection>('ltr');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [fitMode, setFitMode] = useState<FitMode>('contain');
  const [pageAnimation, setPageAnimation] = useState<PageAnimation>('slide');
  const [showThumbnails, setShowThumbnails] = useState(false);

  const [status, setStatus] = useState<'downloading' | 'extracting' | 'ready' | 'error' | 'unsupported'>('downloading');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [extractProgress, setExtractProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [pages, setPages] = useState<ComicPage[]>([]);
  const [playSessionId] = useState(() => generatePlaySessionId());

  const fadeOpacity = useSharedValue(1);
  const flatListRef = useRef<FlatList>(null);
  const controlsOpacity = useSharedValue(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zoom state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId!),
    enabled: !!userId && !!itemId,
  });

  const totalPages = pages.length;

  // Load saved progress
  useEffect(() => {
    if (!itemId) return;
    const stored = useReadingProgressStore.getState().progress[itemId];
    if (stored?.position && typeof stored.position === 'number') {
      setCurrentPage(Math.max(0, Math.round(stored.position)));
    }
  }, [itemId]);

  // Download and extract comic
  useEffect(() => {
    let cancelled = false;

    const downloadAndExtract = async () => {
      if (!itemId || !item) return;

      const currentItemId = itemId;

      try {
        setStatus('downloading');
        setDownloadProgress(0);

        const filePath = item.MediaSources?.[0]?.Path ?? '';
        const container = (item.Container ?? item.MediaSources?.[0]?.Container ?? '').toLowerCase();

        if (isCbrFile(filePath) || container === 'rar' || container === 'cbr') {
          setStatus('unsupported');
          setErrorMsg('CBR (RAR) format is not currently supported. Please convert to CBZ format for best compatibility.');
          return;
        }

        let localUri: string;

        const downloaded = getDownloadedItem(currentItemId);
        if (downloaded?.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(downloaded.localPath);
          if (fileInfo.exists) {
            if (downloaded.localPath.endsWith('.enc')) {
              localUri = await encryptionService.getDecryptedUri(downloaded.localPath);
            } else {
              localUri = downloaded.localPath;
            }
            setDownloadProgress(1);
          } else {
            localUri = await downloadToCache();
          }
        } else {
          localUri = await downloadToCache();
        }

        async function downloadToCache(): Promise<string> {
          const downloadUrl = getBookDownloadUrl(currentItemId);
          const cacheUri = `${FileSystem.cacheDirectory}comic_${currentItemId}.cbz`;

          const fileInfo = await FileSystem.getInfoAsync(cacheUri);
          if (!fileInfo.exists) {
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
            setDownloadProgress(1);
          }

          return cacheUri;
        }

        if (cancelled) return;

        setStatus('extracting');
        setExtractProgress(0);

        const fileData = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (cancelled) return;

        const zip = new JSZip();
        const contents = await zip.loadAsync(fileData, { base64: true });

        const imageFiles: string[] = [];
        contents.forEach((relativePath, file) => {
          if (!file.dir && isImageFile(relativePath)) {
            imageFiles.push(relativePath);
          }
        });

        imageFiles.sort(sortPagesByFilename);

        if (imageFiles.length === 0) {
          throw new Error('No images found in the comic archive');
        }

        const extractDir = `${FileSystem.cacheDirectory}comic_${currentItemId}_pages/`;
        const dirInfo = await FileSystem.getInfoAsync(extractDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(extractDir, { intermediates: true });
        }

        const extractedPages: ComicPage[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          if (cancelled) return;

          const filename = imageFiles[i];
          const file = contents.file(filename);
          if (!file) continue;

          const basename = filename.split('/').pop() ?? filename;
          const pageUri = `${extractDir}${i.toString().padStart(4, '0')}_${basename}`;

          const pageInfo = await FileSystem.getInfoAsync(pageUri);
          if (!pageInfo.exists) {
            const imageData = await file.async('base64');
            await FileSystem.writeAsStringAsync(pageUri, imageData, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }

          extractedPages.push({
            index: i,
            filename: basename,
            uri: pageUri,
          });

          setExtractProgress((i + 1) / imageFiles.length);
        }

        if (cancelled) return;

        setPages(extractedPages);
        setStatus('ready');
      } catch (err) {
        console.error('Comic load error:', err);
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load comic');
          setStatus('error');
        }
      }
    };

    downloadAndExtract();
    return () => { cancelled = true; };
  }, [itemId, item, getDownloadedItem]);

  // Save progress
  useEffect(() => {
    if (!item || totalPages === 0) return;

    const author = item.People?.find(p => p.Type === 'Author')?.Name
      ?? item.People?.find(p => p.Type === 'Writer')?.Name;

    useReadingProgressStore.getState().updateProgress(item.Id, {
      itemId: item.Id,
      itemName: item.Name ?? 'Unknown',
      itemType: 'Book',
      coverImageTag: item.ImageTags?.Primary,
      author,
      position: currentPage,
      total: totalPages,
    });

    // Sync progress to Jellyfin server
    const totalTicks = item.RunTimeTicks || 10000000000;
    const positionTicks = Math.round(totalTicks * ((currentPage + 1) / totalPages));
    reportPlaybackProgress({
      ItemId: item.Id,
      MediaSourceId: item.Id,
      PositionTicks: positionTicks,
      IsPaused: true,
      IsMuted: false,
      PlaySessionId: playSessionId,
    }).catch(() => {});
  }, [item, currentPage, totalPages, playSessionId]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        controlsOpacity.value = withTiming(0, { duration: 200 });
        setShowControls(false);
      }, 3000);
    }
  }, [showControls, controlsOpacity]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls, resetControlsTimeout]);

  const handleClose = useCallback(() => {
    const { dismissModal } = require('@/utils');
    dismissModal();
  }, []);

  const toggleControls = useCallback(() => {
    const newValue = !showControls;
    controlsOpacity.value = withTiming(newValue ? 1 : 0, { duration: 200 });
    setShowControls(newValue);
    if (showSettings) setShowSettings(false);
  }, [showControls, showSettings, controlsOpacity]);

  const goToPage = useCallback((page: number, animated: boolean = true) => {
    if (totalPages === 0) return;
    const targetPage = Math.max(0, Math.min(totalPages - 1, page));

    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;

    if (pageAnimation === 'fade' && animated) {
      fadeOpacity.value = withTiming(0, { duration: 150 }, () => {
        runOnJS(setCurrentPage)(targetPage);
        fadeOpacity.value = withTiming(1, { duration: 150 });
      });
    } else {
      setCurrentPage(targetPage);
    }

    const useAnimation = animated && pageAnimation === 'slide';
    flatListRef.current?.scrollToIndex({ index: targetPage, animated: useAnimation });
  }, [totalPages, scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY, pageAnimation, fadeOpacity]);

  const handlePrevPage = useCallback(() => {
    if (readDirection === 'rtl') {
      goToPage(currentPage + 1);
    } else {
      goToPage(currentPage - 1);
    }
  }, [readDirection, currentPage, goToPage]);

  const handleNextPage = useCallback(() => {
    if (readDirection === 'rtl') {
      goToPage(currentPage - 1);
    } else {
      goToPage(currentPage + 1);
    }
  }, [readDirection, currentPage, goToPage]);

  const handleDownload = useCallback(async () => {
    if (!item || !activeServerId) return;
    try {
      await downloadManager.startDownload(item, activeServerId);
    } catch (error) {
      console.error('Failed to start download:', error);
    }
  }, [item, activeServerId]);

  const handleScrollEnd = useCallback((index: number) => {
    setCurrentPage(index);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  // Pinch-to-zoom gesture
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = Math.max(1, Math.min(savedScale.value * event.scale, 5));
    })
    .onEnd(() => {
      if (scale.value < 1.1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for panning when zoomed
  const panGesture = Gesture.Pan()
    .enabled(true)
    .minPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      if (scale.value > 1) {
        const maxTranslateX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, savedTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, savedTranslateY.value + event.translationY)
        );
      }
    })
    .onEnd((event) => {
      // If not zoomed and horizontal swipe, change page
      if (scale.value <= 1.1) {
        const velocityThreshold = 500;
        const translationThreshold = SCREEN_WIDTH * 0.2;

        if (Math.abs(event.velocityX) > velocityThreshold || Math.abs(event.translationX) > translationThreshold) {
          if (event.translationX > 0) {
            runOnJS(handlePrevPage)();
          } else {
            runOnJS(handleNextPage)();
          }
        }
      }
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Tap gesture for controls and navigation
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd((event) => {
      if (scale.value > 1.1) {
        // When zoomed, only toggle controls
        runOnJS(toggleControls)();
        return;
      }

      const tapX = event.x;
      const leftZone = SCREEN_WIDTH * 0.25;
      const rightZone = SCREEN_WIDTH * 0.75;

      if (tapX < leftZone) {
        runOnJS(handlePrevPage)();
      } else if (tapX > rightZone) {
        runOnJS(handleNextPage)();
      } else {
        runOnJS(toggleControls)();
      }
    });

  // Double tap to zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (scale.value > 1) {
        // Reset zoom
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to 2.5x at tap location
        const newScale = 2.5;
        scale.value = withSpring(newScale);
        savedScale.value = newScale;

        // Calculate offset to zoom towards tap point
        const offsetX = (SCREEN_WIDTH / 2 - event.x) * (newScale - 1);
        const offsetY = (SCREEN_HEIGHT / 2 - event.y) * (newScale - 1);

        const maxTranslateX = (SCREEN_WIDTH * (newScale - 1)) / 2;
        const maxTranslateY = (SCREEN_HEIGHT * (newScale - 1)) / 2;

        translateX.value = withSpring(Math.max(-maxTranslateX, Math.min(maxTranslateX, offsetX)));
        translateY.value = withSpring(Math.max(-maxTranslateY, Math.min(maxTranslateY, offsetY)));
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  // Combine gestures
  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Exclusive(doubleTapGesture, Gesture.Simultaneous(panGesture, tapGesture))
  );

  const getContentFit = useCallback((): 'contain' | 'cover' | 'fill' => {
    switch (fitMode) {
      case 'width':
        return 'fill';
      case 'height':
        return 'fill';
      case 'cover':
        return 'cover';
      default:
        return 'contain';
    }
  }, [fitMode]);

  const getImageStyle = useCallback(() => {
    const baseStyle = {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    };

    if (fitMode === 'width') {
      return { ...baseStyle, height: undefined };
    }
    if (fitMode === 'height') {
      return { ...baseStyle, width: undefined };
    }
    return baseStyle;
  }, [fitMode]);

  const isDoublePageMode = pageMode === 'double' && responsive.isTablet && responsive.isLandscape;

  const doublePageData = useMemo(() => {
    if (!isDoublePageMode) return pages;
    const paired: ComicPage[][] = [];
    for (let i = 0; i < pages.length; i += 2) {
      if (i + 1 < pages.length) {
        paired.push([pages[i], pages[i + 1]]);
      } else {
        paired.push([pages[i]]);
      }
    }
    return paired;
  }, [pages, isDoublePageMode]);

  const progressPercent = totalPages > 0 ? Math.round(((currentPage + 1) / totalPages) * 100) : 0;

  return {
    // Item data
    item,
    itemId,

    // Status
    status,
    downloadProgress,
    extractProgress,
    errorMsg,

    // Pages
    pages,
    totalPages,
    currentPage,
    progressPercent,

    // UI state
    showControls,
    setShowControls,
    showSettings,
    setShowSettings,
    showThumbnails,
    setShowThumbnails,

    // Settings
    pageMode,
    setPageMode,
    readDirection,
    setReadDirection,
    fitMode,
    setFitMode,
    pageAnimation,
    setPageAnimation,

    // Navigation
    goToPage,
    handlePrevPage,
    handleNextPage,
    toggleControls,

    // Download
    downloaded,
    isDownloading,
    handleDownload,

    // Animations
    controlsOpacity,
    scale,
    savedScale,
    translateX,
    translateY,
    savedTranslateX,
    savedTranslateY,
    fadeOpacity,

    // Gestures
    composedGestures,

    // Refs
    flatListRef,

    // Double page mode
    isDoublePageMode,
    doublePageData,

    // Responsive
    responsive,

    // Misc
    accentColor,
    handleClose,
    handleScrollEnd,

    // Content styling
    getContentFit,
    getImageStyle,
  };
}
