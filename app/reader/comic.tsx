import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  StyleSheet,
  FlatList,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import JSZip from 'jszip';
import { useAuthStore, useSettingsStore, useDownloadStore } from '@/stores';
import { useReadingProgressStore } from '@/stores/readingProgressStore';
import { useResponsive } from '@/hooks/useResponsive';
import { downloadManager, encryptionService } from '@/services';
import { getItem, getBookDownloadUrl, reportPlaybackProgress, generatePlaySessionId } from '@/api';
import { dismissModal } from '@/utils';

type PageMode = 'single' | 'double' | 'webtoon';
type ReadDirection = 'ltr' | 'rtl';
type FitMode = 'contain' | 'width' | 'height' | 'cover';
type PageAnimation = 'none' | 'slide' | 'fade';

interface ComicPage {
  index: number;
  filename: string;
  uri: string;
  width?: number;
  height?: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const THUMBNAIL_SIZE = 80;

function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function sortPagesByFilename(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function isCbrFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.cbr') || lower.endsWith('.rar');
}

function isCbzFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.cbz') || lower.endsWith('.zip');
}

export default function ComicReaderScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const insets = useSafeAreaInsets();
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

  const pageTransition = useSharedValue(0);
  const fadeOpacity = useSharedValue(1);

  const flatListRef = useRef<FlatList>(null);
  const controlsOpacity = useSharedValue(1);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Zoom state for each page
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const { data: item } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
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

  useEffect(() => {
    let cancelled = false;

    const downloadAndExtract = async () => {
      if (!itemId || !item) return;

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

        const downloaded = getDownloadedItem(itemId);
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
          const downloadUrl = getBookDownloadUrl(itemId);
          const cacheUri = `${FileSystem.cacheDirectory}comic_${itemId}.cbz`;

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

        const extractDir = `${FileSystem.cacheDirectory}comic_${itemId}_pages/`;
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

  const handleClose = () => {
    dismissModal();
  };

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

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

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

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: fadeOpacity.value,
  }));

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
      return { ...baseStyle, height: undefined, aspectRatio: undefined };
    }
    if (fitMode === 'height') {
      return { ...baseStyle, width: undefined, aspectRatio: undefined };
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

  const renderSinglePage = useCallback(({ item: page }: { item: ComicPage }) => (
    <View
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      className="items-center justify-center bg-black"
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.pageContainer, animatedImageStyle]}>
          <Image
            source={{ uri: page.uri }}
            style={getImageStyle()}
            contentFit={getContentFit()}
            transition={100}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  ), [composedGestures, animatedImageStyle, getContentFit, getImageStyle]);

  const renderDoublePage = useCallback(({ item: pagePair }: { item: ComicPage[] }) => (
    <View
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, flexDirection: 'row' }}
      className="items-center justify-center bg-black"
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.doublePageContainer, animatedImageStyle]}>
          {pagePair.map((page, idx) => (
            <Image
              key={page.index}
              source={{ uri: page.uri }}
              style={{
                width: pagePair.length === 1 ? SCREEN_WIDTH : SCREEN_WIDTH / 2,
                height: SCREEN_HEIGHT,
              }}
              contentFit="contain"
              transition={100}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  ), [composedGestures, animatedImageStyle]);

  const renderPage = isDoublePageMode ? renderDoublePage : renderSinglePage;

  const renderThumbnail = useCallback(({ item: page, index }: { item: ComicPage; index: number }) => (
    <Pressable
      onPress={() => {
        goToPage(index, false);
        setShowThumbnails(false);
      }}
      style={[
        styles.thumbnailContainer,
        currentPage === index && { borderColor: accentColor, borderWidth: 2 },
      ]}
    >
      <Image
        source={{ uri: page.uri }}
        style={styles.thumbnailImage}
        contentFit="cover"
        transition={50}
      />
      <Text style={styles.thumbnailText}>{index + 1}</Text>
    </Pressable>
  ), [currentPage, accentColor, goToPage]);

  const progressPercent = totalPages > 0 ? Math.round(((currentPage + 1) / totalPages) * 100) : 0;

  // Loading state
  if (status === 'downloading' || status === 'extracting') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.loadingText}>
            {status === 'downloading' ? 'Downloading comic...' : 'Extracting pages...'}
          </Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(status === 'downloading' ? downloadProgress : extractProgress) * 100}%`,
                    backgroundColor: accentColor,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round((status === 'downloading' ? downloadProgress : extractProgress) * 100)}%
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
          <Text style={styles.errorText}>Failed to load comic</Text>
          <Text style={styles.errorSubtext}>{errorMsg}</Text>
          <Pressable onPress={handleClose} style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (status === 'unsupported') {
    return (
      <View style={styles.container}>
        <StatusBar hidden />
        <View style={styles.center}>
          <Ionicons name="document-text-outline" size={64} color="#f59e0b" />
          <Text style={styles.errorText}>Format Not Supported</Text>
          <Text style={styles.errorSubtext}>{errorMsg}</Text>
          <View style={styles.unsupportedInfo}>
            <Text style={styles.unsupportedInfoTitle}>Why CBZ instead of CBR?</Text>
            <Text style={styles.unsupportedInfoText}>
              CBZ files use ZIP compression which is widely supported. CBR files use RAR compression which requires proprietary libraries.
            </Text>
            <Text style={styles.unsupportedInfoText}>
              You can convert CBR to CBZ using tools like Calibre, ComicRack, or online converters.
            </Text>
          </View>
          <Pressable onPress={handleClose} style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const flatListData = isDoublePageMode ? doublePageData : pages;

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar hidden />

      <FlatList
        ref={flatListRef}
        data={flatListData as any}
        renderItem={renderPage as any}
        keyExtractor={(item: any, index) =>
          isDoublePageMode ? `spread-${index}` : `page-${item.index}`
        }
        horizontal={pageMode !== 'webtoon'}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scale.value <= 1.1}
        onMomentumScrollEnd={(e) => {
          const index =
            pageMode === 'webtoon'
              ? Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT)
              : Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
          setCurrentPage(index);
          scale.value = 1;
          savedScale.value = 1;
          translateX.value = 0;
          translateY.value = 0;
          savedTranslateX.value = 0;
          savedTranslateY.value = 0;
        }}
        inverted={readDirection === 'rtl' && pageMode !== 'webtoon'}
        getItemLayout={(_, index) => ({
          length: pageMode === 'webtoon' ? SCREEN_HEIGHT : SCREEN_WIDTH,
          offset: (pageMode === 'webtoon' ? SCREEN_HEIGHT : SCREEN_WIDTH) * index,
          index,
        })}
        initialScrollIndex={currentPage}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
      />

      {/* Controls overlay */}
      <Animated.View
        style={[styles.controlsOverlay, controlsStyle]}
        pointerEvents={showControls ? 'auto' : 'none'}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable onPress={handleClose} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {item?.Name ?? 'Loading...'}
          </Text>
          <Pressable onPress={() => setShowSettings(!showSettings)} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </Pressable>
          <Pressable
            onPress={handleDownload}
            disabled={!!downloaded || isDownloading}
            style={styles.headerBtn}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : downloaded ? (
              <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
            ) : (
              <Ionicons name="download-outline" size={22} color="#fff" />
            )}
          </Pressable>
        </View>

        {showSettings && (
          <ScrollView
            style={[styles.settingsPanel, { top: insets.top + 56, maxHeight: SCREEN_HEIGHT * 0.7 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.settingsTitle}>Reader Settings</Text>

            <Text style={styles.settingsLabel}>Page Mode</Text>
            <View style={styles.settingsRow}>
              {(['single', 'double', 'webtoon'] as PageMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setPageMode(mode)}
                  style={[
                    styles.settingsOption,
                    pageMode === mode && { backgroundColor: accentColor },
                    mode === 'double' && !responsive.isTablet && styles.settingsOptionDisabled,
                  ]}
                  disabled={mode === 'double' && !responsive.isTablet}
                >
                  <Text style={[
                    styles.settingsOptionText,
                    mode === 'double' && !responsive.isTablet && { color: '#666' },
                  ]}>
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>
            {pageMode === 'double' && !responsive.isLandscape && (
              <Text style={styles.settingsHint}>Rotate to landscape for double page view</Text>
            )}

            <Text style={styles.settingsLabel}>Fit Mode</Text>
            <View style={styles.settingsRow}>
              {([
                { key: 'contain', label: 'Fit Screen' },
                { key: 'width', label: 'Fit Width' },
                { key: 'height', label: 'Fit Height' },
                { key: 'cover', label: 'Fill' },
              ] as { key: FitMode; label: string }[]).map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => setFitMode(key)}
                  style={[
                    styles.settingsOption,
                    fitMode === key && { backgroundColor: accentColor },
                  ]}
                >
                  <Text style={styles.settingsOptionText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Page Animation</Text>
            <View style={styles.settingsRow}>
              {([
                { key: 'slide', label: 'Slide' },
                { key: 'fade', label: 'Fade' },
                { key: 'none', label: 'None' },
              ] as { key: PageAnimation; label: string }[]).map(({ key, label }) => (
                <Pressable
                  key={key}
                  onPress={() => setPageAnimation(key)}
                  style={[
                    styles.settingsOption,
                    pageAnimation === key && { backgroundColor: accentColor },
                  ]}
                >
                  <Text style={styles.settingsOptionText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.settingsLabel}>Read Direction</Text>
            <View style={styles.settingsRow}>
              <Pressable
                onPress={() => setReadDirection('ltr')}
                style={[
                  styles.settingsOption,
                  { flex: 1 },
                  readDirection === 'ltr' && { backgroundColor: accentColor },
                ]}
              >
                <Text style={styles.settingsOptionText}>Left to Right</Text>
              </Pressable>
              <Pressable
                onPress={() => setReadDirection('rtl')}
                style={[
                  styles.settingsOption,
                  { flex: 1 },
                  readDirection === 'rtl' && { backgroundColor: accentColor },
                ]}
              >
                <Text style={styles.settingsOptionText}>Right to Left</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.footerRow}>
            <Pressable
              onPress={handlePrevPage}
              disabled={currentPage === 0}
              style={[styles.navButton, currentPage === 0 && styles.navButtonDisabled]}
            >
              <Ionicons
                name={readDirection === 'rtl' ? 'chevron-forward' : 'chevron-back'}
                size={24}
                color={currentPage === 0 ? '#666' : '#fff'}
              />
            </Pressable>
            <Pressable onPress={() => setShowThumbnails(true)} style={styles.pageInfoBtn}>
              <Text style={styles.pageInfo}>
                {currentPage + 1} / {totalPages}
              </Text>
              <Ionicons name="grid-outline" size={16} color="#fff" style={{ marginLeft: 6 }} />
            </Pressable>
            <Pressable
              onPress={handleNextPage}
              disabled={currentPage === totalPages - 1}
              style={[styles.navButton, currentPage === totalPages - 1 && styles.navButtonDisabled]}
            >
              <Ionicons
                name={readDirection === 'rtl' ? 'chevron-back' : 'chevron-forward'}
                size={24}
                color={currentPage === totalPages - 1 ? '#666' : '#fff'}
              />
            </Pressable>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
            />
          </View>
        </View>
      </Animated.View>

      <Modal
        visible={showThumbnails}
        animationType="slide"
        transparent
        onRequestClose={() => setShowThumbnails(false)}
      >
        <View style={styles.thumbnailModal}>
          <View style={[styles.thumbnailHeader, { paddingTop: insets.top }]}>
            <Text style={styles.thumbnailTitle}>Pages</Text>
            <Pressable onPress={() => setShowThumbnails(false)} style={styles.thumbnailClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>
          {pages.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator color={accentColor} />
            </View>
          ) : (
            <FlatList
              key={`thumbnails-${itemId}-${pages.length}`}
              data={pages.filter((page): page is ComicPage => page != null && page.index != null)}
              renderItem={renderThumbnail}
              keyExtractor={(page, index) => `thumb-${page.index}-${index}`}
              numColumns={4}
              contentContainerStyle={styles.thumbnailGrid}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.max(0, Math.floor(currentPage / 4) * 4)}
              getItemLayout={(_, index) => ({
                length: THUMBNAIL_SIZE + 28,
                offset: (THUMBNAIL_SIZE + 28) * Math.floor(index / 4),
                index,
              })}
              onScrollToIndexFailed={() => {}}
              initialNumToRender={16}
              maxToRenderPerBatch={16}
              windowSize={5}
            />
          )}
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  progressContainer: {
    marginTop: 24,
    width: 200,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 4,
  },
  settingsPanel: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    width: 260,
    zIndex: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
    marginTop: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  settingsOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  settingsOptionText: {
    fontSize: 14,
    color: '#fff',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  pageInfo: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    minWidth: 80,
    textAlign: 'center',
  },
  pageInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  doublePageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsOptionDisabled: {
    opacity: 0.4,
  },
  settingsHint: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
  },
  unsupportedInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    maxWidth: 320,
  },
  unsupportedInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  unsupportedInfoText: {
    fontSize: 13,
    color: '#aaa',
    lineHeight: 20,
    marginBottom: 8,
  },
  thumbnailModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  thumbnailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  thumbnailClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailGrid: {
    padding: 8,
  },
  thumbnailContainer: {
    flex: 1,
    margin: 4,
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnailImage: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.4,
    borderRadius: 6,
  },
  thumbnailText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginBottom: 4,
  },
});
