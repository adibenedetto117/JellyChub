import { View, Text, Pressable, Modal, ScrollView, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TocItem {
  label: string;
  href: string;
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
                return (
                  <Pressable
                    key={`toc-${i}-${t.href}`}
                    onPress={() => onSelect(t.href)}
                    style={({ pressed }) => [
                      styles.tocItem,
                      isCurrentChapter && { backgroundColor: accentColor + '20' },
                      pressed && { backgroundColor: accentColor + '15' },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      {isCurrentChapter && (
                        <View
                          style={{
                            width: 4,
                            height: '100%',
                            backgroundColor: accentColor,
                            borderRadius: 2,
                            marginRight: 12,
                            minHeight: 24,
                          }}
                        />
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
    paddingTop: 16,
    paddingHorizontal: 8,
    maxHeight: '80%',
  },
  tocHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  tocTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tocCloseBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  tocItem: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginHorizontal: 8,
    marginBottom: 4,
  },
  tocItemText: {
    fontSize: 16,
  },
  tocEmpty: {
    textAlign: 'center',
    paddingVertical: 48,
    fontSize: 15,
  },
});
