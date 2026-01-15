import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { getDisplayName, dismissModal } from '@/utils';
import { HighlightColor } from '@/stores/readingProgressStore';
import {
  type EpubReaderCore,
  type ReaderTheme,
  THEMES,
  HIGHLIGHT_COLORS,
} from '@/hooks';

interface DesktopEpubReaderProps {
  core: EpubReaderCore;
}

const LINE_HEIGHT_OPTIONS = [1.4, 1.5, 1.6, 1.7, 1.8, 2.0];

export function DesktopEpubReader({ core }: DesktopEpubReaderProps) {
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'toc' | 'bookmarks' | 'highlights'>('toc');
  const [lineHeight, setLineHeight] = useState(1.7);
  const sidebarWidth = useSharedValue(300);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        webViewRef.current?.injectJavaScript('prevPage(); true;');
        break;
      case 'ArrowRight':
        e.preventDefault();
        webViewRef.current?.injectJavaScript('nextPage(); true;');
        break;
      case 'Home':
        e.preventDefault();
        webViewRef.current?.injectJavaScript('goToPercent(0); true;');
        break;
      case 'End':
        e.preventDefault();
        webViewRef.current?.injectJavaScript('goToPercent(1); true;');
        break;
      case 'b':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleAddBookmark();
        }
        break;
      case 't':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setSidebarOpen(prev => !prev);
        }
        break;
      case '+':
      case '=':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleFontSizeChange(10);
        }
        break;
      case '-':
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          handleFontSizeChange(-10);
        }
        break;
      case 'Escape':
        if (showSettings) setShowSettings(false);
        else if (showColorPicker) { setShowColorPicker(false); setPendingHighlight(null); }
        else if (showNoteEditor) { setShowNoteEditor(false); setSelectedHighlight(null); }
        else dismissModal();
        break;
    }
  }, [
    webViewRef,
    handleAddBookmark,
    handleFontSizeChange,
    showSettings,
    setShowSettings,
    showColorPicker,
    setShowColorPicker,
    setPendingHighlight,
    showNoteEditor,
    setShowNoteEditor,
    setSelectedHighlight,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const sidebarStyle = useAnimatedStyle(() => ({
    width: sidebarOpen ? sidebarWidth.value : 0,
    opacity: sidebarOpen ? 1 : 0,
  }));

  const handleLineHeightChange = useCallback((newLineHeight: number) => {
    setLineHeight(newLineHeight);
    webViewRef.current?.injectJavaScript(`
      if (rendition) {
        rendition.themes.override('line-height', '${newLineHeight} !important');
      }
      true;
    `);
  }, [webViewRef]);

  if (status === 'downloading') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>{loadingStage}</Text>
          {downloadProgress > 0 && downloadProgress < 1 && (
            <View style={styles.downloadProgressContainer}>
              <View style={styles.downloadProgressTrack}>
                <View
                  style={[
                    styles.downloadProgressFill,
                    { width: `${downloadProgress * 100}%`, backgroundColor: accentColor },
                  ]}
                />
              </View>
              <Text style={[styles.downloadProgressText, { color: themeColors.text }]}>
                {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  if (status === 'error') {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.bg }]}>
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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable onPress={() => dismissModal()} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={22} color={themeColors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: themeColors.text }]} numberOfLines={1}>
            {getDisplayName(item, hideMedia) ?? 'Loading...'}
          </Text>
        </View>

        {isConfirmedEpub && (
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => setSidebarOpen(prev => !prev)}
              style={[styles.headerBtn, sidebarOpen && { backgroundColor: accentColor + '20' }]}
            >
              <Ionicons name="list" size={20} color={sidebarOpen ? accentColor : themeColors.text} />
            </Pressable>
            <Pressable onPress={handleAddBookmark} style={styles.headerBtn}>
              <Ionicons name="bookmark-outline" size={20} color={themeColors.text} />
            </Pressable>
            <Pressable onPress={() => setShowSettings(true)} style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={20} color={themeColors.text} />
            </Pressable>
            <Pressable
              onPress={handleDownload}
              disabled={!!downloaded || isDownloading}
              style={styles.headerBtn}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={themeColors.text} />
              ) : downloaded ? (
                <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
              ) : (
                <Ionicons name="download-outline" size={20} color={themeColors.text} />
              )}
            </Pressable>

            <View style={styles.progressBadge}>
              <Text style={[styles.progressBadgeText, { color: themeColors.text }]}>
                {progressPercent}%
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.mainContent}>
        <Animated.View style={[styles.sidebar, sidebarStyle, { backgroundColor: theme === 'light' ? '#f5f5f5' : '#1a1a1a', borderRightColor: themeColors.text + '15' }]}>
          <View style={styles.sidebarTabs}>
            <Pressable
              onPress={() => setSidebarTab('toc')}
              style={[styles.sidebarTab, sidebarTab === 'toc' && { borderBottomColor: accentColor }]}
            >
              <Text style={[styles.sidebarTabText, { color: sidebarTab === 'toc' ? accentColor : themeColors.text }]}>
                Contents
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSidebarTab('bookmarks')}
              style={[styles.sidebarTab, sidebarTab === 'bookmarks' && { borderBottomColor: accentColor }]}
            >
              <Text style={[styles.sidebarTabText, { color: sidebarTab === 'bookmarks' ? accentColor : themeColors.text }]}>
                Bookmarks ({itemBookmarks.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSidebarTab('highlights')}
              style={[styles.sidebarTab, sidebarTab === 'highlights' && { borderBottomColor: accentColor }]}
            >
              <Text style={[styles.sidebarTabText, { color: sidebarTab === 'highlights' ? accentColor : themeColors.text }]}>
                Highlights ({itemHighlights.length})
              </Text>
            </Pressable>
          </View>

          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            {sidebarTab === 'toc' && (
              toc.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="list-outline" size={32} color={themeColors.text + '40'} />
                  <Text style={[styles.emptyStateText, { color: themeColors.text + '60' }]}>
                    No table of contents
                  </Text>
                </View>
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
                        pressed && { backgroundColor: accentColor + '10' },
                      ]}
                    >
                      {isCurrentChapter && (
                        <View style={[styles.tocIndicator, { backgroundColor: accentColor }]} />
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
                    </Pressable>
                  );
                })
              )
            )}

            {sidebarTab === 'bookmarks' && (
              itemBookmarks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={32} color={themeColors.text + '40'} />
                  <Text style={[styles.emptyStateText, { color: themeColors.text + '60' }]}>
                    No bookmarks yet
                  </Text>
                  <Text style={[styles.emptyStateHint, { color: themeColors.text + '40' }]}>
                    Press Ctrl+B to add a bookmark
                  </Text>
                </View>
              ) : (
                itemBookmarks.map(bookmark => (
                  <View key={bookmark.id} style={styles.bookmarkItem}>
                    <Pressable
                      style={styles.bookmarkContent}
                      onPress={() => handleBookmarkPress(bookmark.cfi)}
                    >
                      <Ionicons name="bookmark" size={16} color={accentColor} />
                      <View style={styles.bookmarkInfo}>
                        <Text style={[styles.bookmarkName, { color: themeColors.text }]} numberOfLines={1}>
                          {bookmark.name}
                        </Text>
                        <Text style={[styles.bookmarkProgress, { color: themeColors.text + '60' }]}>
                          {bookmark.progress}% through book
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRemoveBookmark(bookmark.id)}
                      style={styles.bookmarkDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color={themeColors.text + '60'} />
                    </Pressable>
                  </View>
                ))
              )
            )}

            {sidebarTab === 'highlights' && (
              itemHighlights.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="color-wand-outline" size={32} color={themeColors.text + '40'} />
                  <Text style={[styles.emptyStateText, { color: themeColors.text + '60' }]}>
                    No highlights yet
                  </Text>
                  <Text style={[styles.emptyStateHint, { color: themeColors.text + '40' }]}>
                    Select text to highlight
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
                    <View style={styles.highlightContent}>
                      <Text style={[styles.highlightText, { color: themeColors.text }]} numberOfLines={2}>
                        "{highlight.text}"
                      </Text>
                      {highlight.note && (
                        <Text style={[styles.highlightNote, { color: themeColors.text + '70' }]} numberOfLines={1}>
                          {highlight.note}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => {
                        setSelectedHighlight(highlight);
                        setNoteText(highlight.note || '');
                        setShowNoteEditor(true);
                      }}
                      style={styles.highlightEditBtn}
                    >
                      <Ionicons name="pencil" size={14} color={themeColors.text + '60'} />
                    </Pressable>
                  </Pressable>
                ))
              )
            )}
          </ScrollView>
        </Animated.View>

        <View style={styles.readerArea}>
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
                <Text style={[styles.loadingText, { color: themeColors.text }]}>{loadingStage}</Text>
              </View>
            )}
          </View>

          {isConfirmedEpub && (
            <View style={[styles.footer, { backgroundColor: themeColors.bg, borderTopColor: themeColors.text + '15' }]}>
              <Pressable
                onPress={() => webViewRef.current?.injectJavaScript('prevPage(); true;')}
                style={[styles.navButton, { backgroundColor: themeColors.text + '10' }]}
              >
                <Ionicons name="chevron-back" size={20} color={themeColors.text} />
                <Text style={[styles.navButtonText, { color: themeColors.text }]}>Previous</Text>
              </Pressable>

              <View style={styles.progressBarContainer}>
                <View style={[styles.progressTrack, { backgroundColor: themeColors.text + '20' }]}>
                  <View
                    style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: accentColor }]}
                  />
                </View>
              </View>

              <Pressable
                onPress={() => webViewRef.current?.injectJavaScript('nextPage(); true;')}
                style={[styles.navButton, { backgroundColor: themeColors.text + '10' }]}
              >
                <Text style={[styles.navButtonText, { color: themeColors.text }]}>Next</Text>
                <Ionicons name="chevron-forward" size={20} color={themeColors.text} />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      <View style={[styles.shortcutsBar, { backgroundColor: theme === 'light' ? '#f0f0f0' : '#0a0a0a', borderTopColor: themeColors.text + '10' }]}>
        <Text style={[styles.shortcutsText, { color: themeColors.text + '60' }]}>
          Arrow Keys: Turn Page | Ctrl+B: Bookmark | Ctrl+T: Toggle Sidebar | Ctrl+/-: Font Size | Home/End: Go to Start/End
        </Text>
      </View>

      <Modal visible={showSettings} transparent animationType="fade" onRequestClose={() => setShowSettings(false)}>
        <Pressable style={styles.modalBg} onPress={() => setShowSettings(false)}>
          <Pressable
            style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.settingsHeader}>
              <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Reading Settings</Text>
              <Pressable onPress={() => setShowSettings(false)} style={styles.settingsCloseBtn}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </Pressable>
            </View>

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Theme</Text>
              <View style={styles.themeRow}>
                {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
                  <Pressable
                    key={t}
                    onPress={() => handleThemeChange(t)}
                    style={[
                      styles.themeBtn,
                      { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' },
                    ]}
                  >
                    <Text style={{ color: THEMES[t].text }}>{THEMES[t].name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Font Size</Text>
              <View style={styles.fontRow}>
                <Pressable
                  onPress={() => handleFontSizeChange(-10)}
                  style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
                >
                  <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
                </Pressable>
                <View style={styles.fontSlider}>
                  <View style={[styles.fontSliderTrack, { backgroundColor: themeColors.text + '20' }]}>
                    <View
                      style={[
                        styles.fontSliderFill,
                        { width: `${((fontSize - 50) / 150) * 100}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
                </View>
                <Pressable
                  onPress={() => handleFontSizeChange(10)}
                  style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
                >
                  <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Line Height</Text>
              <View style={styles.lineHeightRow}>
                {LINE_HEIGHT_OPTIONS.map(lh => (
                  <Pressable
                    key={lh}
                    onPress={() => handleLineHeightChange(lh)}
                    style={[
                      styles.lineHeightBtn,
                      { backgroundColor: themeColors.text + '10', borderColor: lineHeight === lh ? accentColor : 'transparent' },
                    ]}
                  >
                    <Text style={[styles.lineHeightBtnText, { color: lineHeight === lh ? accentColor : themeColors.text }]}>
                      {lh}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                >
                  <Text style={styles.colorLabel}>{color}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
                  style={[styles.noteInput, { color: themeColors.text, borderColor: themeColors.text + '30', backgroundColor: themeColors.bg }]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
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
  downloadProgressContainer: {
    marginTop: 20,
    width: 200,
    alignItems: 'center',
  },
  downloadProgressTrack: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(128,128,128,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  downloadProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  downloadProgressText: {
    marginTop: 8,
    fontSize: 13,
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  progressBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(128,128,128,0.15)',
    marginLeft: 8,
  },
  progressBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sidebarTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  sidebarTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sidebarTabText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sidebarContent: {
    flex: 1,
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyStateHint: {
    marginTop: 4,
    fontSize: 12,
  },
  tocItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
  },
  tocIndicator: {
    width: 3,
    height: 20,
    borderRadius: 2,
    marginRight: 10,
  },
  tocItemText: {
    fontSize: 14,
    flex: 1,
  },
  bookmarkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  bookmarkContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  bookmarkInfo: {
    flex: 1,
  },
  bookmarkName: {
    fontSize: 14,
    fontWeight: '500',
  },
  bookmarkProgress: {
    fontSize: 12,
    marginTop: 2,
  },
  bookmarkDeleteBtn: {
    padding: 6,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  highlightColorBar: {
    width: 4,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  highlightContent: {
    flex: 1,
  },
  highlightText: {
    fontSize: 13,
    lineHeight: 18,
  },
  highlightNote: {
    fontSize: 12,
    marginTop: 4,
  },
  highlightEditBtn: {
    padding: 6,
  },
  readerArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  readerContainer: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 16,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    flex: 1,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  shortcutsBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  shortcutsText: {
    fontSize: 11,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    width: 480,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fontBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fontBtnTextLg: {
    fontSize: 20,
    fontWeight: '600',
  },
  fontSlider: {
    flex: 1,
    alignItems: 'center',
  },
  fontSliderTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fontSliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  fontValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  lineHeightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineHeightBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  lineHeightBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
  colorPickerPanel: {
    width: 400,
    borderRadius: 16,
    padding: 24,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: 20,
    opacity: 0.8,
    lineHeight: 20,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  colorBtn: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
    textTransform: 'capitalize',
  },
  noteEditorPanel: {
    width: 480,
    borderRadius: 16,
    padding: 24,
  },
  highlightPreview: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  highlightPreviewText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  noteLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  noteInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
  },
  noteButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  noteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  noteButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default DesktopEpubReader;
