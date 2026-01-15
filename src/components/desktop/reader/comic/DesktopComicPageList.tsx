import { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ComicPage } from '@/hooks';

const SIDEBAR_WIDTH = 200;
const THUMBNAIL_WIDTH = 160;
const THUMBNAIL_HEIGHT = 220;

interface DesktopComicPageListProps {
  visible: boolean;
  onClose: () => void;
  pages: ComicPage[];
  currentPage: number;
  goToPage: (page: number, animated?: boolean) => void;
  accentColor: string;
  scrollRef: React.RefObject<ScrollView>;
}

export function DesktopComicPageList({
  visible,
  onClose,
  pages,
  currentPage,
  goToPage,
  accentColor,
  scrollRef,
}: DesktopComicPageListProps) {
  const handleThumbnailClick = useCallback((pageIndex: number) => {
    goToPage(pageIndex, false);
  }, [goToPage]);

  const renderThumbnail = useCallback((page: ComicPage) => {
    const isActive = page.index === currentPage;
    return (
      <Pressable
        key={page.index}
        onPress={() => handleThumbnailClick(page.index)}
        style={[
          styles.thumbnailItem,
          isActive && { borderColor: accentColor, borderWidth: 3 },
        ]}
      >
        <Image
          source={{ uri: page.uri }}
          style={styles.thumbnailImage}
          contentFit="cover"
          transition={50}
        />
        <View style={[styles.thumbnailNumber, isActive && { backgroundColor: accentColor }]}>
          <Text style={styles.thumbnailNumberText}>{page.index + 1}</Text>
        </View>
      </Pressable>
    );
  }, [currentPage, accentColor, handleThumbnailClick]);

  if (!visible) return null;

  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Pages</Text>
        <Pressable onPress={onClose} style={styles.sidebarCloseBtn}>
          <Ionicons name="close" size={20} color="#888" />
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={styles.thumbnailList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailListContent}
      >
        {pages.map(renderThumbnail)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: SIDEBAR_WIDTH,
    backgroundColor: '#111',
    borderRightWidth: 1,
    borderRightColor: '#333',
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sidebarCloseBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  thumbnailList: {
    flex: 1,
  },
  thumbnailListContent: {
    padding: 12,
    gap: 12,
  },
  thumbnailItem: {
    width: THUMBNAIL_WIDTH,
    height: THUMBNAIL_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#222',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailNumber: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  thumbnailNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
});
