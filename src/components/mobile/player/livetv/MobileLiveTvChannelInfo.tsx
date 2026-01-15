import { View, Text, StyleSheet } from 'react-native';
import type { LiveTvChannel } from '@/types/livetv';

interface MobileLiveTvChannelInfoProps {
  channel: LiveTvChannel | null | undefined;
}

export function MobileLiveTvChannelInfo({ channel }: MobileLiveTvChannelInfoProps) {
  if (!channel) return null;

  return (
    <View style={styles.channelInfo}>
      <Text style={styles.channelName}>{channel.Name}</Text>
      {channel.Number && (
        <Text style={styles.channelNumberBadge}>CH {channel.Number}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  channelInfo: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  channelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  channelNumberBadge: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
