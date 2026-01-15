import { memo, useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { getChannelImageUrl } from '@/api';
import { tvConstants } from '@/utils/platform';
import type { LiveTvChannel } from '@/types/livetv';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TVChannelCardProps {
  channel: LiveTvChannel;
  isFavorite?: boolean;
  isPlaying?: boolean;
  onPress: () => void;
  onFavoritePress?: () => void;
  accentColor: string;
  autoFocus?: boolean;
}

export const TVChannelCard = memo(function TVChannelCard({
  channel,
  isFavorite = false,
  isPlaying = false,
  onPress,
  onFavoritePress,
  accentColor,
  autoFocus = false,
}: TVChannelCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const imageUrl = channel.ImageTags?.Primary
    ? getChannelImageUrl(channel.Id, { maxWidth: 300, tag: channel.ImageTags.Primary })
    : null;

  const channelNumber = channel.Number ?? channel.ChannelNumber;
  const currentProgram = channel.CurrentProgram;

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    scale.value = withTiming(tvConstants.focusScale, { duration: tvConstants.focusDuration });
    borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
  }, [scale, borderOpacity]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    scale.value = withTiming(1, { duration: tvConstants.focusDuration });
    borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
  }, [scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={autoFocus}
      style={[styles.container, animatedStyle]}
    >
      <View style={[styles.inner, isPlaying && { borderColor: accentColor, borderWidth: 3 }]}>
        <View style={styles.logoContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.logo}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Text style={styles.logoPlaceholderText}>
                {channel.Name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.textContainer}>
          <View style={styles.nameRow}>
            {channelNumber && (
              <Text style={styles.channelNumber}>{channelNumber}</Text>
            )}
            <Text style={[styles.channelName, isFocused && { color: '#fff' }]} numberOfLines={1}>
              {channel.Name}
            </Text>
            {isFavorite && (
              <Ionicons name="star" size={16} color="#FFD700" style={styles.starIcon} />
            )}
          </View>

          {currentProgram && (
            <Text style={styles.programName} numberOfLines={1}>
              {currentProgram.Name}
            </Text>
          )}
        </View>

        {isPlaying && (
          <View style={[styles.playingIndicator, { backgroundColor: accentColor }]}>
            <Ionicons name="play" size={16} color="#fff" />
          </View>
        )}

        <Animated.View
          style={[
            styles.focusBorder,
            animatedBorderStyle,
            { borderColor: accentColor },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
});

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginVertical: 6,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  logoContainer: {
    width: 80,
    height: 56,
    marginRight: 16,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface.elevated,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    color: colors.text.tertiary,
    fontSize: 24,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelNumber: {
    color: colors.text.tertiary,
    fontSize: 18,
    fontWeight: '600',
    marginRight: 12,
    minWidth: 48,
  },
  channelName: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  starIcon: {
    marginLeft: 8,
  },
  programName: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 4,
  },
  playingIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: tvConstants.focusRingWidth,
    borderRadius: 16,
  },
});
