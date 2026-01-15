import { useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ComicPage } from '@/hooks';

const THUMBNAIL_SIZE = 80;

interface MobileComicPageListProps {
  visible: boolean;
  onClose: () => void;
  pages: ComicPage[];
  currentPage: number;
  goToPage: (page: number, animated?: boolean) => void;
  accentColor: string;
  itemId: string;
  insets: { top: number; bottom: number };
}

export function MobileComicPageList({
  visible,
  onClose,
  pages,
  currentPage,
  goToPage,
  accentColor,
  itemId,
  insets,
}: MobileComicPageListProps) {
  const renderThumbnail = useCallback(({ item: page, index }: { item: ComicPage; index: number }) => (
    <Pressable
      onPress={() => {
        goToPage(index, false);
        onClose();
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
  ), [currentPage, accentColor, goToPage, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.thumbnailModal}>
        <View style={[styles.thumbnailHeader, { paddingTop: insets.top }]}>
          <Text style={styles.thumbnailTitle}>Pages</Text>
          <Pressable onPress={onClose} style={styles.thumbnailClose}>
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
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
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
