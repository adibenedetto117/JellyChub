import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TocItem {
  label: string;
  href: string;
  depth?: number;
}

interface TVEpubTOCProps {
  visible: boolean;
  onClose: () => void;
  toc: TocItem[];
  currentChapterHref: string;
  onSelect: (href: string) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
  theme: 'light' | 'dark' | 'sepia';
}

export function TVEpubTOC({
  visible,
  onClose,
  toc,
  currentChapterHref,
  onSelect,
  accentColor,
  themeColors,
  theme,
}: TVEpubTOCProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.tocPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}>
          <View style={styles.tocHeader}>
            <Text style={[styles.tocTitle, { color: themeColors.text }]}>Contents</Text>
            <Pressable onPress={onClose} style={styles.tocCloseBtn}>
              <Ionicons name="close" size={28} color={themeColors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.tocScroll} showsVerticalScrollIndicator>
            {toc.length === 0 ? (
              <Text style={[styles.tocEmpty, { color: themeColors.text + '80' }]}>No table of contents</Text>
            ) : (
              toc.map((t, i) => {
                const isCurrentChapter = currentChapterHref === t.href;
                const depth = t.depth || 0;
                const isSubItem = depth > 0;
                return (
                  <Pressable
                    key={`toc-${i}-${t.href}`}
                    onPress={() => onSelect(t.href)}
                    style={({ pressed }) => [
                      styles.tocItem,
                      { paddingLeft: 24 + depth * 20 },
                      isCurrentChapter && { backgroundColor: accentColor + '20' },
                      pressed && { backgroundColor: accentColor + '30' },
                    ]}
                  >
                    <View style={styles.tocItemRow}>
                      {isCurrentChapter && (
                        <View style={[styles.tocActiveBar, { backgroundColor: accentColor }]} />
                      )}
                      <Text
                        style={[
                          styles.tocItemText,
                          { color: isCurrentChapter ? accentColor : themeColors.text },
                          isCurrentChapter && styles.tocItemActive,
                          isSubItem && styles.tocItemSub,
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
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tocPanel: {
    width: 600,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 24,
    padding: 24,
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tocTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  tocCloseBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  tocScroll: {
    maxHeight: SCREEN_HEIGHT * 0.6,
  },
  tocItem: {
    paddingVertical: 20,
    paddingRight: 24,
    marginBottom: 4,
    borderRadius: 12,
  },
  tocItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tocActiveBar: {
    width: 4,
    height: 28,
    borderRadius: 2,
    marginRight: 16,
  },
  tocItemText: {
    fontSize: 18,
    flex: 1,
    lineHeight: 26,
  },
  tocItemActive: {
    fontWeight: '600',
  },
  tocItemSub: {
    fontSize: 17,
    opacity: 0.85,
  },
  tocEmpty: {
    textAlign: 'center',
    paddingVertical: 64,
    fontSize: 18,
  },
});
