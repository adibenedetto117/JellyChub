import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import type { TaskCardProps } from './types';
import { formatRelativeTime } from './utils';

export function TaskCard({ task, onRun, onStop, accentColor }: TaskCardProps) {
  const isRunning = task.State === 'Running';

  return (
    <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isRunning && (
              <ActivityIndicator size="small" color={accentColor} style={{ marginRight: 8 }} />
            )}
            <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{task.Name}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }} numberOfLines={2}>
            {task.Description}
          </Text>
        </View>
        {isRunning ? (
          <Pressable onPress={onStop} style={{ backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: '#f87171', fontSize: 13, fontWeight: '600' }}>Stop</Text>
          </Pressable>
        ) : (
          <Pressable onPress={onRun} style={{ backgroundColor: `${accentColor}20`, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
            <Text style={{ color: accentColor, fontSize: 13, fontWeight: '600' }}>Run</Text>
          </Pressable>
        )}
      </View>

      {isRunning && task.CurrentProgressPercentage !== undefined && (
        <View style={{ marginTop: 12 }}>
          <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: `${task.CurrentProgressPercentage}%`, backgroundColor: accentColor, height: '100%' }} />
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
            {Math.round(task.CurrentProgressPercentage)}% complete
          </Text>
        </View>
      )}

      {task.LastExecutionResult && !isRunning && (
        <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: task.LastExecutionResult.Status === 'Completed' ? '#22c55e' : '#ef4444',
              marginRight: 6,
            }} />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>
              {task.LastExecutionResult.Status} {formatRelativeTime(task.LastExecutionResult.EndTimeUtc)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
