import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DesktopVideoPlayerOverlaysProps {
  showLoadingIndicator: boolean;
  hasStreamUrl: boolean;
  accentColor: string;
  showSkipIntro: boolean;
  onSkipIntro: () => void;
  showSkipCredits: boolean;
  showNextEpisode: boolean;
  nextEpisodeNumber?: number;
  onNavigateToNextEpisode: () => void;
}

export function DesktopVideoPlayerOverlays({
  showLoadingIndicator,
  hasStreamUrl,
  accentColor,
  showSkipIntro,
  onSkipIntro,
  showSkipCredits,
  showNextEpisode,
  nextEpisodeNumber,
  onNavigateToNextEpisode,
}: DesktopVideoPlayerOverlaysProps) {
  return (
    <>
      {showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingSpinner}>
            <Ionicons name="reload" size={32} color={accentColor} />
          </View>
        </View>
      )}

      {!hasStreamUrl && !showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.noStreamText}>No stream available</Text>
        </View>
      )}

      {showSkipIntro && (
        <Pressable onPress={onSkipIntro} style={styles.skipButton}>
          <Text style={styles.skipButtonText}>Skip Intro</Text>
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
  skipButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
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
