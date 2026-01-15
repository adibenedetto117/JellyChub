import { View, Text, Image, Pressable } from 'react-native';
import { colors } from '@/theme';
import { getImageUrl } from '@/api/client';
import type { StreamCardProps } from './types';
import { TranscodeDetail } from './TranscodeDetail';
import { formatDuration, formatBitrate, getHiddenUserName } from './utils';

export function StreamCard({ session, onKillStream, onStopPlayback, onPlay, onPause, accentColor, hideMedia, userIndex }: StreamCardProps) {
  const nowPlaying = session.NowPlayingItem;
  const playState = session.PlayState;
  const transcoding = session.TranscodingInfo;

  const progress = nowPlaying?.RunTimeTicks && playState?.PositionTicks
    ? (playState.PositionTicks / nowPlaying.RunTimeTicks) * 100
    : 0;

  const currentTime = playState?.PositionTicks ? formatDuration(playState.PositionTicks) : '0:00';
  const totalTime = nowPlaying?.RunTimeTicks ? formatDuration(nowPlaying.RunTimeTicks) : '0:00';

  const methodColor: Record<string, string> = {
    DirectPlay: '#22c55e',
    DirectStream: '#0ea5e9',
    Transcode: '#f97316',
  };

  const displayUserName = hideMedia ? getHiddenUserName(userIndex) : session.UserName;
  const imageUrl = nowPlaying?.Id ? getImageUrl(nowPlaying.Id, 'Primary', { maxWidth: 160 }) : null;

  return (
    <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, marginBottom: 12, overflow: 'hidden' }}>
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{displayUserName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{session.Client} on {session.DeviceName}</Text>
            {session.RemoteEndPoint && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{session.RemoteEndPoint}</Text>
            )}
          </View>
          {playState?.PlayMethod && (
            <View style={{ backgroundColor: methodColor[playState.PlayMethod] ?? colors.surface.default, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>{playState.PlayMethod}</Text>
            </View>
          )}
        </View>

        {nowPlaying && (
          <View style={{ backgroundColor: colors.background.primary, borderRadius: 12, padding: 12, flexDirection: 'row' }}>
            {imageUrl && (
              <Image
                source={{ uri: imageUrl }}
                style={{ width: 60, height: 90, borderRadius: 6, marginRight: 12 }}
                resizeMode="cover"
              />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }} numberOfLines={2}>
                {nowPlaying.SeriesName || nowPlaying.Name}
              </Text>
              {nowPlaying.SeriesName && (
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                  S{nowPlaying.ParentIndexNumber}:E{nowPlaying.IndexNumber} - {nowPlaying.Name}
                </Text>
              )}
              {nowPlaying.ProductionYear && (
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 4 }}>{nowPlaying.ProductionYear}</Text>
              )}

              <View style={{ marginTop: 8 }}>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ width: `${progress}%`, backgroundColor: accentColor, height: '100%' }} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{currentTime}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{totalTime}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {transcoding && playState?.PlayMethod === 'Transcode' && (
          <View style={{ marginTop: 12, backgroundColor: 'rgba(249,115,22,0.1)', borderRadius: 8, padding: 10 }}>
            <Text style={{ color: '#f97316', fontSize: 12, fontWeight: '600', marginBottom: 6 }}>Transcoding Details</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {transcoding.VideoCodec && (
                <TranscodeDetail label="Video" value={transcoding.VideoCodec} direct={transcoding.IsVideoDirect} />
              )}
              {transcoding.AudioCodec && (
                <TranscodeDetail label="Audio" value={transcoding.AudioCodec} direct={transcoding.IsAudioDirect} />
              )}
              {transcoding.Width && transcoding.Height && (
                <TranscodeDetail label="Resolution" value={`${transcoding.Width}x${transcoding.Height}`} />
              )}
              {transcoding.Bitrate && (
                <TranscodeDetail label="Bitrate" value={formatBitrate(transcoding.Bitrate)} />
              )}
              {transcoding.Framerate && (
                <TranscodeDetail label="FPS" value={`${transcoding.Framerate}`} />
              )}
            </View>
            {transcoding.TranscodeReasons && transcoding.TranscodeReasons.length > 0 && (
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 8 }}>
                Reason: {transcoding.TranscodeReasons.join(', ')}
              </Text>
            )}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {session.SupportsRemoteControl && (
            <>
              <Pressable
                onPress={playState?.IsPaused ? onPlay : onPause}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: `${accentColor}20`, alignItems: 'center' }}
              >
                <Text style={{ color: accentColor, fontWeight: '600', fontSize: 13 }}>
                  {playState?.IsPaused ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>
              <Pressable
                onPress={onStopPlayback}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Stop</Text>
              </Pressable>
            </>
          )}
          <Pressable
            onPress={onKillStream}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)', alignItems: 'center' }}
          >
            <Text style={{ color: '#f87171', fontWeight: '600', fontSize: 13 }}>Kill Stream</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
