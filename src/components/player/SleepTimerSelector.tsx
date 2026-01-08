import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { useSettingsStore } from '@/stores';
import type { VideoSleepTimer, VideoSleepTimerType } from '@/types/player';

const SLEEP_OPTIONS = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
];

interface SleepTimerSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectTimer: (timer: VideoSleepTimer | undefined) => void;
  currentTimer?: VideoSleepTimer;
  isEpisode?: boolean;
  episodeEndTimeMs?: number;
}

export const SleepTimerSelector = memo(function SleepTimerSelector({
  visible,
  onClose,
  onSelectTimer,
  currentTimer,
  isEpisode = false,
  episodeEndTimeMs,
}: SleepTimerSelectorProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customMinutes, setCustomMinutes] = useState('');
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    setShowCustomInput(false);
    setCustomMinutes('');
    onClose();
  }, [onClose]);

  const handleSelectDuration = useCallback((minutes: number) => {
    const timer: VideoSleepTimer = {
      type: 'duration',
      endTime: Date.now() + minutes * 60 * 1000,
      durationMinutes: minutes,
    };
    onSelectTimer(timer);
    handleClose();
  }, [onSelectTimer, handleClose]);

  const handleSelectEndOfEpisode = useCallback(() => {
    if (episodeEndTimeMs === undefined) return;
    const timer: VideoSleepTimer = {
      type: 'end_of_episode',
      endTime: Date.now() + episodeEndTimeMs,
    };
    onSelectTimer(timer);
    handleClose();
  }, [episodeEndTimeMs, onSelectTimer, handleClose]);

  const handleSelectCustom = useCallback(() => {
    const minutes = parseInt(customMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) return;
    const timer: VideoSleepTimer = {
      type: 'custom',
      endTime: Date.now() + minutes * 60 * 1000,
      durationMinutes: minutes,
    };
    onSelectTimer(timer);
    handleClose();
  }, [customMinutes, onSelectTimer, handleClose]);

  const handleClearTimer = useCallback(() => {
    onSelectTimer(undefined);
    handleClose();
  }, [onSelectTimer, handleClose]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY > 80 || e.velocityY > 400) {
        translateY.value = withTiming(400, { duration: 200 });
        runOnJS(handleClose)();
      } else {
        translateY.value = withSpring(0, { damping: 20 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                {
                  backgroundColor: '#1a1a1a',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingBottom: 40,
                },
                sheetStyle,
              ]}
            >
              <View style={{ paddingTop: 12, paddingBottom: 16, alignItems: 'center' }}>
                <View style={{ width: 48, height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2 }} />
              </View>

              <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 }}>
                  Sleep Timer
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>
                  Pause playback after a set time
                </Text>
              </View>

              <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 8 }}>
                {currentTimer && (
                  <Pressable
                    onPress={handleClearTimer}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: 'rgba(255,100,100,0.2)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="close-circle" size={22} color="#ff6b6b" />
                      <Text style={{ color: '#ff6b6b', fontSize: 16, fontWeight: '500' }}>
                        Turn Off Timer
                      </Text>
                    </View>
                  </Pressable>
                )}

                {isEpisode && episodeEndTimeMs !== undefined && (
                  <Pressable
                    onPress={handleSelectEndOfEpisode}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: currentTimer?.type === 'end_of_episode' ? accentColor : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Ionicons name="flag" size={20} color="#fff" />
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                        End of Episode
                      </Text>
                    </View>
                    {currentTimer?.type === 'end_of_episode' && (
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    )}
                  </Pressable>
                )}

                {SLEEP_OPTIONS.map((option) => {
                  const isActive = currentTimer?.type === 'duration' && currentTimer.durationMinutes === option.minutes;
                  return (
                    <Pressable
                      key={option.minutes}
                      onPress={() => handleSelectDuration(option.minutes)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        borderRadius: 10,
                        marginBottom: 8,
                        backgroundColor: isActive ? accentColor : 'rgba(255,255,255,0.05)',
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                        {option.label}
                      </Text>
                      {isActive && <Ionicons name="checkmark" size={20} color="#fff" />}
                    </Pressable>
                  );
                })}

                {showCustomInput ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <TextInput
                      value={customMinutes}
                      onChangeText={setCustomMinutes}
                      placeholder="Minutes"
                      placeholderTextColor="rgba(255,255,255,0.3)"
                      keyboardType="number-pad"
                      autoFocus
                      style={{
                        flex: 1,
                        color: '#fff',
                        fontSize: 16,
                        paddingVertical: 8,
                      }}
                    />
                    <Pressable
                      onPress={handleSelectCustom}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 8,
                        backgroundColor: accentColor,
                        marginLeft: 8,
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '600' }}>Set</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setShowCustomInput(false);
                        setCustomMinutes('');
                      }}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        marginLeft: 4,
                      }}
                    >
                      <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Cancel</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => setShowCustomInput(true)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderRadius: 10,
                      marginBottom: 8,
                      backgroundColor: currentTimer?.type === 'custom' ? accentColor : 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <Ionicons name="timer-outline" size={20} color="#fff" style={{ marginRight: 12 }} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                      Custom Time
                    </Text>
                  </Pressable>
                )}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

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
