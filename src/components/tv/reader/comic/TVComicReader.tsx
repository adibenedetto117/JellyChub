/**
 * TV Comic Reader Component
 * D-pad optimized UI for reading comics on TV devices
 */
import { useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTVRemoteHandler } from '@/hooks';
import {
  type ComicReaderCore,
  type ComicPage,
  type PageMode,
  type FitMode,
} from '@/hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 120;

interface TVComicReaderProps {
  core: ComicReaderCore;
}

export function TVComicReader({ core }: TVComicReaderProps) {
  const insets = useSafeAreaInsets();
  const {
    item,
    itemId,
    status,
    downloadProgress,
    extractProgress,
    errorMsg,
    pages,
    totalPages,
    currentPage,
    progressPercent,
    showControls,
    showSettings,
    setShowSettings,
    showThumbnails,
    setShowThumbnails,
    pageMode,
    setPageMode,
    readDirection,
    setReadDirection,
    fitMode,
    setFitMode,
    goToPage,
    handlePrevPage,
    handleNextPage,
    toggleControls,
    controlsOpacity,
    scale,
    translateX,
    translateY,
    fadeOpacity,
    composedGestures,
    flatListRef,
    isDoublePageMode,
    doublePageData,
    responsive,
    accentColor,
    handleClose,
    handleScrollEnd,
    getContentFit,
    getImageStyle,
  } = core;

  // Handle TV remote controls
  useTVRemoteHandler({
    onLeft: () => {
      if (showSettings || showThumbnails) return;
      handlePrevPage();
    },
    onRight: () => {
      if (showSettings || showThumbnails) return;
      handleNextPage();
    },
    onSelect: () => {
      if (showSettings) {
        setShowSettings(false);
      } else if (showThumbnails) {
        setShowThumbnails(false);
      } else {
        toggleControls();
      }
    },
    onMenu: () => {
      if (showThumbnails) {
        setShowThumbnails(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else {
        handleClose();
      }
    },
    onUp: () => {
      if (!showSettings && !showThumbnails && showControls) {
        setShowSettings(true);
      }
    },
    onDown: () => {
      if (!showSettings && !showThumbnails && showControls) {
        setShowThumbnails(true);
      }
    },
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: fadeOpacity.value,
  }));

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
          {pagePair.map((page) => (
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
      style={({ pressed }) => [
        styles.thumbnailContainer,
        currentPage === index && { borderColor: accentColor, borderWidth: 3 },
        pressed && { opacity: 0.7 },
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
  ), [currentPage, accentColor, goToPage, setShowThumbnails]);

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
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
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
          <Ionicons name="document-text-outline" size={80} color="#f59e0b" />
          <Text style={styles.errorText}>Format Not Supported</Text>
          <Text style={styles.errorSubtext}>{errorMsg}</Text>
          <View style={styles.unsupportedInfo}>
            <Text style={styles.unsupportedInfoTitle}>Why CBZ instead of CBR?</Text>
            <Text style={styles.unsupportedInfoText}>
              CBZ files use ZIP compression which is widely supported. CBR files use RAR compression which requires proprietary libraries.
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
          handleScrollEnd(index);
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
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <Pressable onPress={handleClose} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={32} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {item?.Name ?? 'Loading...'}
          </Text>
          <Pressable onPress={() => setShowSettings(!showSettings)} style={styles.headerBtn}>
            <Ionicons name="settings-outline" size={28} color="#fff" />
          </Pressable>
        </View>

        {showSettings && (
          <View style={[styles.settingsPanel, { top: insets.top + 80 }]}>
            <Text style={styles.settingsTitle}>Reader Settings</Text>

            <Text style={styles.settingsLabel}>Page Mode</Text>
            <View style={styles.settingsRow}>
              {(['single', 'double', 'webtoon'] as PageMode[]).map((mode) => (
                <Pressable
                  key={mode}
                  onPress={() => setPageMode(mode)}
                  style={({ pressed }) => [
                    styles.settingsOption,
                    pageMode === mode && { backgroundColor: accentColor },
                    mode === 'double' && !responsive.isTablet && styles.settingsOptionDisabled,
                    pressed && { opacity: 0.7 },
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
                  style={({ pressed }) => [
                    styles.settingsOption,
                    fitMode === key && { backgroundColor: accentColor },
                    pressed && { opacity: 0.7 },
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
                style={({ pressed }) => [
                  styles.settingsOption,
                  { flex: 1 },
                  readDirection === 'ltr' && { backgroundColor: accentColor },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.settingsOptionText}>Left to Right</Text>
              </Pressable>
              <Pressable
                onPress={() => setReadDirection('rtl')}
                style={({ pressed }) => [
                  styles.settingsOption,
                  { flex: 1 },
                  readDirection === 'rtl' && { backgroundColor: accentColor },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.settingsOptionText}>Right to Left</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {/* Remote hints */}
          <View style={styles.remoteHints}>
            <View style={styles.remoteHint}>
              <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.6)" />
              <Text style={styles.remoteHintText}>Previous</Text>
            </View>
            <View style={styles.pageInfoContainer}>
              <Text style={styles.pageInfo}>
                {currentPage + 1} / {totalPages}
              </Text>
              <Text style={styles.pageInfoHint}>Press Select for menu</Text>
            </View>
            <View style={styles.remoteHint}>
              <Text style={styles.remoteHintText}>Next</Text>
              <Ionicons name="chevron-forward" size={24} color="rgba(255,255,255,0.6)" />
            </View>
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
        animationType="fade"
        transparent
        onRequestClose={() => setShowThumbnails(false)}
      >
        <View style={styles.thumbnailModal}>
          <View style={[styles.thumbnailHeader, { paddingTop: insets.top + 16 }]}>
            <Text style={styles.thumbnailTitle}>Pages</Text>
            <Pressable onPress={() => setShowThumbnails(false)} style={styles.thumbnailClose}>
              <Ionicons name="close" size={32} color="#fff" />
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
              numColumns={6}
              contentContainerStyle={styles.thumbnailGrid}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={Math.max(0, Math.floor(currentPage / 6) * 6)}
              getItemLayout={(_, index) => ({
                length: THUMBNAIL_SIZE + 36,
                offset: (THUMBNAIL_SIZE + 36) * Math.floor(index / 6),
                index,
              })}
              onScrollToIndexFailed={() => {}}
              initialNumToRender={24}
              maxToRenderPerBatch={24}
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
    padding: 48,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 20,
    color: '#888',
  },
  progressContainer: {
    marginTop: 32,
    width: 300,
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    marginTop: 12,
    fontSize: 16,
    color: '#888',
  },
  errorText: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  errorSubtext: {
    marginTop: 12,
    fontSize: 18,
    color: '#888',
    textAlign: 'center',
  },
  button: {
    marginTop: 32,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 20,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  headerBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginHorizontal: 16,
  },
  settingsPanel: {
    position: 'absolute',
    right: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
    width: 400,
    zIndex: 20,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 16,
    color: '#888',
    marginBottom: 12,
    marginTop: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  settingsOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  settingsOptionText: {
    fontSize: 16,
    color: '#fff',
  },
  settingsOptionDisabled: {
    opacity: 0.4,
  },
  footer: {
    paddingHorizontal: 48,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  remoteHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  remoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteHintText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
  },
  pageInfoContainer: {
    alignItems: 'center',
  },
  pageInfo: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '600',
  },
  pageInfoHint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  progressBar: {
    height: 4,
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
  unsupportedInfo: {
    marginTop: 32,
    padding: 24,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    maxWidth: 500,
  },
  unsupportedInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  unsupportedInfoText: {
    fontSize: 16,
    color: '#aaa',
    lineHeight: 24,
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
    paddingHorizontal: 48,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#fff',
  },
  thumbnailClose: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailGrid: {
    padding: 24,
  },
  thumbnailContainer: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  thumbnailImage: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.4,
    borderRadius: 8,
  },
  thumbnailText: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    marginBottom: 6,
  },
});
