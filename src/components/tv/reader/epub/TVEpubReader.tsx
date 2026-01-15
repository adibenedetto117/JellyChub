/**
 * TV EPUB Reader Component
 * D-pad optimized UI for reading EPUBs on TV devices
 */
import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  StatusBar,
  ScrollView,
  Modal,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDisplayName, dismissModal } from '@/utils';
import { useTVRemoteHandler, type EpubReaderCore, type ReaderTheme, THEMES, HIGHLIGHT_COLORS } from '@/hooks';
import { HighlightColor } from '@/stores/readingProgressStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TVEpubReaderProps {
  core: EpubReaderCore;
}

export function TVEpubReader({ core }: TVEpubReaderProps) {
  const insets = useSafeAreaInsets();
  const {
    item,
    status,
    loadingStage,
    downloadProgress,
    errorMsg,
    fileUri,
    isConfirmedEpub,
    locationsReady,
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
    toc,
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
  } = core;

  // Track focused button for TV navigation
  const focusedButtonRef = useRef<string>('prev');

  // Handle TV remote controls
  useTVRemoteHandler({
    onLeft: () => {
      if (showSettings || showToc || showBookmarks || showHighlights || showColorPicker || showNoteEditor) return;
      webViewRef.current?.injectJavaScript('prevPage(); true;');
    },
    onRight: () => {
      if (showSettings || showToc || showBookmarks || showHighlights || showColorPicker || showNoteEditor) return;
      webViewRef.current?.injectJavaScript('nextPage(); true;');
    },
    onSelect: () => {
      // Toggle controls visibility
      if (!showSettings && !showToc && !showBookmarks && !showHighlights && !showColorPicker && !showNoteEditor) {
        setShowSettings(true);
      }
    },
    onMenu: () => {
      if (showNoteEditor) {
        setShowNoteEditor(false);
        setSelectedHighlight(null);
      } else if (showColorPicker) {
        setShowColorPicker(false);
        setPendingHighlight(null);
      } else if (showHighlights) {
        setShowHighlights(false);
      } else if (showBookmarks) {
        setShowBookmarks(false);
      } else if (showToc) {
        setShowToc(false);
      } else if (showSettings) {
        setShowSettings(false);
      } else {
        dismissModal();
      }
    },
  });

  if (status === 'downloading') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingStageText, { color: themeColors.text, marginTop: 16 }]}>{loadingStage}</Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <View style={styles.downloadProgressContainer}>
              <View style={styles.downloadProgressTrack}>
                <View style={[styles.downloadProgressFill, { width: `${downloadProgress * 100}%`, backgroundColor: accentColor }]} />
              </View>
              <Text style={[styles.downloadProgressText, { color: themeColors.text }]}>{Math.round(downloadProgress * 100)}%</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />
        <View style={styles.center}>
          <Ionicons name="alert-circle" size={80} color="#ef4444" />
          <Text style={[styles.errorText, { color: themeColors.text }]}>Failed to load book</Text>
          <Text style={[styles.errorSubtext, { color: themeColors.text }]}>{errorMsg}</Text>
          <Pressable onPress={() => dismissModal()} style={[styles.button, { backgroundColor: accentColor }]}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
      <StatusBar barStyle={theme === 'light' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: themeColors.bg }]}>
        <Pressable onPress={() => dismissModal()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={32} color={themeColors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {getDisplayName(item, hideMedia) ?? 'Loading...'}
        </Text>
        {isConfirmedEpub && (
          <>
            <Pressable onPress={() => setShowToc(true)} style={styles.headerBtn}>
              <Ionicons name="list" size={32} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowBookmarks(true)} style={styles.headerBtn}>
              <Ionicons name="bookmark-outline" size={28} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowSettings(true)} style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={28} color={themeColors.text} />
            </Pressable>
          </>
        )}
      </View>

      {/* WebView content area */}
      <View style={styles.readerContainer}>
        {fileUri && (
          <WebView
            ref={webViewRef}
            source={{ html: getReaderHtml() }}
            style={styles.webview}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            onMessage={handleMessage}
            onError={(e) => console.log('WebView error:', e.nativeEvent)}
            scrollEnabled={false}
          />
        )}

        {!locationsReady && fileUri && (
          <View style={[styles.overlay, { backgroundColor: themeColors.bg }]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={[styles.loadingStageText, { color: themeColors.text }]}>{loadingStage}</Text>
          </View>
        )}
      </View>

      {/* Footer with navigation and remote hints */}
      {isConfirmedEpub && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, backgroundColor: themeColors.bg }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: themeColors.text }]}>{progressPercent}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
            </View>
          </View>

          {/* Remote control hints */}
          <View style={styles.remoteHints}>
            <View style={styles.remoteHint}>
              <Ionicons name="chevron-back" size={24} color={themeColors.text + '80'} />
              <Text style={[styles.remoteHintText, { color: themeColors.text + '80' }]}>Previous</Text>
            </View>
            <View style={styles.remoteHint}>
              <Ionicons name="radio-button-on" size={20} color={themeColors.text + '80'} />
              <Text style={[styles.remoteHintText, { color: themeColors.text + '80' }]}>Settings</Text>
            </View>
            <View style={styles.remoteHint}>
              <Text style={[styles.remoteHintText, { color: themeColors.text + '80' }]}>Next</Text>
              <Ionicons name="chevron-forward" size={24} color={themeColors.text + '80'} />
            </View>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}>
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Settings</Text>

            <Text style={[styles.label, { color: themeColors.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
                <Pressable
                  key={t}
                  onPress={() => handleThemeChange(t)}
                  style={({ pressed }) => [
                    styles.themeBtn,
                    { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' },
                    pressed && { borderColor: accentColor, borderWidth: 3 },
                  ]}
                >
                  <Text style={{ color: THEMES[t].text, fontSize: 18 }}>{THEMES[t].name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: themeColors.text }]}>Font Size</Text>
            <View style={styles.fontRow}>
              <Pressable
                onPress={() => handleFontSizeChange(-10)}
                style={({ pressed }) => [
                  styles.fontBtn,
                  { backgroundColor: themeColors.text + '15' },
                  pressed && { borderColor: accentColor, borderWidth: 3 },
                ]}
              >
                <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
              </Pressable>
              <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
              <Pressable
                onPress={() => handleFontSizeChange(10)}
                style={({ pressed }) => [
                  styles.fontBtn,
                  { backgroundColor: themeColors.text + '15' },
                  pressed && { borderColor: accentColor, borderWidth: 3 },
                ]}
              >
                <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={() => setShowSettings(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: accentColor },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TOC Modal */}
      <Modal visible={showToc} transparent animationType="fade" onRequestClose={() => setShowToc(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.tocPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}>
            <View style={styles.tocHeader}>
              <Text style={[styles.tocTitle, { color: themeColors.text }]}>Contents</Text>
              <Pressable onPress={() => setShowToc(false)} style={styles.tocCloseBtn}>
                <Ionicons name="close" size={28} color={themeColors.text} />
              </Pressable>
            </View>
            <ScrollView style={styles.tocScroll} showsVerticalScrollIndicator>
              {toc.length === 0 ? (
                <Text style={[styles.tocEmpty, { color: themeColors.text + '80' }]}>No table of contents</Text>
              ) : (
                toc.map((t, i) => {
                  const isCurrentChapter = currentChapterHref === t.href;
                  return (
                    <Pressable
                      key={`toc-${i}-${t.href}`}
                      onPress={() => handleTocSelect(t.href)}
                      style={({ pressed }) => [
                        styles.tocItem,
                        isCurrentChapter && { backgroundColor: accentColor + '20' },
                        pressed && { backgroundColor: accentColor + '30' },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isCurrentChapter && (
                          <View style={{ width: 4, height: '100%', backgroundColor: accentColor, borderRadius: 2, marginRight: 16, minHeight: 32 }} />
                        )}
                        <Text
                          style={[
                            styles.tocItemText,
                            { color: isCurrentChapter ? accentColor : themeColors.text },
                            isCurrentChapter && { fontWeight: '600' },
                          ]}
                          numberOfLines={2}
                        >
                          {t.label?.trim()}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bookmarks Modal */}
      <Modal visible={showBookmarks} transparent animationType="fade" onRequestClose={() => setShowBookmarks(false)}>
        <View style={styles.modalBg}>
          <View style={[styles.bookmarksPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}>
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Bookmarks</Text>

            <Pressable
              onPress={handleAddBookmark}
              style={({ pressed }) => [
                styles.addBookmarkBtn,
                { backgroundColor: accentColor },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.addBookmarkText}>Add Bookmark</Text>
            </Pressable>

            <ScrollView style={styles.bookmarksList} showsVerticalScrollIndicator={false}>
              {itemBookmarks.length === 0 ? (
                <View style={styles.bookmarksEmpty}>
                  <Ionicons name="bookmark-outline" size={48} color={themeColors.text + '40'} />
                  <Text style={[styles.bookmarksEmptyText, { color: themeColors.text + '60' }]}>
                    No bookmarks yet
                  </Text>
                </View>
              ) : (
                itemBookmarks.map((bookmark) => (
                  <Pressable
                    key={bookmark.id}
                    onPress={() => handleBookmarkPress(bookmark.cfi)}
                    style={({ pressed }) => [
                      styles.bookmarkItem,
                      pressed && { backgroundColor: accentColor + '20' },
                    ]}
                  >
                    <Ionicons name="bookmark" size={24} color={accentColor} />
                    <View style={styles.bookmarkItemInfo}>
                      <Text style={[styles.bookmarkItemName, { color: themeColors.text }]} numberOfLines={1}>
                        {bookmark.name}
                      </Text>
                      <Text style={[styles.bookmarkItemProgress, { color: themeColors.text + '60' }]}>
                        {bookmark.progress}% through book
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleRemoveBookmark(bookmark.id)}
                      style={styles.bookmarkDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={24} color={themeColors.text + '60'} />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </ScrollView>

            <Pressable
              onPress={() => setShowBookmarks(false)}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: themeColors.text + '20' },
                pressed && { backgroundColor: themeColors.text + '30' },
              ]}
            >
              <Text style={[styles.closeButtonText, { color: themeColors.text }]}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 48 },
  loadingText: { marginTop: 20, fontSize: 20 },
  errorText: { marginTop: 20, fontSize: 24, fontWeight: '600' },
  errorSubtext: { marginTop: 12, fontSize: 18, opacity: 0.7, textAlign: 'center' },
  button: { marginTop: 32, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerBtn: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '600', marginHorizontal: 16 },

  // Reader content
  readerContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },

  // Footer
  footer: {
    paddingHorizontal: 48,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  progressText: { fontSize: 18, fontWeight: '500', width: 60 },
  progressTrack: { flex: 1, height: 6, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 3, marginLeft: 16 },
  progressFill: { height: '100%', borderRadius: 3 },

  // Remote hints
  remoteHints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  remoteHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  remoteHintText: {
    fontSize: 16,
  },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: 500, borderRadius: 24, padding: 32 },
  panelTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 32, textAlign: 'center' },
  label: { fontSize: 18, marginBottom: 16, opacity: 0.7 },
  themeRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  themeBtn: { flex: 1, paddingVertical: 20, borderRadius: 12, alignItems: 'center', borderWidth: 2 },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 },
  fontBtn: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  fontBtnText: { fontSize: 24, fontWeight: '600' },
  fontBtnTextLg: { fontSize: 28, fontWeight: '600' },
  fontValue: { fontSize: 24, fontWeight: '600', width: 100, textAlign: 'center' },
  closeButton: { marginTop: 32, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },

  // TOC
  tocPanel: { width: 600, maxHeight: SCREEN_HEIGHT * 0.8, borderRadius: 24, padding: 24 },
  tocHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  tocTitle: { fontSize: 28, fontWeight: 'bold' },
  tocCloseBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: 'rgba(128,128,128,0.15)' },
  tocScroll: { maxHeight: SCREEN_HEIGHT * 0.6 },
  tocItem: { paddingVertical: 20, paddingHorizontal: 24, marginBottom: 4, borderRadius: 12 },
  tocItemText: { fontSize: 18 },
  tocEmpty: { textAlign: 'center', paddingVertical: 64, fontSize: 18 },

  // Bookmarks
  bookmarksPanel: { width: 500, borderRadius: 24, padding: 32, maxHeight: SCREEN_HEIGHT * 0.8 },
  addBookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginBottom: 24,
  },
  addBookmarkText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  bookmarksList: { maxHeight: SCREEN_HEIGHT * 0.4 },
  bookmarksEmpty: { alignItems: 'center', paddingVertical: 48 },
  bookmarksEmptyText: { marginTop: 16, fontSize: 18 },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 16,
  },
  bookmarkItemInfo: { flex: 1 },
  bookmarkItemName: { fontSize: 18, fontWeight: '500' },
  bookmarkItemProgress: { fontSize: 14, marginTop: 4 },
  bookmarkDeleteBtn: { padding: 12 },

  // Loading progress
  loadingStageText: { fontSize: 18, marginTop: 16, opacity: 0.8 },
  downloadProgressContainer: { marginTop: 24, width: 300, alignItems: 'center' },
  downloadProgressTrack: { width: '100%', height: 6, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 3, overflow: 'hidden' },
  downloadProgressFill: { height: '100%', borderRadius: 3 },
  downloadProgressText: { marginTop: 12, fontSize: 16, opacity: 0.7 },
});
