import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { BrightnessIndicator, VolumeIndicator, SubtitleOffsetControl, SeekIndicator } from './VideoPlayerControls';

interface SkipIconProps {
  size?: number;
  seconds?: number;
  direction?: 'forward' | 'back';
  color?: string;
}

export function SkipIcon({ size = 24, seconds = 10, direction = 'forward', color = '#fff' }: SkipIconProps) {
  const isBack = direction === 'back';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name="refresh"
        size={size}
        color={color}
        style={{ transform: [{ scaleX: isBack ? -1 : 1 }] }}
      />
      <Text style={{ color: color, fontSize: size * 0.4, fontWeight: '700', position: 'absolute', top: size * 0.28 }}>{seconds}</Text>
    </View>
  );
}

interface VideoPlayerOverlaysProps {
  isPortrait: boolean;
  showControls: boolean;
  // Loading state
  isLoading: boolean;
  hasStreamUrl: boolean;
  accentColor: string;
  // Skip animations
  skipLeftOpacity: SharedValue<number>;
  skipLeftScale: SharedValue<number>;
  skipRightOpacity: SharedValue<number>;
  skipRightScale: SharedValue<number>;
  // A-B loop
  abLoop: { a: number | null; b: number | null };
  // Indicators
  showBrightnessIndicator: boolean;
  showVolumeIndicator: boolean;
  currentBrightness: number;
  currentVolume: number;
  // Horizontal seek
  isHorizontalSeeking: boolean;
  horizontalSeekPosition: number;
  horizontalSeekDelta: number;
  currentPosition: number;
  formatTime: (ms: number) => string;
  // Subtitle offset
  showSubtitleOffset: boolean;
  subtitleOffset: number;
  onSubtitleOffsetChange: (offset: number) => void;
  hasActiveSubtitles: boolean;
  // Skip buttons
  showSkipIntro: boolean;
  isIntroPreview: boolean;
  onSkipIntro: () => void;
  showSkipCredits: boolean;
  onSkipCredits: () => void;
  hasNextEpisode: boolean;
  nextEpisodeNumber?: number;
  onPlayNextEpisode: () => void;
  showNextUpCard: boolean;
}

