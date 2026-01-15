import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import type { TimerInfo } from '@/types/livetv';

interface TimerCardProps {
  timer: TimerInfo;
  onDelete: () => void;
  accentColor: string;
}

export const TimerCard = memo(function TimerCard({
  timer,
  onDelete,
  accentColor,
}: TimerCardProps) {
  const startTime = timer.StartDate
    ? new Date(timer.StartDate).toLocaleString()
    : '';
  const status = timer.Status || 'Scheduled';

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="timer-outline" size={28} color={accentColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {timer.Name}
        </Text>
        {timer.ChannelName && (
          <Text style={styles.channel}>{timer.ChannelName}</Text>
        )}
        <Text style={styles.time}>{startTime}</Text>
        <Text style={styles.status}>{status}</Text>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="close-circle-outline" size={24} color={colors.status.error} />
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  channel: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  status: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
