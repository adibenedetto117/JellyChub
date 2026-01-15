/**
 * Mobile Comic Reader Component
 * Touch-optimized UI for reading comics on mobile devices
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
import {
  type ComicReaderCore,
  type ComicPage,
  type PageMode,
  type FitMode,
  type PageAnimation,
} from '@/hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const THUMBNAIL_SIZE = 80;

interface MobileComicReaderProps {
  core: ComicReaderCore;
}

export function MobileComicReader({ core }: MobileComicReaderProps) {
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
    pageAnimation,
    setPageAnimation,
    goToPage,
    handlePrevPage,
    handleNextPage,
    downloaded,
    isDownloading,
    handleDownload,
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
