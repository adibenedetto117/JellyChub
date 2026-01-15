import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { ComicReaderCore, ComicPage, FitMode } from '@/hooks';

interface DesktopComicReaderProps {
  core: ComicReaderCore;
}

type DesktopFitMode = 'width' | 'height' | 'original';

const SIDEBAR_WIDTH = 200;
const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 220;

export function DesktopComicReader({ core }: DesktopComicReaderProps) {
  const {
    item,
    status,
    downloadProgress,
    extractProgress,
    errorMsg,
    pages,
    totalPages,
    currentPage,
    progressPercent,
    showControls,
    setShowControls,
    readDirection,
    setReadDirection,
    goToPage,
    handlePrevPage,
    handleNextPage,
    downloaded,
    isDownloading,
    handleDownload,
    accentColor,
    handleClose,
  } = core;

  const [showSidebar, setShowSidebar] = useState(true);
  const [desktopFitMode, setDesktopFitMode] = useState<DesktopFitMode>('width');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const controlsOpacity = useSharedValue(1);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const thumbnailScrollRef = useRef<ScrollView>(null);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });

    controlsTimeout.current = setTimeout(() => {
      if (!showSidebar && !showSettingsMenu) {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 200 });
      }
    }, 3000);
  }, [showSidebar, showSettingsMenu, setShowControls, controlsOpacity]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (readDirection === 'rtl') {
            handleNextPage();
          } else {
            handlePrevPage();
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (readDirection === 'rtl') {
            handlePrevPage();
          } else {
            handleNextPage();
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          goToPage(currentPage - 1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          goToPage(currentPage + 1);
          break;
        case 'Home':
          e.preventDefault();
          goToPage(0);
          break;
        case 'End':
          e.preventDefault();
          goToPage(totalPages - 1);
          break;
        case 'PageUp':
          e.preventDefault();
          goToPage(Math.max(0, currentPage - 10));
          break;
        case 'PageDown':
          e.preventDefault();
          goToPage(Math.min(totalPages - 1, currentPage + 10));
          break;
        case ' ':
          e.preventDefault();
          handleNextPage();
          break;
        case 'Escape':
          e.preventDefault();
          if (showSettingsMenu) {
            setShowSettingsMenu(false);
          } else {
            handleClose();
          }
          break;
        case 's':
        case 'S':
          e.preventDefault();
          setShowSidebar(!showSidebar);
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          cycleFitMode();
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          setReadDirection(readDirection === 'ltr' ? 'rtl' : 'ltr');
          break;
        case '+':
        case '=':
          e.preventDefault();
          setZoomLevel(Math.min(200, zoomLevel + 10));
          break;
        case '-':
          e.preventDefault();
          setZoomLevel(Math.max(25, zoomLevel - 10));
          break;
        case '0':
          e.preventDefault();
          setZoomLevel(100);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const percent = parseInt(e.key) * 10;
            const targetPage = Math.floor((totalPages * percent) / 100);
            goToPage(targetPage);
          }
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePrevPage,
    handleNextPage,
    goToPage,
    currentPage,
    totalPages,
    handleClose,
    showSidebar,
    showSettingsMenu,
    readDirection,
    setReadDirection,
    zoomLevel,
    resetControlsTimeout,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = () => resetControlsTimeout();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resetControlsTimeout]);

  const cycleFitMode = useCallback(() => {
    const modes: DesktopFitMode[] = ['width', 'height', 'original'];
    const currentIndex = modes.indexOf(desktopFitMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setDesktopFitMode(modes[nextIndex]);
  }, [desktopFitMode]);

  const scrollToThumbnail = useCallback((pageIndex: number) => {
    if (thumbnailScrollRef.current) {
      const offset = pageIndex * (THUMBNAIL_HEIGHT + 12) - 100;
      thumbnailScrollRef.current.scrollTo({ y: Math.max(0, offset), animated: true });
    }
  }, []);

  useEffect(() => {
    scrollToThumbnail(currentPage);
  }, [currentPage, scrollToThumbnail]);

  const handleThumbnailClick = useCallback((pageIndex: number) => {
    goToPage(pageIndex, false);
  }, [goToPage]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel(Math.min(200, zoomLevel + 10));
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(Math.max(25, zoomLevel - 10));
  }, [zoomLevel]);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const getImageDimensions = useCallback(() => {
    const baseWidth = 800;
    const baseHeight = 1200;
    const scaleFactor = zoomLevel / 100;

    switch (desktopFitMode) {
      case 'width':
        return {
          width: '100%' as const,
          maxWidth: baseWidth * scaleFactor,
          height: 'auto' as const,
        };
      case 'height':
        return {
          width: 'auto' as const,
          height: '100%' as const,
          maxHeight: baseHeight * scaleFactor,
        };
      case 'original':
        return {
          width: baseWidth * scaleFactor,
          height: baseHeight * scaleFactor,
        };
      default:
        return {
          width: '100%' as const,
          maxWidth: baseWidth * scaleFactor,
          height: 'auto' as const,
        };
    }
  }, [desktopFitMode, zoomLevel]);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const renderThumbnail = useCallback((page: ComicPage) => {
    const isActive = page.index === currentPage;
    return (
      <Pressable
        key={page.index}
        onPress={() => handleThumbnailClick(page.index)}
        style={[
          styles.thumbnailItem,
          isActive && { borderColor: accentColor, borderWidth: 3 },
        ]}
      >
        <Image
          source={{ uri: page.uri }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={50}
        />
        <View style={[styles.thumbnailNumber, isActive && { backgroundColor: accentColor }]}>
          <Text style={styles.thumbnailNumberText}>{page.index + 1}</Text>
        </View>
      </Pressable>
    );
  }, [currentPage, accentColor, handleThumbnailClick]);

  if (status === 'downloading' || status === 'extracting') {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
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
        <View style={styles.loadingContainer}>
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
        <View style={styles.loadingContainer}>
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

  const currentPageData = pages[currentPage];

  return (
    <View style={styles.container}>
      <View style={styles.mainContent}>
        {showSidebar && (
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Pages</Text>
              <Pressable onPress={() => setShowSidebar(false)} style={styles.sidebarCloseBtn}>
                <Ionicons name="close" size={20} color="#888" />
              </Pressable>
            </View>
            <ScrollView
              ref={thumbnailScrollRef}
              style={styles.thumbnailList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.thumbnailListContent}
            >
              {pages.map(renderThumbnail)}
            </ScrollView>
          </View>
        )}

        <View style={styles.readerArea}>
          <ScrollView
            ref={mainScrollRef}
            style={styles.pageScroll}
            contentContainerStyle={styles.pageScrollContent}
            showsVerticalScrollIndicator={true}
            showsHorizontalScrollIndicator={true}
          >
            {currentPageData && (
              <View style={styles.pageContainer}>
                <Image
                  source={{ uri: currentPageData.uri }}
                  style={[
                    styles.pageImage,
                    desktopFitMode === 'original' && {
                      width: 800 * (zoomLevel / 100),
                      height: 1200 * (zoomLevel / 100),
                    },
                  ]}
                  contentFit={desktopFitMode === 'original' ? 'fill' : 'contain'}
                  transition={100}
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.pageNavigation}>
            <Pressable
              onPress={handlePrevPage}
              disabled={currentPage === 0}
              style={[styles.pageNavButton, currentPage === 0 && styles.pageNavButtonDisabled]}
            >
              <Ionicons
                name={readDirection === 'rtl' ? 'chevron-forward' : 'chevron-back'}
                size={32}
                color={currentPage === 0 ? '#444' : '#fff'}
              />
            </Pressable>
            <Pressable
              onPress={handleNextPage}
              disabled={currentPage === totalPages - 1}
              style={[styles.pageNavButton, currentPage === totalPages - 1 && styles.pageNavButtonDisabled]}
            >
              <Ionicons
                name={readDirection === 'rtl' ? 'chevron-back' : 'chevron-forward'}
                size={32}
                color={currentPage === totalPages - 1 ? '#444' : '#fff'}
              />
            </Pressable>
          </View>
        </View>
      </View>

      <Animated.View style={[styles.controlsOverlay, controlsStyle]} pointerEvents={showControls ? 'auto' : 'none'}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent']}
          style={styles.topGradient}
        />

        <View style={styles.header}>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>

          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>{item?.Name ?? 'Loading...'}</Text>
            <Text style={styles.pageIndicator}>
              Page {currentPage + 1} of {totalPages}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              onPress={() => setShowSidebar(!showSidebar)}
              style={[styles.headerButton, showSidebar && { backgroundColor: accentColor }]}
            >
              <Ionicons name="albums-outline" size={20} color="#fff" />
            </Pressable>

            <Pressable onPress={() => setShowSettingsMenu(!showSettingsMenu)} style={styles.headerButton}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </Pressable>

            <Pressable
              onPress={handleDownload}
              disabled={!!downloaded || isDownloading}
              style={styles.headerButton}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : downloaded ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        </View>

        {showSettingsMenu && (
          <View style={styles.settingsMenu}>
            <Text style={styles.settingsTitle}>Reader Settings</Text>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Fit Mode</Text>
              <View style={styles.settingsRow}>
                {(['width', 'height', 'original'] as DesktopFitMode[]).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => setDesktopFitMode(mode)}
                    style={[
                      styles.settingsOption,
                      desktopFitMode === mode && { backgroundColor: accentColor },
                    ]}
                  >
                    <Text style={styles.settingsOptionText}>
                      {mode === 'width' ? 'Fit Width' : mode === 'height' ? 'Fit Height' : 'Original'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Reading Direction</Text>
              <View style={styles.settingsRow}>
                <Pressable
                  onPress={() => setReadDirection('ltr')}
                  style={[
                    styles.settingsOption,
                    { flex: 1 },
                    readDirection === 'ltr' && { backgroundColor: accentColor },
                  ]}
                >
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginRight: 6 }} />
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
                  <Ionicons name="arrow-back" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.settingsOptionText}>Right to Left</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsLabel}>Zoom: {zoomLevel}%</Text>
              <View style={styles.zoomControls}>
                <Pressable onPress={handleZoomOut} style={styles.zoomButton}>
                  <Ionicons name="remove" size={20} color="#fff" />
                </Pressable>
                <View style={styles.zoomTrack}>
                  <View
                    style={[
                      styles.zoomFill,
                      { width: `${((zoomLevel - 25) / 175) * 100}%`, backgroundColor: accentColor },
                    ]}
                  />
                </View>
                <Pressable onPress={handleZoomIn} style={styles.zoomButton}>
                  <Ionicons name="add" size={20} color="#fff" />
                </Pressable>
                <Pressable onPress={handleResetZoom} style={styles.zoomResetButton}>
                  <Text style={styles.zoomResetText}>Reset</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.keyboardHints}>
              <Text style={styles.keyboardHintsTitle}>Keyboard Shortcuts</Text>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>Arrow Left/Right</Text>
                <Text style={styles.keyboardHintText}>Previous/Next page</Text>
              </View>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>Home/End</Text>
                <Text style={styles.keyboardHintText}>First/Last page</Text>
              </View>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>S</Text>
                <Text style={styles.keyboardHintText}>Toggle sidebar</Text>
              </View>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>F</Text>
                <Text style={styles.keyboardHintText}>Cycle fit mode</Text>
              </View>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>R</Text>
                <Text style={styles.keyboardHintText}>Toggle direction</Text>
              </View>
              <View style={styles.keyboardHintRow}>
                <Text style={styles.keyboardKey}>+/-/0</Text>
                <Text style={styles.keyboardHintText}>Zoom in/out/reset</Text>
              </View>
            </View>
          </View>
        )}

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomGradient}
        />

        <View style={styles.bottomControls}>
          <View style={styles.progressBar}>
            <View
              style={[styles.progressBarFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
            />
          </View>
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomInfoText}>
              {readDirection === 'ltr' ? 'LTR' : 'RTL'} | {desktopFitMode === 'width' ? 'Fit Width' : desktopFitMode === 'height' ? 'Fit Height' : 'Original'} | {zoomLevel}%
            </Text>
            <Text style={styles.shortcutsHint}>
              Press S for sidebar | Arrow keys to navigate | F to cycle fit modes
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
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
    width: 300,
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
  unsupportedInfo: {
    marginTop: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    maxWidth: 400,
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
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#111',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sidebarCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailList: {
    flex: 1,
  },
  thumbnailListContent: {
    padding: 12,
    gap: 12,
  },
  thumbnailItem: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailNumber: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbnailNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  readerArea: {
    flex: 1,
    position: 'relative',
  },
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageImage: {
    width: '100%',
    maxWidth: 900,
    aspectRatio: 0.67,
  },
  pageNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  pageNavButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNavButtonDisabled: {
    opacity: 0.3,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  pageIndicator: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsMenu: {
    position: 'absolute',
    top: 70,
    right: 24,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: 320,
    maxHeight: 500,
    zIndex: 100,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  settingsSection: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  settingsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  settingsOptionText: {
    fontSize: 13,
    color: '#fff',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  zoomFill: {
    height: '100%',
    borderRadius: 2,
  },
  zoomResetButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  zoomResetText: {
    fontSize: 12,
    color: '#fff',
  },
  keyboardHints: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  keyboardHintsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    marginBottom: 8,
  },
  keyboardHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  keyboardKey: {
    fontSize: 11,
    color: '#666',
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 8,
    fontFamily: 'monospace',
    minWidth: 90,
    textAlign: 'center',
  },
  keyboardHintText: {
    fontSize: 12,
    color: '#888',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomInfoText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
  shortcutsHint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
  },
});

export default DesktopComicReader;
