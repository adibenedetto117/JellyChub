import { View, Dimensions, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import type { ComicPage } from '@/hooks';
import type { ComposedGesture } from 'react-native-gesture-handler';
import type { ImageContentFit } from 'expo-image';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TVComicPageViewProps {
  page: ComicPage;
  composedGestures: ComposedGesture;
  animatedImageStyle: any;
  getContentFit: () => ImageContentFit;
  getImageStyle: () => { width: number; height: number };
}

export function TVComicPageView({
  page,
  composedGestures,
  animatedImageStyle,
  getContentFit,
  getImageStyle,
}: TVComicPageViewProps) {
  return (
    <View
      style={styles.container}
      className="items-center justify-center bg-black"
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.pageContainer, animatedImageStyle]}>
          <Image
            source={{ uri: page.uri }}
            style={getImageStyle()}
            contentFit={getContentFit()}
            transition={100}
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

interface TVComicDoublePageViewProps {
  pagePair: ComicPage[];
  composedGestures: ComposedGesture;
  animatedImageStyle: any;
}

export function TVComicDoublePageView({
  pagePair,
  composedGestures,
  animatedImageStyle,
}: TVComicDoublePageViewProps) {
  return (
    <View
      style={[styles.container, { flexDirection: 'row' }]}
      className="items-center justify-center bg-black"
    >
      <GestureDetector gesture={composedGestures}>
        <Animated.View style={[styles.doublePageContainer, animatedImageStyle]}>
          {pagePair.map((page) => (
            <Image
              key={page.index}
              source={{ uri: page.uri }}
              style={{
                width: pagePair.length === 1 ? SCREEN_WIDTH : SCREEN_WIDTH / 2,
                height: SCREEN_HEIGHT,
              }}
              contentFit="contain"
              transition={100}
            />
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doublePageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
