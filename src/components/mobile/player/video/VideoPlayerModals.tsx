import React from 'react';
import { View, Text, Pressable, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { VIDEO_SPEED_OPTIONS, QUALITY_OPTIONS, StreamingQuality } from '@/constants/videoPlayer';

interface SpeedSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentSpeed: number;
  onSelectSpeed: (speed: number) => void;
  accentColor: string;
}

export function SpeedSelectorModal({
  visible,
  onClose,
  currentSpeed,
  onSelectSpeed,
  accentColor,
}: SpeedSelectorModalProps) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0 bg-black/60 items-center justify-center">
      <Pressable onPress={onClose} className="absolute inset-0" />
      <View
        className="bg-neutral-900 rounded-2xl p-6 mx-8"
        style={{ maxWidth: 400, width: '90%' }}
      >
        <Text className="text-white text-lg font-bold mb-4 text-center">Playback Speed</Text>
        <View className="flex-row flex-wrap justify-center gap-2">
          {VIDEO_SPEED_OPTIONS.map((speed) => {
            const isActive = currentSpeed === speed;
            return (
              <Pressable
                key={speed}
                onPress={() => onSelectSpeed(speed)}
                className="rounded-lg items-center justify-center"
                style={{
                  width: 70,
                  height: 44,
                  backgroundColor: isActive ? accentColor : 'rgba(255,255,255,0.1)',
                }}
              >
                <Text
                  className="font-semibold"
                  style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.8)' }}
                >
                  {speed}x
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={onClose}
          className="mt-4 py-3 rounded-lg bg-white/10 items-center"
        >
          <Text className="text-white font-medium">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

interface QualitySelectorModalProps {
  visible: boolean;
  onClose: () => void;
  currentQuality: StreamingQuality;
  onSelectQuality: (quality: StreamingQuality) => void;
  accentColor: string;
}

export function QualitySelectorModal({
  visible,
  onClose,
  currentQuality,
  onSelectQuality,
  accentColor,
}: QualitySelectorModalProps) {
  const { height: screenHeight } = useWindowDimensions();

  if (!visible) return null;

  return (
    <Pressable
      onPress={onClose}
      className="absolute inset-0 bg-black/80 items-center justify-center z-50"
    >
      <View
        className="bg-zinc-900 rounded-2xl p-6 w-80"
        style={{ maxHeight: screenHeight * 0.7 }}
      >
        <Text className="text-white text-lg font-bold mb-4 text-center">Streaming Quality</Text>
        <Text className="text-white/50 text-xs mb-4 text-center">
          Higher quality uses more data and may buffer on slow connections
        </Text>
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flexGrow: 0 }}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {QUALITY_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                onSelectQuality(option.value as StreamingQuality);
                onClose();
              }}
              className="flex-row items-center py-3 border-b border-white/10"
              style={{ backgroundColor: currentQuality === option.value ? accentColor + '20' : 'transparent' }}
            >
              <View className="flex-1">
                <Text className="text-white">{option.label}</Text>
                <Text className="text-white/50 text-xs">{option.desc}</Text>
              </View>
              {currentQuality === option.value && (
                <Ionicons name="checkmark" size={20} color={accentColor} />
              )}
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          onPress={onClose}
          className="mt-4 py-3 rounded-lg bg-white/10 items-center"
        >
          <Text className="text-white font-medium">Close</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

interface ControlsLockedOverlayProps {
  visible: boolean;
  onUnlock: () => void;
}

export function ControlsLockedOverlay({ visible, onUnlock }: ControlsLockedOverlayProps) {
  if (!visible) return null;

  return (
    <View className="absolute inset-0" pointerEvents="box-only">
      <Pressable
        onPress={onUnlock}
        className="absolute bottom-8 left-1/2 -ml-16 w-32 h-12 rounded-full bg-black/70 flex-row items-center justify-center gap-2"
      >
        <Ionicons name="lock-closed" size={18} color="#ef4444" />
        <Text className="text-white text-sm font-medium">Unlock</Text>
      </Pressable>
    </View>
  );
}
