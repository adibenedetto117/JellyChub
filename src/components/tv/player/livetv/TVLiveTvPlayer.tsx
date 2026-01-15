import { View, Text, Pressable, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTVRemoteHandler } from '@/hooks';
import type { LiveTvPlayerCore } from '@/hooks';
import { TVLiveTvControls } from './TVLiveTvControls';
import { TVLiveTvChannelInfo } from './TVLiveTvChannelInfo';
import { TVLiveTvProgramGuide } from './TVLiveTvProgramGuide';
import { TVLiveTvChannelSwitcher } from './TVLiveTvChannelSwitcher';

interface TVLiveTvPlayerProps {
  core: LiveTvPlayerCore;
}

export function TVLiveTvPlayer({ core }: TVLiveTvPlayerProps) {
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
    toggleControls,
    showControlsWithTimeout,
    setShowChannelList,
    handleRetry,
  } = core;

  useTVRemoteHandler({
    onSelect: () => {
      if (!showChannelList) {
        toggleControls();
      }
    },
    onMenu: () => {
      if (showChannelList) {
        setShowChannelList(false);
      } else {
        handleBack();
      }
    },
    onUp: () => {
      if (!showChannelList) {
        handlePrevChannel();
        showControlsWithTimeout();
      }
    },
    onDown: () => {
      if (!showChannelList) {
        handleNextChannel();
        showControlsWithTimeout();
      }
    },
    onLeft: () => {
      if (!showChannelList) {
        setShowChannelList(true);
        showControlsWithTimeout();
      }
    },
    onRight: () => {
      if (showChannelList) {
        setShowChannelList(false);
      }
    },
    onLongUp: handleToggleFavorite,
  });

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
    pointerEvents: controlsOpacity.value > 0.5 ? 'auto' : 'none',
  }));

  const bufferingOverlayStyle = useAnimatedStyle(() => ({
    opacity: bufferingOverlayOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <View style={styles.videoContainer}>
        {streamUrl && !streamError && (
          <VideoView
            player={player}
            style={styles.video}
            nativeControls={false}
            contentFit="contain"
            allowsPictureInPicture={true}
            startsPictureInPictureAutomatically={true}
          />
        )}

        {streamError ? (
          <View style={styles.errorOverlay}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color="rgba(255,255,255,0.6)"
            />
            <Text style={styles.errorText}>{streamError}</Text>
            <Pressable
              style={[styles.retryButton, { backgroundColor: accentColor }]}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {showBufferingOverlay && !streamError && (
          <Animated.View style={[styles.bufferingOverlay, bufferingOverlayStyle]}>
            <ActivityIndicator size="large" color={accentColor} />
            <Text style={styles.bufferingText}>{t('player.loadingStream')}</Text>
          </Animated.View>
        )}
      </View>

      <TVLiveTvControls
        controlsStyle={controlsStyle}
        bottomContent={
          <TVLiveTvProgramGuide
            currentProgram={currentProgram}
            accentColor={accentColor}
          />
        }
      >
        <TVLiveTvChannelInfo channel={currentChannel} isFavorite={isFavorite} />
      </TVLiveTvControls>

      <TVLiveTvChannelSwitcher
        visible={showChannelList}
        channels={channels}
        currentChannelId={currentChannelId}
        accentColor={accentColor}
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
    justifyContent: 'center',
    alignItems: 'center',
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
    fontSize: 18,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 20,
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 20,
    textAlign: 'center',
    maxWidth: '60%',
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
