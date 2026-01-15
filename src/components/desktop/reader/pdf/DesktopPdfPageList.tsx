import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

const THUMBNAIL_SIZE = 120;

interface DesktopPdfPageListProps {
  visible: boolean;
  totalPages: number;
  currentPage: number;
  goToPage: (page: number) => void;
  thumbnails: { [page: number]: string };
  accentColor: string;
  sidebarStyle: any;
}

export function DesktopPdfPageList({
  visible,
  totalPages,
  currentPage,
  goToPage,
  thumbnails,
  accentColor,
  sidebarStyle,
}: DesktopPdfPageListProps) {
  const pages = Array.from({ length: totalPages || 0 }, (_, i) => i + 1);

  return (
    <Animated.View style={[styles.sidebar, sidebarStyle]}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>Pages</Text>
      </View>
      <ScrollView style={styles.thumbnailList} showsVerticalScrollIndicator>
        {pages.map((page) => (
          <Pressable
            key={page}
            onPress={() => goToPage(page)}
            style={[
              styles.thumbnailItem,
              currentPage === page && [styles.thumbnailItemActive, { borderColor: accentColor }],
            ]}
          >
            {thumbnails[page] ? (
              <View style={styles.thumbnailImageContainer}>
                <View style={styles.thumbnailPlaceholder}>
                  <Text style={styles.thumbnailPlaceholderText}>{page}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.thumbnailPlaceholder}>
                <Text style={styles.thumbnailPlaceholderText}>{page}</Text>
              </View>
            )}
            <Text style={[styles.thumbnailPageNum, currentPage === page && { color: accentColor }]}>
              {page}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    backgroundColor: '#1a1a1a',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  sidebarHeader: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  sidebarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  thumbnailList: {
    flex: 1,
    padding: 8,
  },
  thumbnailItem: {
    alignItems: 'center',
    padding: 8,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailItemActive: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  thumbnailImageContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.33,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  thumbnailPlaceholder: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * 1.33,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailPlaceholderText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#555',
  },
  thumbnailPageNum: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
});
