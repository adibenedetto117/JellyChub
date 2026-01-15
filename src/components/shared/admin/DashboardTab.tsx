import { View, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import type { DashboardTabProps } from './types';
import { StatBox } from './StatBox';
import { ActionButton } from './ActionButton';
import { NowPlayingRow } from './NowPlayingRow';
import { formatRelativeTime, formatBitrate } from './utils';

export function DashboardTab({
  systemInfo,
  itemCounts,
  activityLog,
  serverHealth,
  runningTasks,
  libraryScanTask,
  activeSessions,
  onRefreshLibrary,
  onRestartServer,
  onShutdownServer,
  isRefreshing,
  accentColor,
  hideMedia,
}: DashboardTabProps) {
  const isScanning = libraryScanTask?.State === 'Running';
  const scanProgress = libraryScanTask?.CurrentProgressPercentage;

  return (
    <View style={{ paddingHorizontal: 16 }}>
      <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: '#22c55e',
              marginRight: 8,
            }} />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 17 }}>Server Online</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
            v{systemInfo?.Version ?? '-'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatBox
            label="Active Streams"
            value={serverHealth.activeSessions}
            color={serverHealth.activeSessions > 0 ? accentColor : 'rgba(255,255,255,0.5)'}
          />
          <StatBox
            label="Transcoding"
            value={serverHealth.activeTranscodes}
            color={serverHealth.activeTranscodes > 0 ? '#f97316' : 'rgba(255,255,255,0.5)'}
          />
          <StatBox
            label="Direct Play"
            value={serverHealth.directPlayCount}
            color={serverHealth.directPlayCount > 0 ? '#22c55e' : 'rgba(255,255,255,0.5)'}
          />
          <StatBox
            label="Direct Stream"
            value={serverHealth.directStreamCount}
            color={serverHealth.directStreamCount > 0 ? '#0ea5e9' : 'rgba(255,255,255,0.5)'}
          />
        </View>

        {serverHealth.totalBandwidth > 0 && (
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              Total Bandwidth: {formatBitrate(serverHealth.totalBandwidth)}
            </Text>
          </View>
        )}

        {systemInfo?.HasUpdateAvailable && (
          <View style={{ backgroundColor: `${accentColor}20`, marginTop: 12, padding: 10, borderRadius: 8 }}>
            <Text style={{ color: accentColor, fontSize: 13, fontWeight: '500' }}>Server update available</Text>
          </View>
        )}
      </View>

      {activeSessions.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Now Playing</Text>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
            {activeSessions.slice(0, 3).map((session, index) => (
              <NowPlayingRow
                key={session.Id}
                session={session}
                hideMedia={hideMedia}
                userIndex={index}
                accentColor={accentColor}
                isLast={index === Math.min(activeSessions.length - 1, 2)}
              />
            ))}
            {activeSessions.length > 3 && (
              <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: colors.background.primary }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  +{activeSessions.length - 3} more streams
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {(isScanning || runningTasks.length > 0) && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Running Tasks</Text>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
            {runningTasks.map((task, index) => (
              <View
                key={task.Id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < runningTasks.length - 1 ? 1 : 0,
                  borderBottomColor: colors.background.primary,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 }} numberOfLines={1}>
                    {task.Name}
                  </Text>
                  <ActivityIndicator size="small" color={accentColor} />
                </View>
                {task.CurrentProgressPercentage !== undefined && (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                      <View style={{ width: `${task.CurrentProgressPercentage}%`, backgroundColor: accentColor, height: '100%' }} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                      {Math.round(task.CurrentProgressPercentage)}% complete
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Movies', value: itemCounts?.MovieCount ?? 0 },
          { label: 'Series', value: itemCounts?.SeriesCount ?? 0 },
          { label: 'Episodes', value: itemCounts?.EpisodeCount ?? 0 },
          { label: 'Albums', value: itemCounts?.AlbumCount ?? 0 },
          { label: 'Songs', value: itemCounts?.SongCount ?? 0 },
          { label: 'Books', value: itemCounts?.BookCount ?? 0 },
        ].map((stat) => (
          <View key={stat.label} style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 12, minWidth: 95 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{stat.label}</Text>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>
              {stat.value.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <ActionButton
          label={isScanning ? `Scanning ${scanProgress ? `${Math.round(scanProgress)}%` : '...'}` : 'Scan Library'}
          onPress={onRefreshLibrary}
          loading={isRefreshing}
          color={accentColor}
          disabled={isScanning}
        />
        <ActionButton label="Restart Server" onPress={onRestartServer} color="#f97316" />
        <ActionButton label="Shutdown" onPress={onShutdownServer} color="#ef4444" />
      </View>

      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Recent Activity</Text>
      <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
        {activityLog?.slice(0, 8).map((activity, index) => (
          <View key={activity.Id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: index < 7 ? 1 : 0, borderBottomColor: colors.background.primary }}>
            <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{activity.Name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{formatRelativeTime(activity.Date)}</Text>
          </View>
        ))}
        {(!activityLog || activityLog.length === 0) && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 24 }}>No recent activity</Text>
        )}
      </View>
    </View>
  );
}
