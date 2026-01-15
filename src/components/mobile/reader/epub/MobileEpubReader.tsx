/**
 * Mobile EPUB Reader Component
 * Touch-optimized UI for reading EPUBs on mobile devices
 */
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
import { HighlightColor } from '@/stores/readingProgressStore';
import {
  type EpubReaderCore,
  type ReaderTheme,
  THEMES,
  HIGHLIGHT_COLORS,
} from '@/hooks';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MobileEpubReaderProps {
  core: EpubReaderCore;
}

export function MobileEpubReader({ core }: MobileEpubReaderProps) {
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
          <Ionicons name="alert-circle" size={64} color="#ef4444" />
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

      {/* Header - always visible */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: themeColors.bg }]}>
        <Pressable onPress={() => dismissModal()} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
          {getDisplayName(item, hideMedia) ?? 'Loading...'}
        </Text>
        {isConfirmedEpub && (
          <>
            <Pressable onPress={() => setShowToc(true)} style={styles.headerBtn}>
              <Ionicons name="list" size={24} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowBookmarks(true)} style={styles.headerBtn}>
              <Ionicons name="bookmark-outline" size={22} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowHighlights(true)} style={styles.headerBtn}>
              <Ionicons name="color-wand-outline" size={22} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowSettings(true)} style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={22} color={themeColors.text} />
            </Pressable>
            <Pressable
              onPress={handleDownload}
              disabled={!!downloaded || isDownloading}
              style={styles.headerBtn}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={themeColors.text} />
              ) : downloaded ? (
                <Ionicons name="checkmark-circle" size={22} color="#22c55e" />
              ) : (
                <Ionicons name="download-outline" size={22} color={themeColors.text} />
              )}
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

      {/* Footer with navigation - always visible */}
      {isConfirmedEpub && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8, backgroundColor: themeColors.bg }]}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressText, { color: themeColors.text }]}>{progressPercent}%</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]} />
            </View>
          </View>
          <View style={styles.navRow}>
            <Pressable
              onPress={() => webViewRef.current?.injectJavaScript('prevPage(); true;')}
              style={[styles.navButton, { backgroundColor: themeColors.text + '15' }]}
            >
              <Ionicons name="chevron-back" size={28} color={themeColors.text} />
              <Text style={[styles.navButtonText, { color: themeColors.text }]}>Previous</Text>
            </Pressable>
            <Pressable
              onPress={() => webViewRef.current?.injectJavaScript('nextPage(); true;')}
              style={[styles.navButton, { backgroundColor: themeColors.text + '15' }]}
            >
              <Text style={[styles.navButtonText, { color: themeColors.text }]}>Next</Text>
              <Ionicons name="chevron-forward" size={28} color={themeColors.text} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Settings Modal */}
      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowSettings(false)}>
          <Pressable style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}>
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Settings</Text>

            <Text style={[styles.label, { color: themeColors.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
                <Pressable key={t} onPress={() => handleThemeChange(t)}
                  style={[styles.themeBtn, { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' }]}>
                  <Text style={{ color: THEMES[t].text }}>{THEMES[t].name}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.label, { color: themeColors.text }]}>Font Size</Text>
            <View style={styles.fontRow}>
              <Pressable onPress={() => handleFontSizeChange(-10)} style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}>
                <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
              </Pressable>
              <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
              <Pressable onPress={() => handleFontSizeChange(10)} style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}>
                <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* TOC Modal */}
      <Modal visible={showToc} transparent animationType="slide" onRequestClose={() => setShowToc(false)}>
        <View style={[styles.modalBg, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
          <TouchableWithoutFeedback onPress={() => setShowToc(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View
            style={[styles.tocModalPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a', paddingBottom: insets.bottom + 20 }]}
          >
            <View style={styles.tocHeader}>
              <Text style={[styles.tocTitle, { color: themeColors.text }]}>Contents</Text>
              <Pressable onPress={() => setShowToc(false)} style={styles.tocCloseBtn}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </Pressable>
            </View>
            <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }} showsVerticalScrollIndicator>
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
                        pressed && { backgroundColor: accentColor + '15' },
                      ]}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        {isCurrentChapter && (
                          <View style={{ width: 4, height: '100%', backgroundColor: accentColor, borderRadius: 2, marginRight: 12, minHeight: 24 }} />
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
        <Pressable style={styles.modalBg} onPress={() => setShowBookmarks(false)}>
          <Pressable
            style={[styles.bookmarksPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Bookmarks</Text>

            <Pressable
              onPress={handleAddBookmark}
              style={[styles.addBookmarkBtn, { backgroundColor: accentColor }]}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBookmarkText}>Add Bookmark</Text>
            </Pressable>

            <ScrollView style={styles.bookmarksList} showsVerticalScrollIndicator={false}>
              {itemBookmarks.length === 0 ? (
                <View style={styles.bookmarksEmpty}>
                  <Ionicons name="bookmark-outline" size={40} color={themeColors.text + '40'} />
                  <Text style={[styles.bookmarksEmptyText, { color: themeColors.text + '60' }]}>
                    No bookmarks yet
                  </Text>
                </View>
              ) : (
                itemBookmarks.map((bookmark) => (
                  <View key={bookmark.id} style={styles.bookmarkItem}>
                    <Pressable
                      style={styles.bookmarkItemContent}
                      onPress={() => handleBookmarkPress(bookmark.cfi)}
                    >
                      <Ionicons name="bookmark" size={18} color={accentColor} />
                      <View style={styles.bookmarkItemInfo}>
                        <Text style={[styles.bookmarkItemName, { color: themeColors.text }]} numberOfLines={1}>
                          {bookmark.name}
                        </Text>
                        <Text style={[styles.bookmarkItemProgress, { color: themeColors.text + '60' }]}>
                          {bookmark.progress}% through book
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveBookmark(bookmark.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.bookmarkDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={themeColors.text + '60'} />
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} transparent animationType="fade" onRequestClose={() => { setShowColorPicker(false); setPendingHighlight(null); }}>
        <Pressable style={styles.modalBg} onPress={() => { setShowColorPicker(false); setPendingHighlight(null); }}>
          <Pressable
            style={[styles.colorPickerPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Highlight Color</Text>
            {pendingHighlight && (
              <Text style={[styles.selectedText, { color: themeColors.text }]} numberOfLines={3}>
                "{pendingHighlight.text}"
              </Text>
            )}
            <View style={styles.colorRow}>
              {(Object.keys(HIGHLIGHT_COLORS) as HighlightColor[]).map(color => (
                <Pressable
                  key={color}
                  onPress={() => handleColorSelect(color)}
                  style={[styles.colorBtn, { backgroundColor: HIGHLIGHT_COLORS[color] }]}
                />
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Note Editor Modal */}
      <Modal visible={showNoteEditor} transparent animationType="fade" onRequestClose={() => { setShowNoteEditor(false); setSelectedHighlight(null); }}>
        <Pressable style={styles.modalBg} onPress={() => { setShowNoteEditor(false); setSelectedHighlight(null); }}>
          <Pressable
            style={[styles.noteEditorPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Edit Highlight</Text>
            {selectedHighlight && (
              <>
                <View style={[styles.highlightPreview, { backgroundColor: HIGHLIGHT_COLORS[selectedHighlight.color] + '40' }]}>
                  <Text style={[styles.highlightPreviewText, { color: themeColors.text }]} numberOfLines={3}>
                    "{selectedHighlight.text}"
                  </Text>
                </View>
                <Text style={[styles.noteLabel, { color: themeColors.text }]}>Note</Text>
                <TextInput
                  style={[styles.noteInput, { color: themeColors.text, borderColor: themeColors.text + '30' }]}
                  value={noteText}
                  onChangeText={setNoteText}
                  placeholder="Add a note..."
                  placeholderTextColor={themeColors.text + '50'}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.noteButtonRow}>
                  <Pressable
                    onPress={() => handleDeleteHighlight(selectedHighlight)}
                    style={[styles.noteButton, { backgroundColor: '#ef4444' }]}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.noteButtonText}>Delete</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSaveNote}
                    style={[styles.noteButton, { backgroundColor: accentColor }]}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                    <Text style={styles.noteButtonText}>Save</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Highlights List Modal */}
      <Modal visible={showHighlights} transparent animationType="fade" onRequestClose={() => setShowHighlights(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowHighlights(false)}>
          <Pressable
            style={[styles.highlightsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.panelTitle, { color: themeColors.text }]}>Highlights & Notes</Text>
            <ScrollView style={styles.highlightsList} showsVerticalScrollIndicator={false}>
              {itemHighlights.length === 0 ? (
                <View style={styles.highlightsEmpty}>
                  <Ionicons name="color-wand-outline" size={40} color={themeColors.text + '40'} />
                  <Text style={[styles.highlightsEmptyText, { color: themeColors.text + '60' }]}>
                    No highlights yet
                  </Text>
                  <Text style={[styles.highlightsEmptyHint, { color: themeColors.text + '40' }]}>
                    Long-press text to highlight
                  </Text>
                </View>
              ) : (
                itemHighlights.map(highlight => (
                  <Pressable
                    key={highlight.id}
                    onPress={() => handleHighlightPress(highlight)}
                    style={styles.highlightItem}
                  >
                    <View style={[styles.highlightColorBar, { backgroundColor: HIGHLIGHT_COLORS[highlight.color] }]} />
                    <View style={styles.highlightItemContent}>
                      <Text style={[styles.highlightItemText, { color: themeColors.text }]} numberOfLines={2}>
                        "{highlight.text}"
                      </Text>
                      {highlight.note && (
                        <Text style={[styles.highlightItemNote, { color: themeColors.text + '70' }]} numberOfLines={1}>
                          {highlight.note}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => {
                        setSelectedHighlight(highlight);
                        setNoteText(highlight.note || '');
                        setShowHighlights(false);
                        setShowNoteEditor(true);
                      }}
                      style={styles.highlightEditBtn}
                    >
                      <Ionicons name="pencil" size={16} color={themeColors.text + '60'} />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontSize: 16 },
  errorText: { marginTop: 16, fontSize: 18, fontWeight: '600' },
  errorSubtext: { marginTop: 8, fontSize: 14, opacity: 0.7, textAlign: 'center' },
  button: { marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', marginHorizontal: 4 },

  // Reader content
  readerContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 100, elevation: 100 },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressText: { fontSize: 13, fontWeight: '500', width: 40 },
  progressTrack: { flex: 1, height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, marginLeft: 8 },
  progressFill: { height: '100%', borderRadius: 2 },
  navRow: { flexDirection: 'row', gap: 12 },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  navButtonText: { fontSize: 15, fontWeight: '500' },

  // Modals
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  settingsPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24 },
  panelTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 24, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 12, opacity: 0.7 },
  themeRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  themeBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', borderWidth: 2 },
  fontRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  fontBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  fontBtnText: { fontSize: 18, fontWeight: '600' },
  fontBtnTextLg: { fontSize: 22, fontWeight: '600' },
  fontValue: { fontSize: 20, fontWeight: '600', width: 70, textAlign: 'center' },
  tocModalPanel: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 16, paddingHorizontal: 8, maxHeight: '80%' },
  tocHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 },
  tocTitle: { fontSize: 20, fontWeight: 'bold' },
  tocCloseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(128,128,128,0.15)' },
  tocItem: { paddingVertical: 18, paddingHorizontal: 24, marginHorizontal: 8, marginBottom: 4 },
  tocItemText: { fontSize: 16 },
  tocEmpty: { textAlign: 'center', paddingVertical: 48, fontSize: 15 },
  // Bookmarks
  bookmarksPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24, maxHeight: SCREEN_HEIGHT * 0.7 },
  addBookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 16,
  },
  addBookmarkText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  bookmarksList: { maxHeight: SCREEN_HEIGHT * 0.4 },
  bookmarksEmpty: { alignItems: 'center', paddingVertical: 32 },
  bookmarksEmptyText: { marginTop: 12, fontSize: 15 },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  bookmarkItemContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  bookmarkItemInfo: { flex: 1 },
  bookmarkItemName: { fontSize: 15, fontWeight: '500' },
  bookmarkItemProgress: { fontSize: 13, marginTop: 2 },
  bookmarkDeleteBtn: { padding: 8 },

  // Loading progress
  loadingStageText: { fontSize: 15, marginTop: 12, opacity: 0.8 },
  downloadProgressContainer: { marginTop: 20, width: 200, alignItems: 'center' },
  downloadProgressTrack: { width: '100%', height: 4, backgroundColor: 'rgba(128,128,128,0.3)', borderRadius: 2, overflow: 'hidden' },
  downloadProgressFill: { height: '100%', borderRadius: 2 },
  downloadProgressText: { marginTop: 8, fontSize: 13, opacity: 0.7 },

  colorPickerPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24 },
  selectedText: { fontSize: 14, fontStyle: 'italic', marginBottom: 20, opacity: 0.8, lineHeight: 20 },
  colorRow: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  colorBtn: { width: 56, height: 56, borderRadius: 28 },

  noteEditorPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24 },
  highlightPreview: { padding: 12, borderRadius: 8, marginBottom: 16 },
  highlightPreviewText: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  noteLabel: { fontSize: 14, marginBottom: 8, opacity: 0.7 },
  noteInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 100 },
  noteButtonRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  noteButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, gap: 8 },
  noteButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  highlightsPanel: { width: SCREEN_WIDTH - 48, borderRadius: 20, padding: 24, maxHeight: SCREEN_HEIGHT * 0.7 },
  highlightsList: { maxHeight: SCREEN_HEIGHT * 0.5 },
  highlightsEmpty: { alignItems: 'center', paddingVertical: 32 },
  highlightsEmptyText: { marginTop: 12, fontSize: 15 },
  highlightsEmptyHint: { marginTop: 4, fontSize: 13 },
  highlightItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(128,128,128,0.15)' },
  highlightColorBar: { width: 4, height: '100%', borderRadius: 2, marginRight: 12, minHeight: 40 },
  highlightItemContent: { flex: 1 },
  highlightItemText: { fontSize: 14, lineHeight: 20 },
  highlightItemNote: { fontSize: 13, marginTop: 4 },
  highlightEditBtn: { padding: 8 },
});
