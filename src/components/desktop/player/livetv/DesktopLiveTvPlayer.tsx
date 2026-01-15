import React, { useEffect, useCallback, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { LiveTvPlayerCore } from '@/hooks';
import { DesktopLiveTvControls } from './DesktopLiveTvControls';
import {
  DesktopLiveTvChannelInfo,
  DesktopLiveTvChannelDisplay,
} from './DesktopLiveTvChannelInfo';
import { DesktopLiveTvProgramGuide } from './DesktopLiveTvProgramGuide';
import { DesktopLiveTvChannelSwitcher } from './DesktopLiveTvChannelSwitcher';

interface DesktopLiveTvPlayerProps {
  core: LiveTvPlayerCore;
}

export function DesktopLiveTvPlayer({ core }: DesktopLiveTvPlayerProps) {
  const { t } = useTranslation();

  const {
    currentChannel,
    channels,
    currentChannelId,
    isFavorite,
    currentProgram,
    streamUrl,
    streamError,
    player,
    showControls: coreShowControls,
    showBufferingOverlay,
    showChannelList,
    accentColor,
    controlsOpacity,
    bufferingOverlayOpacity,
    handleBack,
    handleChannelChange,
    handleToggleFavorite,
    handleNextChannel,
    handlePrevChannel,
    setShowChannelList,
    handleRetry,
    showControlsWithTimeout,
    toggleControls,
  } = core;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEPG, setShowEPG] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localControlsOpacity = useSharedValue(1);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    localControlsOpacity.value = withTiming(1, { duration: 200 });
    showControlsWithTimeout();

    if (!showChannelList && !showEPG) {
      controlsTimeout.current = setTimeout(() => {
        localControlsOpacity.value = withTiming(0, { duration: 300 });
      }, 4000);
    }
  }, [showChannelList, showEPG, localControlsOpacity, showControlsWithTimeout]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (player) player.muted = !player.muted;
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            if (player) player.volume = Math.min(1, (player.volume || 0) + 0.1);
          } else {
            handlePrevChannel();
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            if (player) player.volume = Math.max(0, (player.volume || 1) - 0.1);
          } else {
            handleNextChannel();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevChannel();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextChannel();
          break;
        case 'm':
          e.preventDefault();
          if (player) player.muted = !player.muted;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (showChannelList) {
            setShowChannelList(false);
          } else if (showEPG) {
            setShowEPG(false);
          } else if (isFullscreen) {
            exitFullscreen();
          } else {
            handleBack();
          }
          break;
        case 'g':
        case 'e':
          e.preventDefault();
          setShowEPG(!showEPG);
          setShowChannelList(false);
          break;
        case 'c':
        case 'l':
          e.preventDefault();
          setShowChannelList(!showChannelList);
          setShowEPG(false);
          break;
        case 's':
          e.preventDefault();
          handleToggleFavorite();
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    player,
    handlePrevChannel,
    handleNextChannel,
    handleBack,
    handleToggleFavorite,
    showChannelList,
    showEPG,
    isFullscreen,
    setShowChannelList,
    resetControlsTimeout,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleMouseMove = () => resetControlsTimeout();
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [resetControlsTimeout]);

  const toggleFullscreen = useCallback(() => {
    if (Platform.OS !== 'web') return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const exitFullscreen = useCallback(() => {
    if (Platform.OS === 'web' && document.fullscreenElement) {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  const handleVideoClick = useCallback(() => {
    toggleControls();
  }, [toggleControls]);

  const handleToggleEPG = useCallback(() => {
    setShowEPG(!showEPG);
    setShowChannelList(false);
  }, [showEPG, setShowChannelList]);

  const handleToggleChannelList = useCallback(() => {
    setShowChannelList(!showChannelList);
    setShowEPG(false);
  }, [showChannelList, setShowChannelList]);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const bufferingOverlayStyle = useAnimatedStyle(() => ({
    opacity: bufferingOverlayOpacity.value,
  }));

  return (
    <View style={styles.container} onPointerMove={() => resetControlsTimeout()}>
      <Pressable style={styles.videoContainer} onPress={handleVideoClick}>
        {streamUrl && !streamError && (
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="contain"
            allowsPictureInPicture={true}
          />
        )}

        {streamError && (
          <View style={styles.errorOverlay}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.errorTitle}>{t('player.streamError')}</Text>
            <Text style={styles.errorText}>{streamError}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: accentColor }]}
              onPress={handleRetry}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        )}
      </Pressable>

      {showBufferingOverlay && !streamError && (
        <Animated.View style={[styles.bufferingOverlay, bufferingOverlayStyle]}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={styles.bufferingText}>{t('player.loadingStream')}</Text>
        </Animated.View>
      )}

      <DesktopLiveTvControls
        controlsStyle={controlsStyle}
        showControls={coreShowControls}
        accentColor={accentColor}
        isFavorite={isFavorite}
        isFullscreen={isFullscreen}
        showChannelList={showChannelList}
        showEPG={showEPG}
        onBack={handleBack}
        onToggleFavorite={handleToggleFavorite}
        onToggleEPG={handleToggleEPG}
        onToggleChannelList={handleToggleChannelList}
        onToggleFullscreen={toggleFullscreen}
        onPrevChannel={handlePrevChannel}
        onNextChannel={handleNextChannel}
        currentProgram={currentProgram}
        channelInfoContent={
          <DesktopLiveTvChannelInfo
            channel={currentChannel}
            accentColor={accentColor}
          />
        }
        channelDisplayContent={
          <DesktopLiveTvChannelDisplay channel={currentChannel} />
        }
      />

      <DesktopLiveTvChannelSwitcher
        visible={showChannelList}
        channels={channels}
        currentChannelId={currentChannelId}
        accentColor={accentColor}
        onChannelSelect={handleChannelChange}
        onClose={() => setShowChannelList(false)}
      />

      <DesktopLiveTvProgramGuide
        visible={showEPG}
        currentChannel={currentChannel}
        currentProgram={currentProgram}
        channels={channels}
        currentChannelId={currentChannelId}
        accentColor={accentColor}
        onClose={() => setShowEPG(false)}
        onChannelSelect={handleChannelChange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bufferingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    gap: 16,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  errorText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 400,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default DesktopLiveTvPlayer;
