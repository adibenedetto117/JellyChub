import { View, Text } from 'react-native';
import type { TasksTabProps } from './types';
import { TaskCard } from './TaskCard';

export function TasksTab({ tasks, onRun, onStop, accentColor }: TasksTabProps) {
  const runningTasks = tasks.filter((t) => t.State === 'Running' && !t.IsHidden);
  const idleTasks = tasks.filter((t) => t.State !== 'Running' && !t.IsHidden);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {runningTasks.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>
            Running ({runningTasks.length})
          </Text>
          {runningTasks.map((task) => (
            <TaskCard key={task.Id} task={task} onRun={() => onRun(task.Id)} onStop={() => onStop(task.Id)} accentColor={accentColor} />
          ))}
        </>
      )}

      {idleTasks.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12, marginTop: runningTasks.length > 0 ? 16 : 0 }}>
            Available Tasks ({idleTasks.length})
          </Text>
          {idleTasks.map((task) => (
            <TaskCard key={task.Id} task={task} onRun={() => onRun(task.Id)} onStop={() => onStop(task.Id)} accentColor={accentColor} />
          ))}
        </>
      )}

      {tasks.filter(t => !t.IsHidden).length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No scheduled tasks</Text>
        </View>
      )}
    </View>
  );
}
