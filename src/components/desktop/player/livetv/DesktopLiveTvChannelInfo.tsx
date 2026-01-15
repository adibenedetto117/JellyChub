import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { LiveTvChannel } from '@/types/livetv';

interface DesktopLiveTvChannelInfoProps {
  channel: LiveTvChannel | null | undefined;
  accentColor: string;
}

export function DesktopLiveTvChannelInfo({
  channel,
  accentColor,
}: DesktopLiveTvChannelInfoProps) {
  const { t } = useTranslation();

  if (!channel) return null;

  return (
    <>
      <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
        <Text style={styles.liveBadgeText}>{t('player.live')}</Text>
      </View>
      <Text style={styles.channelName}>{channel.Name}</Text>
      {(channel.Number || channel.ChannelNumber) && (
        <Text style={styles.channelNumberBadge}>
          CH {channel.Number ?? channel.ChannelNumber}
        </Text>
      )}
    </>
  );
}

interface DesktopLiveTvChannelDisplayProps {
  channel: LiveTvChannel | null | undefined;
}

export function DesktopLiveTvChannelDisplay({
  channel,
}: DesktopLiveTvChannelDisplayProps) {
  if (!channel) return null;

  return (
    <View style={styles.channelDisplay}>
      <Text style={styles.channelDisplayNumber}>
        {channel.Number ?? channel.ChannelNumber ?? ''}
      </Text>
      <Text style={styles.channelDisplayName}>{channel.Name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  liveBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  channelName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  channelNumberBadge: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  channelDisplay: {
    alignItems: 'center',
    minWidth: 200,
  },
  channelDisplayNumber: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  channelDisplayName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
    marginTop: 8,
  },
});
