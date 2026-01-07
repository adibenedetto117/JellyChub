import { View, Text, Pressable } from 'react-native';
import { memo } from 'react';
import Animated, { FadeIn } from 'react-native-reanimated';
import { jellyseerrClient } from '@/api/jellyseerr';
import { CachedImage } from '@/components/ui/CachedImage';
import { StatusBadge } from './StatusBadge';
import { useSettingsStore } from '@/stores';
import { getDisplayImageUrl, getDisplayYear } from '@/utils';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';
import { MEDIA_STATUS } from '@/types/jellyseerr';

const PLACEHOLDER_TITLES = [
  'The Adventure',
  'Space Journey',
  'Mystery Files',
  'Drama Chronicles',
  'Action Hero',
  'Comedy Night',
  'Sci-Fi Station',
  'Romance Story',
];

interface Props {
  item: JellyseerrDiscoverItem;
  onPress: () => void;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const sizes = {
  small: { width: 100, height: 150 },
  medium: { width: 130, height: 195 },
  large: { width: 160, height: 240 },
};

export const JellyseerrPosterCard = memo(function JellyseerrPosterCard({
  item,
  onPress,
  showTitle = true,
  size = 'medium',
}: Props) {
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const dimensions = sizes[size];

  const rawImageUrl = jellyseerrClient.getImageUrl(item?.posterPath, 'w342');
  const itemId = String(item?.id || '0');
  const imageUrl = getDisplayImageUrl(itemId, rawImageUrl, hideMedia, 'Primary');

  const rawTitle = item?.title || item?.name || 'Unknown';
  const titleIndex = Math.abs(item?.id || 0) % PLACEHOLDER_TITLES.length;
  const title = hideMedia ? PLACEHOLDER_TITLES[titleIndex] : rawTitle;

  const rawYear = item?.releaseDate?.split('-')[0] || item?.firstAirDate?.split('-')[0];
  const year = hideMedia ? '2024' : rawYear;

  const mediaStatus = item?.mediaInfo?.status;
  const hasStatus = mediaStatus && mediaStatus !== MEDIA_STATUS.UNKNOWN;

  return (
    <Pressable onPress={onPress} style={{ marginRight: 12 }}>
      <Animated.View entering={FadeIn.duration(150)}>
        <View
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: colors.surface.default,
          }}
        >
          <CachedImage
            uri={imageUrl}
            style={{ width: dimensions.width, height: dimensions.height }}
            borderRadius={12}
            fallbackText={title.charAt(0)?.toUpperCase() || '?'}
            priority={size === 'large' ? 'high' : 'normal'}
          />

          {hasStatus && (
            <View style={{ position: 'absolute', top: 6, left: 6 }}>
              <StatusBadge status={mediaStatus} type="media" size="small" variant="overlay" mediaType={item?.mediaType} />
            </View>
          )}
        </View>

        {showTitle && (
          <View style={{ width: dimensions.width, marginTop: 8 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
              {title}
            </Text>
            {year && (
              <Text style={{ color: colors.text.tertiary, fontSize: 11 }} numberOfLines={1}>
                {year}
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
});
