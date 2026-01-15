import { View, StyleSheet, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import type { ComicPage } from '@/hooks';

type DesktopFitMode = 'width' | 'height' | 'original';

interface DesktopComicPageViewProps {
  page: ComicPage | null;
  desktopFitMode: DesktopFitMode;
  zoomLevel: number;
  scrollRef: React.RefObject<ScrollView>;
}

export function DesktopComicPageView({
  page,
  desktopFitMode,
  zoomLevel,
  scrollRef,
}: DesktopComicPageViewProps) {
  if (!page) return null;

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.pageScroll}
      contentContainerStyle={styles.pageScrollContent}
      showsVerticalScrollIndicator={true}
      showsHorizontalScrollIndicator={true}
    >
      <View style={styles.pageContainer}>
        <Image
          source={{ uri: page.uri }}
          style={[
            styles.pageImage,
            desktopFitMode === 'original' && {
              width: 800 * (zoomLevel / 100),
              height: 1200 * (zoomLevel / 100),
            },
          ]}
          contentFit={desktopFitMode === 'original' ? 'fill' : 'contain'}
          transition={100}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pageScroll: {
    flex: 1,
  },
  pageScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  pageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageImage: {
    width: '100%',
    maxWidth: 900,
    aspectRatio: 0.67,
  },
});
