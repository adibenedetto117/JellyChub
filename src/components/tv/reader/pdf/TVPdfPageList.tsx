import { View, Text, Pressable, FlatList, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THUMBNAIL_SIZE = 120;

interface TVPdfPageListProps {
  visible: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  accentColor: string;
  insets: { top: number; bottom: number };
}

export function TVPdfPageList({
  visible,
  onClose,
  totalPages,
  currentPage,
  goToPage,
  accentColor,
  insets,
}: TVPdfPageListProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const renderThumbnail = ({ item: page }: { item: number }) => (
    <Pressable
      onPress={() => {
        goToPage(page);
        onClose();
      }}
      style={({ pressed }) => [
        styles.thumbnailContainer,
        currentPage === page && { borderColor: accentColor, borderWidth: 3 },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.thumbnailPlaceholder}>
        <Text style={styles.thumbnailPageNum}>{page}</Text>
      </View>
      <Text style={styles.thumbnailText}>{page}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.thumbnailModal}>
        <View style={[styles.thumbnailHeader, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.thumbnailTitle}>Pages</Text>
          <Pressable onPress={onClose} style={styles.thumbnailClose}>
            <Ionicons name="close" size={32} color="#fff" />
          </Pressable>
        </View>
        <FlatList
          data={pages}
          renderItem={renderThumbnail}
          keyExtractor={(page) => `thumb-${page}`}
          numColumns={6}
          contentContainerStyle={[styles.thumbnailGrid, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.max(0, Math.floor((currentPage - 1) / 6) * 6)}
          getItemLayout={(_, index) => ({
            length: THUMBNAIL_SIZE + 36,
            offset: (THUMBNAIL_SIZE + 36) * Math.floor(index / 6),
            index,
          })}
          onScrollToIndexFailed={() => {}}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.4,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPageNum: {
    fontSize: 24,
    fontWeight: '600',
    color: '#666',
  },
  thumbnailText: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    marginBottom: 6,
  },
});
