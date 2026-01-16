import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface DesktopVideoPlayerOverlaysProps {
  showLoadingIndicator: boolean;
  hasStreamUrl: boolean;
  accentColor: string;
  showSkipIntro: boolean;
  isIntroPreview?: boolean;
  onSkipIntro: () => void;
  showSkipCredits: boolean;
  onSkipCredits: () => void;
  showNextEpisode: boolean;
  nextEpisodeNumber?: number;
  onNavigateToNextEpisode: () => void;
}

export function DesktopVideoPlayerOverlays({
  showLoadingIndicator,
  hasStreamUrl,
  accentColor,
  showSkipIntro,
  isIntroPreview,
  onSkipIntro,
  showSkipCredits,
  onSkipCredits,
  showNextEpisode,
  nextEpisodeNumber,
  onNavigateToNextEpisode,
}: DesktopVideoPlayerOverlaysProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (showLoadingIndicator) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [showLoadingIndicator, rotation]);

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <>
      {showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingSpinner}>
            <ActivityIndicator size="large" color={accentColor} />
          </View>
        </View>
      )}

      {!hasStreamUrl && !showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.noStreamText}>No stream available</Text>
        </View>
      )}

      {(showSkipIntro || isIntroPreview) && (
        <Pressable
          onPress={onSkipIntro}
          style={[
            styles.skipButton,
            isIntroPreview && !showSkipIntro && styles.skipButtonPreview,
          ]}
        >
          <Text style={[
            styles.skipButtonText,
            isIntroPreview && !showSkipIntro && styles.skipButtonTextPreview,
          ]}>
            Skip Intro
          </Text>
          <Ionicons
            name="play-forward"
            size={16}
            color={isIntroPreview && !showSkipIntro ? 'rgba(0,0,0,0.5)' : '#000'}
          />
        </Pressable>
      )}

      {showSkipCredits && !nextEpisodeNumber && (
        <Pressable onPress={onSkipCredits} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip Credits</Text>
          <Ionicons name="play-forward" size={16} color="#000" />
        </Pressable>
      )}

      {(showSkipCredits || showNextEpisode) && nextEpisodeNumber && (
        <Pressable onPress={onNavigateToNextEpisode} style={styles.nextEpisodeButton}>
          <Text style={styles.nextEpisodeText}>Next: E{nextEpisodeNumber}</Text>
          <Ionicons name="play" size={16} color="#000" />
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSpinner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noStreamText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
  },
  skipButton: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  skipButtonPreview: {
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  skipButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButtonTextPreview: {
    color: 'rgba(0,0,0,0.5)',
  },
  nextEpisodeButton: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  nextEpisodeText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
});
