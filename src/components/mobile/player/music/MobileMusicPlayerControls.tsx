import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import { router } from 'expo-router';
import type { ShuffleMode, RepeatMode } from '@/types/player';

interface MobileMusicPlayerControlsProps {
  playerState: string;
  showLoading: boolean;
  shuffleMode: ShuffleMode;
  repeatMode: RepeatMode;
  showLyricsView: boolean;
  musicSleepTimer: any;
  accentColor: string;
  playButtonStyle: any;
  onPlayPause: () => void;
  onSkipPrevious: () => void;
  onSkipNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleLyrics: () => void;
  onShowSleepTimer: () => void;
}

export function MobileMusicPlayerControls({
  playerState,
  showLoading,
  shuffleMode,
  repeatMode,
  showLyricsView,
  musicSleepTimer,
  accentColor,
  playButtonStyle,
  onPlayPause,
  onSkipPrevious,
  onSkipNext,
  onToggleShuffle,
  onToggleRepeat,
  onToggleLyrics,
  onShowSleepTimer,
}: MobileMusicPlayerControlsProps) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8 }}>
        <Pressable
          onPress={onToggleShuffle}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ alignItems: 'center' }}>
            <Ionicons
              name={shuffleMode === 'album' ? 'albums' : 'shuffle'}
              size={24}
              color={shuffleMode !== 'off' ? accentColor : 'rgba(255,255,255,0.5)'}
            />
            {shuffleMode !== 'off' && (
              <Text style={{ fontSize: 8, color: accentColor, marginTop: 2, fontWeight: '600' }}>
                {shuffleMode === 'all' ? 'ALL' : shuffleMode === 'album' ? 'ALB' : 'NEW'}
              </Text>
            )}
          </View>
        </Pressable>

        <Pressable onPress={onSkipPrevious} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-skip-back" size={32} color="#fff" />
        </Pressable>

        <Animated.View style={playButtonStyle}>
          <Pressable
            onPress={onPlayPause}
            style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}
          >
            {showLoading ? (
              <ActivityIndicator color="#000" size="large" />
            ) : (
              <Ionicons
                name={playerState === 'playing' ? "pause" : "play"}
                size={36}
                color="#000"
                style={{ marginLeft: playerState === 'playing' ? 0 : 4 }}
              />
            )}
          </Pressable>
        </Animated.View>

        <Pressable onPress={onSkipNext} style={{ width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="play-skip-forward" size={32} color="#fff" />
        </Pressable>

        <Pressable
          onPress={onToggleRepeat}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons
              name="repeat"
              size={24}
              color={repeatMode !== 'off' ? accentColor : 'rgba(255,255,255,0.5)'}
            />
            {repeatMode === 'one' && (
              <View
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -6,
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: accentColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'bold' }}>1</Text>
              </View>
            )}
          </View>
          {repeatMode !== 'off' && (
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: accentColor, marginTop: 4 }} />
          )}
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8, flexWrap: 'wrap' }}>
        <Pressable
          onPress={onToggleLyrics}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: showLyricsView ? accentColor : 'rgba(255,255,255,0.1)',
          }}
        >
          <Ionicons name="text" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, marginLeft: 6 }}>Lyrics</Text>
        </Pressable>
        <Pressable
          onPress={onShowSleepTimer}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: musicSleepTimer ? accentColor : 'rgba(255,255,255,0.1)',
          }}
        >
          <Ionicons name="moon" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, marginLeft: 6 }}>Sleep</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(tabs)/queue')}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 8,
            borderRadius: 20,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <Ionicons name="list" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, marginLeft: 6 }}>Queue</Text>
        </Pressable>
      </View>
    </>
  );
}