export function VideoPlayerOverlays({
  isPortrait,
  showControls,
  isLoading,
  hasStreamUrl,
  accentColor,
  skipLeftOpacity,
  skipLeftScale,
  skipRightOpacity,
  skipRightScale,
  abLoop,
  showBrightnessIndicator,
  showVolumeIndicator,
  currentBrightness,
  currentVolume,
  isHorizontalSeeking,
  horizontalSeekPosition,
  horizontalSeekDelta,
  currentPosition,
  formatTime,
  showSubtitleOffset,
  subtitleOffset,
  onSubtitleOffsetChange,
  hasActiveSubtitles,
  showSkipIntro,
  isIntroPreview,
  onSkipIntro,
  showSkipCredits,
  onSkipCredits,
  hasNextEpisode,
  nextEpisodeNumber,
  onPlayNextEpisode,
  showNextUpCard,
}: VideoPlayerOverlaysProps) {
  const { t } = useTranslation();

  const skipLeftStyle = useAnimatedStyle(() => ({
    opacity: skipLeftOpacity.value,
    transform: [{ scale: skipLeftScale.value }],
  }));

  const skipRightStyle = useAnimatedStyle(() => ({
    opacity: skipRightOpacity.value,
    transform: [{ scale: skipRightScale.value }],
  }));

  return (
    <>
      {/* Loading indicator */}
      {isLoading && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <View className="w-20 h-20 rounded-full bg-black/60 items-center justify-center">
            <ActivityIndicator color={accentColor} size="large" />
          </View>
        </View>
      )}

      {/* No stream message */}
      {!hasStreamUrl && !isLoading && (
        <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
          <Text className="text-white/60 text-lg">No stream available</Text>
        </View>
      )}

      {/* Skip left animation */}
      <Animated.View style={[skipLeftStyle, { position: 'absolute', left: '15%', top: '50%', marginTop: -40 }]} pointerEvents="none">
        <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
          <SkipIcon size={28} seconds={10} direction="back" color={accentColor} />
        </View>
      </Animated.View>

      {/* Skip right animation */}
      <Animated.View style={[skipRightStyle, { position: 'absolute', right: '15%', top: '50%', marginTop: -40 }]} pointerEvents="none">
        <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
          <SkipIcon size={28} seconds={10} direction="forward" color={accentColor} />
        </View>
      </Animated.View>

      {/* A-B loop indicator */}
      {abLoop.a !== null && abLoop.b !== null && (
        <View
          style={{
            position: 'absolute',
            top: 60,
            left: '50%',
            transform: [{ translateX: -50 }],
            backgroundColor: '#a855f7',
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
          pointerEvents="none"
        >
          <Ionicons name="repeat" size={14} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
            A-B Loop
          </Text>
        </View>
      )}

      {/* Brightness Indicator */}
      {!isPortrait && (
        <BrightnessIndicator
          value={currentBrightness}
          visible={showBrightnessIndicator}
          accentColor={accentColor}
        />
      )}

      {/* Volume Indicator */}
      {!isPortrait && (
        <VolumeIndicator
          value={currentVolume}
          visible={showVolumeIndicator}
          accentColor={accentColor}
        />
      )}

      {/* Horizontal Seek Indicator */}
      <SeekIndicator
        visible={isHorizontalSeeking}
        currentTime={currentPosition}
        seekTime={horizontalSeekPosition}
        seekDelta={horizontalSeekDelta}
        accentColor={accentColor}
        formatTime={formatTime}
      />

      {/* Subtitle Offset Control */}
      <SubtitleOffsetControl
        offset={subtitleOffset}
        onOffsetChange={onSubtitleOffsetChange}
        accentColor={accentColor}
        visible={showSubtitleOffset && hasActiveSubtitles}
      />

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <Pressable
          onPress={onSkipIntro}
          style={{
            position: 'absolute',
            right: 32,
            bottom: 120,
            backgroundColor: isIntroPreview ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: isIntroPreview ? 1 : 0,
            borderColor: 'rgba(255,255,255,0.3)',
          }}
        >
          <Text style={{ color: '#000', fontSize: 15, fontWeight: '600' }}>
            {t('player.skipIntro')}
          </Text>
          <Text style={{ color: '#666', fontSize: 13, marginLeft: 8 }}>
            {isIntroPreview ? '\u2192' : '\u25B6\u25B6'}
          </Text>
        </Pressable>
      )}

      {/* Skip Credits Button (when no next episode) */}
      {showSkipCredits && !hasNextEpisode && (
        <Pressable
          onPress={onSkipCredits}
          style={{
            position: 'absolute',
            right: 24,
            bottom: 100,
            backgroundColor: 'rgba(255,255,255,0.85)',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>Skip Credits</Text>
          <Text style={{ color: '#666', fontSize: 14, marginLeft: 8 }}>{'\u25B6\u25B6'}</Text>
        </Pressable>
      )}

      {/* Next Episode Button (during credits or end of video) */}
      {(showSkipCredits || showNextUpCard) && hasNextEpisode && (
        <Pressable
          onPress={onPlayNextEpisode}
          style={{
            position: 'absolute',
            right: 24,
            bottom: 100,
            backgroundColor: 'rgba(255,255,255,0.95)',
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 6,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>
            {t('player.nextEpisode')}: E{nextEpisodeNumber}
          </Text>
          <Text style={{ color: '#666', fontSize: 14, marginLeft: 8 }}>{'\u25B6'}</Text>
        </Pressable>
      )}

      {/* Edge indicators for volume/brightness (landscape only, when controls visible) */}
      {!isPortrait && showControls && !showBrightnessIndicator && !showVolumeIndicator && (
        <>
          {/* Left edge indicator (volume) */}
          <View
            style={{
              position: 'absolute',
              left: 60,
              top: '30%',
              height: '40%',
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Ionicons
              name={currentVolume === 0 ? "volume-mute-outline" : currentVolume < 0.5 ? "volume-low-outline" : "volume-medium-outline"}
              size={16}
              color="rgba(255,255,255,0.35)"
              style={{ marginBottom: 6 }}
            />
            <View
              style={{
                flex: 1,
                width: 4,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${currentVolume * 100}%`,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>

          {/* Right edge indicator (brightness) */}
          <View
            style={{
              position: 'absolute',
              right: 60,
              top: '30%',
              height: '40%',
              alignItems: 'center',
            }}
            pointerEvents="none"
          >
            <Ionicons name="sunny-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginBottom: 6 }} />
            <View
              style={{
                flex: 1,
                width: 4,
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: `${currentBrightness * 100}%`,
                  backgroundColor: 'rgba(255,255,255,0.4)',
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
        </>
      )}
    </>
  );
}
