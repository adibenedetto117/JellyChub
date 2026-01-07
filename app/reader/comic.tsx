import { useState, useRef } from 'react';
import { View, Text, Pressable, Image, FlatList, Dimensions, StatusBar } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAuthStore } from '@/stores';
import { getItem } from '@/api';

type PageMode = 'single' | 'double' | 'webtoon';
type ReadDirection = 'ltr' | 'rtl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ComicReaderScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.Id ?? '';

  const [showControls, setShowControls] = useState(true);
  const [pageMode, setPageMode] = useState<PageMode>('single');
  const [readDirection, setReadDirection] = useState<ReadDirection>('ltr');
  const [currentPage, setCurrentPage] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const controlsOpacity = useSharedValue(1);

  const { data: item, isLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId,
  });

  const totalPages = 20;

  const handleClose = () => {
    router.back();
  };

  const handleTap = () => {
    const newValue = !showControls;
    controlsOpacity.value = withTiming(newValue ? 1 : 0, { duration: 200 });
    setShowControls(newValue);
    if (showSettings) setShowSettings(false);
  };

  const goToPage = (page: number) => {
    const targetPage = Math.max(0, Math.min(totalPages - 1, page));
    setCurrentPage(targetPage);
    flatListRef.current?.scrollToIndex({ index: targetPage, animated: true });
  };

  const handlePrevPage = () => {
    if (readDirection === 'rtl') {
      goToPage(currentPage + 1);
    } else {
      goToPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (readDirection === 'rtl') {
      goToPage(currentPage - 1);
    } else {
      goToPage(currentPage + 1);
    }
  };

  const tapGesture = Gesture.Tap().onEnd((event) => {
    const tapX = event.x;
    const leftZone = SCREEN_WIDTH * 0.3;
    const rightZone = SCREEN_WIDTH * 0.7;

    if (tapX < leftZone) {
      handlePrevPage();
    } else if (tapX > rightZone) {
      handleNextPage();
    } else {
      handleTap();
    }
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const renderPage = ({ index }: { index: number }) => (
    <View
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      className="items-center justify-center bg-black"
    >
      <View className="w-full h-full items-center justify-center">
        <View className="bg-surface w-3/4 aspect-[2/3] items-center justify-center rounded-lg">
          <Text className="text-text-tertiary text-4xl">Page {index + 1}</Text>
          <Text className="text-text-tertiary text-sm mt-2">
            CBZ/CBR pages will render here
          </Text>
        </View>
      </View>
    </View>
  );

  const progressPercent = totalPages > 0 ? ((currentPage + 1) / totalPages) * 100 : 0;

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <GestureDetector gesture={tapGesture}>
        <View className="flex-1">
          <FlatList
            ref={flatListRef}
            data={Array.from({ length: totalPages }, (_, i) => i)}
            renderItem={renderPage}
            keyExtractor={(item) => item.toString()}
            horizontal={pageMode !== 'webtoon'}
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index =
                pageMode === 'webtoon'
                  ? Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT)
                  : Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setCurrentPage(index);
            }}
            inverted={readDirection === 'rtl' && pageMode !== 'webtoon'}
            getItemLayout={(_, index) => ({
              length: pageMode === 'webtoon' ? SCREEN_HEIGHT : SCREEN_WIDTH,
              offset: (pageMode === 'webtoon' ? SCREEN_HEIGHT : SCREEN_WIDTH) * index,
              index,
            })}
          />

          <Animated.View
            style={controlsStyle}
            className="absolute inset-0"
            pointerEvents={showControls ? 'auto' : 'none'}
          >
            <SafeAreaView className="flex-1">
              <View className="bg-black/80 px-4 py-3 flex-row items-center">
                <Pressable onPress={handleClose} className="p-2">
                  <Text className="text-white text-lg">X</Text>
                </Pressable>
                <Text
                  className="text-white flex-1 text-center font-semibold"
                  numberOfLines={1}
                >
                  {item?.Name ?? 'Loading...'}
                </Text>
                <Pressable
                  onPress={() => setShowSettings(!showSettings)}
                  className="p-2"
                >
                  <Text className="text-white">Settings</Text>
                </Pressable>
              </View>

              {showSettings && (
                <View className="absolute top-16 right-4 bg-surface rounded-xl p-4 w-64 z-20">
                  <Text className="text-white font-semibold mb-3">Reader Settings</Text>

                  <Text className="text-text-secondary text-sm mb-2">Page Mode</Text>
                  <View className="flex-row mb-4">
                    {(['single', 'double', 'webtoon'] as PageMode[]).map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => setPageMode(mode)}
                        className={`flex-1 py-2 rounded-lg mr-1 items-center ${
                          pageMode === mode ? 'bg-accent' : 'bg-background'
                        }`}
                      >
                        <Text className="text-white text-xs">
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text className="text-text-secondary text-sm mb-2">Read Direction</Text>
                  <View className="flex-row">
                    <Pressable
                      onPress={() => setReadDirection('ltr')}
                      className={`flex-1 py-2 rounded-lg mr-1 items-center ${
                        readDirection === 'ltr' ? 'bg-accent' : 'bg-background'
                      }`}
                    >
                      <Text className="text-white">Left to Right</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setReadDirection('rtl')}
                      className={`flex-1 py-2 rounded-lg items-center ${
                        readDirection === 'rtl' ? 'bg-accent' : 'bg-background'
                      }`}
                    >
                      <Text className="text-white">Right to Left</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <View className="flex-1" />

              <View className="bg-black/80 px-4 py-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Pressable onPress={handlePrevPage} className="p-2">
                    <Text className="text-white">{readDirection === 'rtl' ? '>' : '<'}</Text>
                  </Pressable>
                  <Text className="text-white">
                    {currentPage + 1} / {totalPages}
                  </Text>
                  <Pressable onPress={handleNextPage} className="p-2">
                    <Text className="text-white">{readDirection === 'rtl' ? '<' : '>'}</Text>
                  </Pressable>
                </View>
                <View className="h-1 bg-white/20 rounded-full">
                  <View
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}
