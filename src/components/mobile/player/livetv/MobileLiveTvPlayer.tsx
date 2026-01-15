import { View, Text, Pressable, StatusBar, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { LiveTvPlayerCore } from '@/hooks';
import { MobileLiveTvControls } from './MobileLiveTvControls';
import { MobileLiveTvChannelInfo } from './MobileLiveTvChannelInfo';
import { MobileLiveTvProgramGuide } from './MobileLiveTvProgramGuide';
import { MobileLiveTvChannelSwitcher } from './MobileLiveTvChannelSwitcher';

interface MobileLiveTvPlayerProps {
  core: LiveTvPlayerCore;
}

export function MobileLiveTvPlayer({ core }: MobileLiveTvPlayerProps) {
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
    isOrientationLocked,
    accentColor,
    insets,
    controlsOpacity,
    bufferingOverlayOpacity,
    tapGesture,
    handleBack,
    handleChannelChange,
    handleToggleFavorite,
    handleNextChannel,
    handlePrevChannel,
    handleToggleOrientationLock,
    setShowChannelList,
    handleRetry,
  } = core;

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

      <GestureDetector gesture={tapGesture}>
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
                size={48}
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
      </GestureDetector>

      <MobileLiveTvControls
        controlsStyle={controlsStyle}
        accentColor={accentColor}
        isOrientationLocked={isOrientationLocked}
        isFavorite={isFavorite}
        showChannelList={showChannelList}
        insets={insets}
        onBack={handleBack}
        onToggleOrientationLock={handleToggleOrientationLock}
        onToggleFavorite={handleToggleFavorite}
        onToggleChannelList={() => setShowChannelList(!showChannelList)}
        onPrevChannel={handlePrevChannel}
        onNextChannel={handleNextChannel}
      >
        <MobileLiveTvChannelInfo channel={currentChannel} />
      </MobileLiveTvControls>

      <Animated.View
        style={[styles.programInfoContainer, controlsStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.programGradient}
        >
          <View
            style={[
              styles.programInfoWrapper,
              {
                paddingBottom: Math.max(insets.bottom, 16) + 12,
                paddingLeft: Math.max(insets.left, 24),
                paddingRight: Math.max(insets.right, 24) + 74,
              },
            ]}
          >
            <MobileLiveTvProgramGuide
              currentProgram={currentProgram}
              accentColor={accentColor}
            />
          </View>
        </LinearGradient>
      </Animated.View>

      <MobileLiveTvChannelSwitcher
        visible={showChannelList}
        channels={channels}
        currentChannelId={currentChannelId}
        accentColor={accentColor}
        onChannelSelect={handleChannelChange}
        onClose={() => setShowChannelList(false)}
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
    marginTop: 12,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    gap: 16,
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  programInfoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  programGradient: {
    paddingTop: 40,
  },
  programInfoWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
});
