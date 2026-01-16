import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TocItem {
  label: string;
  href: string;
  depth?: number;
}

interface MobileEpubTOCProps {
  visible: boolean;
  onClose: () => void;
  toc: TocItem[];
  currentChapterHref: string;
  onSelect: (href: string) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
  theme: 'light' | 'dark' | 'sepia';
  insets: { bottom: number };
}

export function MobileEpubTOC({
  visible,
  onClose,
  toc,
  currentChapterHref,
  onSelect,
  accentColor,
  themeColors,
  theme,
  insets,
}: MobileEpubTOCProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modalBg, { justifyContent: 'flex-end', alignItems: 'stretch' }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
        <View
          style={[
            styles.tocModalPanel,
            { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a', paddingBottom: insets.bottom + 20 },
          ]}
        >
          <View style={styles.tocHeader}>
            <Text style={[styles.tocTitle, { color: themeColors.text }]}>Contents</Text>
            <Pressable onPress={onClose} style={styles.tocCloseBtn}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: SCREEN_HEIGHT * 0.6 }} showsVerticalScrollIndicator>
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
                      { paddingLeft: 24 + depth * 16 },
                      isCurrentChapter && { backgroundColor: accentColor + '20' },
                      pressed && { backgroundColor: accentColor + '15' },
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tocModalPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 0,
    maxHeight: '80%',
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  tocCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.12)',
  },
  tocItem: {
    paddingVertical: 14,
    paddingRight: 20,
    marginHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.1)',
  },
  tocItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tocActiveBar: {
    width: 3,
    height: 20,
    borderRadius: 1.5,
    marginRight: 12,
  },
  tocItemText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  tocItemActive: {
    fontWeight: '600',
  },
  tocItemSub: {
    fontSize: 15,
    opacity: 0.85,
  },
  tocEmpty: {
    textAlign: 'center',
    paddingVertical: 48,
    fontSize: 15,
  },
});
