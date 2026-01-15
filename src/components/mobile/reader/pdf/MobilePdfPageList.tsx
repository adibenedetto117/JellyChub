import { View, Text, Pressable, FlatList, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const THUMBNAIL_SIZE = 80;

interface MobilePdfPageListProps {
  visible: boolean;
  onClose: () => void;
  totalPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  accentColor: string;
  insets: { top: number; bottom: number };
}

export function MobilePdfPageList({
  visible,
  onClose,
  totalPages,
  currentPage,
  goToPage,
  accentColor,
  insets,
}: MobilePdfPageListProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  const renderThumbnail = ({ item: page }: { item: number }) => (
    <Pressable
      onPress={() => {
        goToPage(page);
        onClose();
      }}
      style={[
        styles.thumbnailContainer,
        currentPage === page && { borderColor: accentColor, borderWidth: 2 },
      ]}
    >
      <View style={styles.thumbnailPlaceholder}>
        <Text style={styles.thumbnailPageNum}>{page}</Text>
      </View>
      <Text style={styles.thumbnailText}>{page}</Text>
    </Pressable>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.thumbnailModal}>
        <View style={[styles.thumbnailHeader, { paddingTop: insets.top }]}>
          <Text style={styles.thumbnailTitle}>Pages</Text>
          <Pressable onPress={onClose} style={styles.thumbnailClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </Pressable>
        </View>
        <FlatList
          data={pages}
          renderItem={renderThumbnail}
          keyExtractor={(page) => `thumb-${page}`}
          numColumns={4}
          contentContainerStyle={[styles.thumbnailGrid, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={Math.max(0, Math.floor((currentPage - 1) / 4) * 4)}
          getItemLayout={(_, index) => ({
            length: THUMBNAIL_SIZE + 28,
            offset: (THUMBNAIL_SIZE + 28) * Math.floor(index / 4),
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
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.4,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPageNum: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  thumbnailText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    marginBottom: 4,
  },
});
