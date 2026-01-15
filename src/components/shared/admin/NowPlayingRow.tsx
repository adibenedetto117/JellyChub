import { View, Text, Image } from 'react-native';
import { colors } from '@/theme';
import { getImageUrl } from '@/api/client';
import type { NowPlayingRowProps } from './types';
import { getHiddenUserName } from './utils';

export function NowPlayingRow({ session, hideMedia, userIndex, accentColor, isLast }: NowPlayingRowProps) {
  const nowPlaying = session.NowPlayingItem;
  const playState = session.PlayState;

  const progress = nowPlaying?.RunTimeTicks && playState?.PositionTicks
    ? (playState.PositionTicks / nowPlaying.RunTimeTicks) * 100
    : 0;

  const displayUserName = hideMedia ? getHiddenUserName(userIndex) : session.UserName;

  const methodColor: Record<string, string> = {
    DirectPlay: '#22c55e',
    DirectStream: '#0ea5e9',
    Transcode: '#f97316',
  };

  const imageUrl = nowPlaying?.Id ? getImageUrl(nowPlaying.Id, 'Primary', { maxWidth: 80 }) : null;

  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.background.primary,
    }}>
      {imageUrl && (
        <Image
          source={{ uri: imageUrl }}
          style={{ width: 40, height: 60, borderRadius: 4, marginRight: 12 }}
          resizeMode="cover"
        />
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {nowPlaying?.SeriesName || nowPlaying?.Name}
          </Text>
          {playState?.PlayMethod && (
            <View style={{
              backgroundColor: methodColor[playState.PlayMethod] ?? colors.surface.default,
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
              marginLeft: 8,
            }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '600' }}>
                {playState.PlayMethod === 'DirectPlay' ? 'Direct' : playState.PlayMethod === 'DirectStream' ? 'Stream' : 'HW'}
              </Text>
            </View>
          )}
        </View>
        {nowPlaying?.SeriesName && (
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }} numberOfLines={1}>
            S{nowPlaying.ParentIndexNumber}:E{nowPlaying.IndexNumber} - {nowPlaying.Name}
          </Text>
        )}
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
          {displayUserName} on {session.DeviceName}
        </Text>
        <View style={{ height: 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 1, marginTop: 6, overflow: 'hidden' }}>
          <View style={{ width: `${progress}%`, backgroundColor: accentColor, height: '100%' }} />
        </View>
      </View>
    </View>
  );
}
