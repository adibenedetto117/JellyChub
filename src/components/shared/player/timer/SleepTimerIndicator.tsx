import { useState, useEffect, memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import type { VideoSleepTimer } from '@/types/player';

interface SleepTimerIndicatorProps {
  sleepTimer?: VideoSleepTimer;
  onPress: () => void;
}

export const SleepTimerIndicator = memo(function SleepTimerIndicator({
  sleepTimer,
  onPress,
}: SleepTimerIndicatorProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);

  useEffect(() => {
    if (!sleepTimer) {
      setRemainingTime(null);
      return;
    }

    const updateTime = () => {
      const remaining = Math.max(0, sleepTimer.endTime - Date.now());
      setRemainingTime(remaining);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer]);

  if (!sleepTimer || remainingTime === null) return null;

  const formatRemainingTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: accentColor + '40',
      }}
    >
      <Ionicons name="moon" size={14} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
        {formatRemainingTime(remainingTime)}
      </Text>
    </Pressable>
  );
});
