import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HIGHLIGHT_COLORS } from '@/hooks';
import type { HighlightColor } from '@/stores/readingProgressStore';

interface TocItem {
  label: string;
  href: string;
  depth?: number;
}

interface Bookmark {
  id: string;
  name: string;
  cfi: string;
  progress: number;
}

interface Highlight {
  id: string;
  text: string;
  cfi: string;
  color: HighlightColor;
  note?: string;
}

interface DesktopEpubTOCProps {
  visible: boolean;
  toc: TocItem[];
  currentChapterHref: string;
  bookmarks: Bookmark[];
  highlights: Highlight[];
  sidebarTab: 'toc' | 'bookmarks' | 'highlights';
  onTabChange: (tab: 'toc' | 'bookmarks' | 'highlights') => void;
  onTocSelect: (href: string) => void;
  onBookmarkPress: (cfi: string) => void;
  onBookmarkDelete: (id: string) => void;
  onHighlightPress: (highlight: Highlight) => void;
  onHighlightEdit: (highlight: Highlight) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
  theme: 'light' | 'dark' | 'sepia';
}

export function DesktopEpubTOC({
  visible,
  toc,
  currentChapterHref,
  bookmarks,
  highlights,
  sidebarTab,
  onTabChange,
  onTocSelect,
  onBookmarkPress,
  onBookmarkDelete,
  onHighlightPress,
  onHighlightEdit,
  accentColor,
  themeColors,
  theme,
}: DesktopEpubTOCProps) {
  if (!visible) return null;

  return (
    <View style={[styles.sidebar, { backgroundColor: theme === 'light' ? '#f5f5f5' : '#1a1a1a', borderRightColor: themeColors.text + '15' }]}>
      <View style={styles.sidebarTabs}>
        <Pressable
          onPress={() => onTabChange('toc')}
          style={[styles.sidebarTab, sidebarTab === 'toc' && { borderBottomColor: accentColor }]}
        >
          <Text style={[styles.sidebarTabText, { color: sidebarTab === 'toc' ? accentColor : themeColors.text }]}>
            Contents
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onTabChange('bookmarks')}
          style={[styles.sidebarTab, sidebarTab === 'bookmarks' && { borderBottomColor: accentColor }]}
        >
          <Text style={[styles.sidebarTabText, { color: sidebarTab === 'bookmarks' ? accentColor : themeColors.text }]}>
            Bookmarks ({bookmarks.length})
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onTabChange('highlights')}
          style={[styles.sidebarTab, sidebarTab === 'highlights' && { borderBottomColor: accentColor }]}
        >
          <Text style={[styles.sidebarTabText, { color: sidebarTab === 'highlights' ? accentColor : themeColors.text }]}>
            Highlights ({highlights.length})
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
              const depth = t.depth || 0;
              const isSubItem = depth > 0;
              return (
                <Pressable
                  key={`toc-${i}-${t.href}`}
                  onPress={() => onTocSelect(t.href)}
                  style={({ pressed }) => [
                    styles.tocItem,
                    { paddingLeft: 12 + depth * 12 },
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
                      isSubItem && styles.tocSubItemText,
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
          bookmarks.length === 0 ? (
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
            bookmarks.map(bookmark => (
              <View key={bookmark.id} style={styles.bookmarkItem}>
                <Pressable
                  style={styles.bookmarkContent}
                  onPress={() => onBookmarkPress(bookmark.cfi)}
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
                  onPress={() => onBookmarkDelete(bookmark.id)}
                  style={styles.bookmarkDeleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={themeColors.text + '60'} />
                </Pressable>
              </View>
            ))
          )
        )}

        {sidebarTab === 'highlights' && (
          highlights.length === 0 ? (
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
            highlights.map(highlight => (
              <Pressable
                key={highlight.id}
                onPress={() => onHighlightPress(highlight)}
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
                  onPress={() => onHighlightEdit(highlight)}
                  style={styles.highlightEditBtn}
                >
                  <Ionicons name="pencil" size={14} color={themeColors.text + '60'} />
                </Pressable>
              </Pressable>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 300,
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
    lineHeight: 20,
  },
  tocSubItemText: {
    fontSize: 13,
    opacity: 0.85,
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
});
