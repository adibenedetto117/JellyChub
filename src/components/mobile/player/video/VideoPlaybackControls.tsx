import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { SkipIcon } from './VideoPlayerControls';

interface VideoPlaybackControlsProps {
  playerState: 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
  isLoading: boolean;
  accentColor: string;
  playButtonScale: SharedValue<number>;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  // Frame stepping
  showFrameControls: boolean;
  onFrameStep: (direction: 'prev' | 'next') => void;
}

export function VideoPlaybackControls({
  playerState,
  isLoading,
  accentColor,
  playButtonScale,
  position,
  duration,
  onPlayPause,
  onSeekBackward,
  onSeekForward,
  showFrameControls,
  onFrameStep,
}: VideoPlaybackControlsProps) {
  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  return (
    <View className="absolute inset-0 items-center justify-center">
      <View className="flex-row items-center">
        {/* Seek backward button */}
        <Pressable
          onPress={onSeekBackward}
          className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mx-6 active:bg-white/20"
        >
          <SkipIcon size={22} seconds={10} direction="back" color={accentColor} />
        </Pressable>

        {/* Play/Pause button */}
        <Animated.View style={playButtonStyle}>
          <Pressable
            onPress={onPlayPause}
            className="w-20 h-20 rounded-full items-center justify-center mx-6"
            style={{ backgroundColor: accentColor }}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : playerState === 'playing' ? (
              <Ionicons name="pause" size={36} color="#fff" />
            ) : (
              <Ionicons name="play" size={36} color="#fff" />
            )}
          </Pressable>
        </Animated.View>

        {/* Seek forward button */}
        <Pressable
          onPress={onSeekForward}
          className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mx-6 active:bg-white/20"
        >
          <SkipIcon size={22} seconds={10} direction="forward" color={accentColor} />
        </Pressable>
      </View>

      {/* Frame stepping controls (visible when paused) */}
      {showFrameControls && playerState === 'paused' && (
        <View className="flex-row items-center mt-4 gap-4">
          <Pressable
            onPress={() => onFrameStep('prev')}
            className="w-12 h-12 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
          >
            <Ionicons name="play-back" size={20} color="#fff" />
          </Pressable>
          <Text className="text-white/70 text-xs font-medium">FRAME</Text>
          <Pressable
            onPress={() => onFrameStep('next')}
            className="w-12 h-12 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
          >
            <Ionicons name="play-forward" size={20} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}
