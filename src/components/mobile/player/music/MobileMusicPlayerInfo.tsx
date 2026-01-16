import { View, Text, Pressable, Image, Dimensions, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { memo, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { ScrollView as ScrollViewType } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface AnimatedLyricLineProps {
  text: string;
  isCurrent: boolean;
  isPast: boolean;
  hasTiming: boolean;
  accentColor: string;
  onPress: () => void;
}

const AnimatedLyricLine = memo(function AnimatedLyricLine({
  text,
  isCurrent,
  isPast,
  hasTiming,
  accentColor,
  onPress,
}: AnimatedLyricLineProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(isPast ? 0.5 : 0.8);

  useEffect(() => {
    if (isCurrent) {
      scale.value = withSpring(1.05, { damping: 12, stiffness: 100 });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (isPast) {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.5, { duration: 300 });
    } else {
      scale.value = withTiming(1, { duration: 200 });
      opacity.value = withTiming(0.8, { duration: 200 });
    }
  }, [isCurrent, isPast, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      onPress={hasTiming ? onPress : undefined}
      disabled={!hasTiming}
      style={lyricsStyles.lyricLine}
    >
      <Animated.Text
        style={[
          lyricsStyles.lyricText,
          isCurrent && [lyricsStyles.lyricTextCurrent, { color: accentColor }],
          animatedStyle,
        ]}
      >
        {text || '♪'}
      </Animated.Text>
    </Pressable>
  );
});

interface LyricLine {
  text: string;
  start?: number;
}

interface MobileMusicPlayerInfoProps {
  showLyricsView: boolean;
  lyrics: LyricLine[] | null;
  lyricsLoading: boolean;
  currentLyricIndex: number;
  lyricsScrollRef: React.RefObject<ScrollViewType>;
  accentColor: string;
  albumArtUrl: string | null;
  displayName: string | null;
  albumArtist: string | null;
  isFavorite: boolean;
  item: any;
  albumStyle: any;
  onToggleFavorite: () => void;
  onGoToArtist: () => void;
  onSeekToLyric: (index: number) => void;
}

export function MobileMusicPlayerInfo({
  showLyricsView,
  lyrics,
  lyricsLoading,
  currentLyricIndex,
  lyricsScrollRef,
  accentColor,
  albumArtUrl,
  displayName,
  albumArtist,
  isFavorite,
  item,
  albumStyle,
  onToggleFavorite,
  onGoToArtist,
  onSeekToLyric,
}: MobileMusicPlayerInfoProps) {
  const { t } = useTranslation();

  if (showLyricsView) {
    return (
      <View style={lyricsStyles.container}>
        <ScrollView
          ref={lyricsScrollRef}
          style={lyricsStyles.scrollView}
          contentContainerStyle={lyricsStyles.scrollContent}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEventThrottle={16}
          onScrollBeginDrag={(e) => e.stopPropagation()}
        >
          {lyricsLoading ? (
            <View style={lyricsStyles.loadingContainer}>
              <ActivityIndicator color={accentColor} size="large" />
            </View>
          ) : lyrics && lyrics.length > 0 ? (
            lyrics.map((line, index) => (
              <AnimatedLyricLine
                key={index}
                text={line.text}
                isCurrent={index === currentLyricIndex}
                isPast={index < currentLyricIndex}
                hasTiming={line.start !== undefined}
                accentColor={accentColor}
                onPress={() => onSeekToLyric(index)}
              />
            ))
          ) : (
            <View style={lyricsStyles.emptyContainer}>
              <Ionicons name="musical-notes" size={48} color="rgba(255,255,255,0.2)" />
              <Text style={lyricsStyles.emptyTitle}>{t('player.noLyrics')}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <Animated.View style={albumStyle}>
        <View
          style={{
            width: SCREEN_WIDTH - 80,
            height: SCREEN_WIDTH - 80,
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 20 },
            shadowOpacity: 0.5,
            shadowRadius: 30,
            elevation: 20,
            marginBottom: 32,
          }}
        >
          {albumArtUrl ? (
            <Image
              source={{ uri: albumArtUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="musical-note" size={80} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>
      </Animated.View>

      <View style={{ width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 16 }}>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }} numberOfLines={1}>
            {displayName ?? t('player.unknownTrack')}
          </Text>
          <Pressable onPress={onGoToArtist} disabled={!(item as any)?.ArtistItems?.[0]?.Id}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginTop: 4 }} numberOfLines={1}>
              {albumArtist}
            </Text>
          </Pressable>
        </View>
        <Pressable onPress={onToggleFavorite} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons
            name={isFavorite ? "heart" : "heart-outline"}
            size={26}
            color={isFavorite ? accentColor : "#fff"}
          />
        </Pressable>
      </View>
    </View>
  );
}

const lyricsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  lyricLine: {
    paddingVertical: 8,
  },
  lyricText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
  },
  lyricTextCurrent: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 36,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    gap: 16,
  },
  emptyTitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16,
  },
});
