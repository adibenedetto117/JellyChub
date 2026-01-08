import { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { getChannelImageUrl } from '@/api';
import type { LiveTvChannel } from '@/types/livetv';

interface ChannelCardProps {
  channel: LiveTvChannel;
  isFavorite?: boolean;
  isPlaying?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
  onFavoritePress?: () => void;
  accentColor: string;
}

export const ChannelCard = memo(function ChannelCard({
  channel,
  isFavorite = false,
  isPlaying = false,
  onPress,
  onLongPress,
  onFavoritePress,
  accentColor,
}: ChannelCardProps) {
  const imageUrl = channel.ImageTags?.Primary
    ? getChannelImageUrl(channel.Id, { maxWidth: 200, tag: channel.ImageTags.Primary })
    : null;

  const channelNumber = channel.Number ?? channel.ChannelNumber;
  const currentProgram = channel.CurrentProgram;

  const handleFavoritePress = useCallback(() => {
    onFavoritePress?.();
  }, [onFavoritePress]);

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.container,
        isPlaying && { borderColor: accentColor, borderWidth: 2 },
      ]}
    >
      <View style={styles.channelInfo}>
        <View style={styles.logoContainer}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.logo}
              contentFit="contain"
              cachePolicy="memory-disk"
              recyclingKey={channel.Id}
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
            <Text style={styles.channelName} numberOfLines={1}>
              {channel.Name}
            </Text>
          </View>

          {currentProgram && (
            <Text style={styles.programName} numberOfLines={1}>
              {currentProgram.Name}
            </Text>
          )}
        </View>
      </View>

      {onFavoritePress && (
        <Pressable onPress={handleFavoritePress} style={styles.favoriteButton}>
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? '#FFD700' : colors.text.tertiary}
          />
        </Pressable>
      )}

      {isPlaying && (
        <View style={[styles.playingIndicator, { backgroundColor: accentColor }]}>
          <Ionicons name="play" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 56,
    height: 40,
    marginRight: 12,
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface.elevated,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    color: colors.text.tertiary,
    fontSize: 18,
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
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    minWidth: 32,
  },
  channelName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  programName: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  favoriteButton: {
    padding: 8,
    marginLeft: 8,
  },
  playingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
