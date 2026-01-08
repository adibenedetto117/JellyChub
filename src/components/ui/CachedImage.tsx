import { Image, ImageStyle, ImageContentFit, ImageProps } from 'expo-image';
import { StyleProp, ViewStyle, View, Text } from 'react-native';
import { memo, useState, useCallback } from 'react';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Skeleton } from './Skeleton';

const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface Props {
  uri: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  priority?: 'low' | 'normal' | 'high';
  placeholder?: string;
  showSkeleton?: boolean;
  fallbackText?: string;
  borderRadius?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
}

type LoadState = 'loading' | 'loaded' | 'error';

export const CachedImage = memo(function CachedImage({
  uri,
  style,
  contentFit = 'cover',
  priority = 'normal',
  placeholder = blurhash,
  showSkeleton = true,
  fallbackText,
  borderRadius = 0,
  cachePolicy = 'memory-disk',
}: Props) {
  const [loadState, setLoadState] = useState<LoadState>('loading');

  const handleLoad = useCallback(() => {
    setLoadState('loaded');
  }, []);

  const handleError = useCallback(() => {
    setLoadState('error');
  }, []);

  if (!uri || loadState === 'error') {
    return (
      <View
        style={[
          style,
          {
            backgroundColor: '#1a1a1a',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius,
          },
        ]}
      >
        {fallbackText && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 32 }}>
            {fallbackText}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={[style, { borderRadius, overflow: 'hidden' }]}>
      {showSkeleton && loadState === 'loading' && (
        <Animated.View
          exiting={FadeOut.duration(150)}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            zIndex: 1,
          }}
        >
          <Skeleton width="100%" height="100%" borderRadius={borderRadius} />
        </Animated.View>
      )}
      <Image
        source={{ uri }}
        style={[style, { borderRadius }]}
        contentFit={contentFit}
        priority={priority}
        placeholder={{ blurhash: placeholder }}
        placeholderContentFit="cover"
        transition={150}
        cachePolicy={cachePolicy}
        onLoad={handleLoad}
        onError={handleError}
      />
    </View>
  );
});
