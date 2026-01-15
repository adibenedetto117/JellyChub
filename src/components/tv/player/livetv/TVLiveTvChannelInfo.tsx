import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LiveTvChannel } from '@/types/livetv';

interface TVLiveTvChannelInfoProps {
  channel: LiveTvChannel | null | undefined;
  isFavorite: boolean;
}

export function TVLiveTvChannelInfo({
  channel,
  isFavorite,
}: TVLiveTvChannelInfoProps) {
  if (!channel) return null;

  return (
    <View style={styles.channelInfo}>
      <View style={styles.channelHeader}>
        <Text style={styles.channelName}>{channel.Name}</Text>
        {isFavorite && (
          <Ionicons name="star" size={24} color="#FFD700" style={styles.favoriteIcon} />
        )}
      </View>
      {channel.Number && (
        <Text style={styles.channelNumberBadge}>Channel {channel.Number}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  channelInfo: {
    flex: 1,
  },
  channelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  favoriteIcon: {
    marginLeft: 12,
  },
  channelNumberBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 18,
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
