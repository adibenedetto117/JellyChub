import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { getImageUrl } from '@/api';
import { formatDuration, getWatchProgress, formatEpisodeNumber, ticksToMs } from '@/utils';
import { CachedImage } from '@/components/ui/CachedImage';
import { useResponsive } from '@/hooks';
import { useSettingsStore } from '@/stores';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
}

interface ContinueCardProps {
  item: BaseItem;
  onPress: () => void;
  cardWidth: number;
  cardHeight: number;
  fontSize: { xs: number; sm: number; base: number };
  accentColor: string;
}

const ContinueCard = memo(function ContinueCard({ item, onPress, cardWidth, cardHeight, fontSize, accentColor }: ContinueCardProps) {
  const progress = getWatchProgress(item);
  const remainingTicks = (item.RunTimeTicks ?? 0) - (item.UserData?.PlaybackPositionTicks ?? 0);
  const remainingTime = formatDuration(ticksToMs(remainingTicks));

  const imageTag = item.BackdropImageTags?.[0] ?? item.ImageTags?.Primary;
  const imageType = item.BackdropImageTags?.[0] ? 'Backdrop' : 'Primary';

  const imageUrl = imageTag
    ? getImageUrl(item.Id, imageType, {
        maxWidth: cardWidth * 2,
        maxHeight: cardHeight * 2,
        tag: imageTag,
      })
    : null;

  const subtitle = item.Type === 'Episode'
    ? `${(item as { SeriesName?: string }).SeriesName} ${formatEpisodeNumber(
        (item as { ParentIndexNumber?: number }).ParentIndexNumber,
        (item as { IndexNumber?: number }).IndexNumber
      )}`
    : item.ProductionYear?.toString();

  return (
    <Pressable onPress={onPress} style={styles.cardPressable}>
      <Animated.View entering={FadeIn.duration(150)}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={[styles.imageContainer, { height: cardHeight }]}>
            <CachedImage
              uri={imageUrl}
              style={StyleSheet.absoluteFill}
              fallbackText={item.Name.charAt(0).toUpperCase()}
              priority="high"
            />

            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.cardContent}>
              <Text style={[styles.cardTitle, { fontSize: fontSize.base }]} numberOfLines={1}>
                {item.Name}
              </Text>
              {subtitle && (
                <Text style={[styles.cardSubtitle, { fontSize: fontSize.xs }]} numberOfLines={1}>
                  {subtitle}
                </Text>
              )}
            </View>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: accentColor }]} />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={[styles.remainingText, { fontSize: fontSize.xs }]}>
              {remainingTime} remaining
            </Text>
            <View style={[styles.resumeButton, { backgroundColor: accentColor + '33' }]}>
              <Text style={[styles.resumeText, { fontSize: fontSize.xs, color: accentColor }]}>Resume</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
});

export const ContinueWatching = memo(function ContinueWatching({
  items,
  onItemPress,
}: Props) {
  const { isTablet, isTV, fontSize } = useResponsive();
  const accentColor = useSettingsStore((s) => s.accentColor);

  if (!items.length) return null;

  const cardWidth = isTV ? 400 : isTablet ? 340 : 288;
  const cardHeight = isTV ? 225 : isTablet ? 190 : 160;
  const horizontalPadding = isTV ? 48 : isTablet ? 24 : 16;
  const marginBottom = isTV ? 40 : isTablet ? 32 : 24;

  return (
    <View style={{ marginBottom }}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Text style={[styles.title, { fontSize: fontSize.lg }]}>Continue Watching</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: horizontalPadding }}
      >
        {items.map((item) => (
          <ContinueCard
            key={item.Id}
            item={item}
            onPress={() => onItemPress(item)}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            fontSize={fontSize}
            accentColor={accentColor}
          />
        ))}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  cardPressable: {
    marginRight: 16,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#1c1c1c',
  },
  imageContainer: {
    position: 'relative',
  },
  cardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  cardTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  remainingText: {
    color: 'rgba(255,255,255,0.5)',
  },
  resumeButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resumeText: {
    fontWeight: '500',
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: '#fff',
    fontWeight: '600',
  },
});
