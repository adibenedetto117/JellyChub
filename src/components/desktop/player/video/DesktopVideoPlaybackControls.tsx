import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DesktopVideoPlaybackControlsProps {
  playerState: 'idle' | 'loading' | 'buffering' | 'playing' | 'paused' | 'ended' | 'error';
  onPlayPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
}

export function DesktopVideoPlaybackControls({
  playerState,
  onPlayPause,
  onSeekBackward,
  onSeekForward,
}: DesktopVideoPlaybackControlsProps) {
  return (
    <View style={styles.centerControls}>
      <Pressable onPress={onSeekBackward} style={styles.skipButton}>
        <Ionicons name="play-back" size={28} color="#fff" />
      </Pressable>

      <Pressable onPress={onPlayPause} style={styles.playButton}>
        <Ionicons
          name={playerState === 'playing' ? 'pause' : 'play'}
          size={48}
          color="#fff"
        />
      </Pressable>

      <Pressable onPress={onSeekForward} style={styles.skipButton}>
        <Ionicons name="play-forward" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
