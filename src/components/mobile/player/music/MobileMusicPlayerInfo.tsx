import { View, Text, Pressable, Image, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { ScrollView as ScrollViewType } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LyricLine {
  text: string;
  time?: number;
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
}: MobileMusicPlayerInfoProps) {
  const { t } = useTranslation();

  if (showLyricsView) {
    return (
      <ScrollView
        ref={lyricsScrollRef}
        style={{ flex: 1, paddingHorizontal: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingVertical: 48, alignItems: 'center' }}>
          {lyricsLoading ? (
            <ActivityIndicator color={accentColor} size="large" />
          ) : lyrics && lyrics.length > 0 ? (
            lyrics.map((line, index) => {
              const isCurrent = index === currentLyricIndex;
              const isPast = index < currentLyricIndex;

              return (
                <Text
                  key={index}
                  style={{
                    color: isCurrent ? accentColor : isPast ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.8)',
                    fontSize: isCurrent ? 24 : 20,
                    fontWeight: isCurrent ? '700' : '600',
                    textAlign: 'center',
                    lineHeight: 40,
                    marginBottom: 16,
                  }}
                >
                  {line.text}
                </Text>
              );
            })
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 80 }}>
              <Ionicons name="text" size={48} color="rgba(255,255,255,0.3)" />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 18, marginTop: 16 }}>{t('player.noLyrics')}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginTop: 8 }}>Lyrics will appear here when available</Text>
            </View>
          )}
        </View>
      </ScrollView>
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
