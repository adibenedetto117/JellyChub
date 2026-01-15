import { View, Text, Pressable } from 'react-native';
import { colors } from '@/theme';
import type { StreamsTabProps } from './types';
import { StreamCard } from './StreamCard';
import { formatRelativeTime, getHiddenUserName } from './utils';

export function StreamsTab({
  activeSessions,
  idleSessions,
  onKillStream,
  onStopPlayback,
  onPlay,
  onPause,
  accentColor,
  hideMedia,
}: StreamsTabProps) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {activeSessions.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>
            Active Streams ({activeSessions.length})
          </Text>
          {activeSessions.map((session, index) => (
            <StreamCard
              key={session.Id}
              session={session}
              onKillStream={() => onKillStream(session)}
              onStopPlayback={() => onStopPlayback(session)}
              onPlay={() => onPlay(session)}
              onPause={() => onPause(session)}
              accentColor={accentColor}
              hideMedia={hideMedia}
              userIndex={index}
            />
          ))}
        </>
      )}

      {idleSessions.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12, marginTop: activeSessions.length > 0 ? 16 : 0 }}>
            Connected Devices ({idleSessions.length})
          </Text>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
            {idleSessions.map((session, index) => (
              <View
                key={session.Id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < idleSessions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.background.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>
                    {hideMedia ? getHiddenUserName(activeSessions.length + index) : session.UserName}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    {session.Client} on {session.DeviceName}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                    Last seen {formatRelativeTime(session.LastActivityDate)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onKillStream(session)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: 6 }}
                >
                  <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '500' }}>Disconnect</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}

      {activeSessions.length === 0 && idleSessions.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>No active sessions</Text>
          <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 4 }}>Pull down to refresh</Text>
        </View>
      )}
    </View>
  );
}
