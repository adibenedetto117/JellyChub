import React, { useEffect, useCallback, useState, useRef } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { VideoPlayerCore } from '@/hooks';
import { usePlayerStore } from '@/stores';
import {
  SubtitleDisplay,
  SleepTimerSelector,
  ChapterList,
  EpisodeList,
  AudioSubtitleSelector,
  WebVideoView,
  type ChapterInfo,
} from '@/components/shared/player';
import { SpeedSelectorModal, QualitySelectorModal } from '@/components/mobile/player/video';
import { DesktopVideoPlayerHeader } from './DesktopVideoPlayerHeader';
import { DesktopVideoPlaybackControls } from './DesktopVideoPlaybackControls';
import { DesktopVideoPlayerOverlays } from './DesktopVideoPlayerOverlays';
import { DesktopVideoSeekBar } from './DesktopVideoSeekBar';

interface DesktopVideoPlayerProps {
  core: VideoPlayerCore;
}

export function DesktopVideoPlayer({ core }: DesktopVideoPlayerProps) {
  const {
    itemId,
    from,
    item,
    isEpisode,
    mediaSource,
    streamUrl,
    player,
    playerState,
    progress,
    showLoadingIndicator,
    isSeeking,
    setIsSeeking,
    seekPosition,
    setSeekPosition,
    modals,
    accentColor,
    subtitleSettings,
    videoPlaybackSpeed,
    handleSpeedChange,
    sleepTimer,
    handleSleepTimerSelect,
    selectedSubtitleIndex,
    selectedAudioIndex,
    jellyfinSubtitleTracks,
    jellyfinAudioTracks,
    externalSubtitleCues,
    handleSelectSubtitle,
    handleSelectAudio,
    currentSubtitle,
    subtitlesLoading,
    subtitleLoadError,
    showSkipIntro,
    isIntroPreview,
    introStart,
    introEnd,
    handleSkipIntro,
    showSkipCredits,
    handleSkipCredits,
    creditsStart,
    nextEpisode,
    handlePlayNextEpisode,
    seasonEpisodes,
    allSeasons,
    episodeListSeasonId,
    setEpisodeListSeasonId,
    episodeListEpisodes,
    episodeListLoading,
    handleSelectEpisode,
    chapters,
    abLoop,
    trickplayInfo,
    trickplayResolution,
    handlePlayPause,
    handleSeek,
    handleClose,
    getDisplayName,
    getSubtitle,
    streamingQuality,
    setStreamingQuality,
  } = core;

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsOpacity = useSharedValue(1);
  const durationRef = useRef(0);

  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setProgress = usePlayerStore((s) => s.setProgress);

  const handleTimeUpdate = useCallback((currentTime: number) => {
    const currentTimeMs = currentTime * 1000;
    const durationMs = durationRef.current * 1000;
    setProgress(currentTimeMs, durationMs, durationMs);
  }, [setProgress]);

  const handleDurationChange = useCallback((duration: number) => {
    durationRef.current = duration;
  }, []);

  const handleVideoPlay = useCallback(() => {
    setPlayerState('playing');
  }, [setPlayerState]);

  const handleVideoPause = useCallback(() => {
    setPlayerState('paused');
  }, [setPlayerState]);

  const handleVideoLoadStart = useCallback(() => {
    setPlayerState('loading');
  }, [setPlayerState]);

  const handleVideoCanPlay = useCallback(() => {
    if (playerState === 'loading') {
      setPlayerState('paused');
    }
  }, [playerState, setPlayerState]);

  const handleVideoEnded = useCallback(() => {
    setPlayerState('paused');
    if (nextEpisode) {
      handlePlayNextEpisode();
      router.replace(`/player/video?itemId=${nextEpisode.Id}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
    }
  }, [setPlayerState, nextEpisode, handlePlayNextEpisode, from]);

  const webPlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, []);

  const webSeek = useCallback((positionMs: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = positionMs / 1000;
    setProgress(positionMs, durationRef.current * 1000, durationRef.current * 1000);
  }, [setProgress]);

  const navigateToEpisode = useCallback((episodeId: string) => {
    handleSelectEpisode(episodeId);
    router.replace(`/player/video?itemId=${episodeId}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [handleSelectEpisode, from]);

  const navigateToNextEpisode = useCallback(() => {
    if (!nextEpisode) return;
    handlePlayNextEpisode();
    router.replace(`/player/video?itemId=${nextEpisode.Id}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [nextEpisode, handlePlayNextEpisode, from]);

  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });

    if (playerState === 'playing') {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 200 });
      }, 3000);
    }
  }, [playerState, controlsOpacity]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      const video = videoRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          webPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          webSeek(Math.max(0, progress.position - (e.shiftKey ? 30000 : 10000)));
          break;
        case 'ArrowRight':
          e.preventDefault();
          webSeek(Math.min(progress.duration, progress.position + (e.shiftKey ? 30000 : 10000)));
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (video) video.volume = Math.min(1, (video.volume || 0) + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (video) video.volume = Math.max(0, (video.volume || 1) - 0.1);
          break;
        case 'm':
          e.preventDefault();
          if (video) video.muted = !video.muted;
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          } else {
            handleClose();
          }
          break;
        case 'c':
          e.preventDefault();
          modals.openModal('audioSubtitleSelector');
          break;
        case 'n':
          if (nextEpisode) {
            e.preventDefault();
            navigateToNextEpisode();
          }
          break;
        case 's':
          if (showSkipIntro && introEnd) {
            e.preventDefault();
            handleSkipIntro();
          }
          break;
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const percent = parseInt(e.key) * 10;
          webSeek((progress.duration * percent) / 100);
          break;
        case ',':
          e.preventDefault();
          webSeek(Math.max(0, progress.position - 5000));
          break;
        case '.':
          e.preventDefault();
          webSeek(Math.min(progress.duration, progress.position + 5000));
          break;
        case '<':
          e.preventDefault();
          const slowerSpeed = Math.max(0.25, videoPlaybackSpeed - 0.25);
          handleSpeedChange(slowerSpeed);
          break;
        case '>':
          e.preventDefault();
          const fasterSpeed = Math.min(2, videoPlaybackSpeed + 0.25);
          handleSpeedChange(fasterSpeed);
          break;
        case 'q':
          e.preventDefault();
          setShowQualityModal((prev) => !prev);
          break;
      }
      resetControlsTimeout();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    webPlayPause,
    webSeek,
    handleClose,
    progress,
    isFullscreen,
    modals,
    nextEpisode,
    showSkipIntro,
    introEnd,
    handleSkipIntro,
    videoPlaybackSpeed,
    handleSpeedChange,
    resetControlsTimeout,
    navigateToNextEpisode,
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

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onPointerMove={() => resetControlsTimeout()}
    >
      {streamUrl && (
        <Pressable style={styles.videoContainer} onPress={webPlayPause}>
          <WebVideoView
            ref={videoRef}
            player={player}
            streamUrl={streamUrl}
            style={styles.video}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onLoadStart={handleVideoLoadStart}
            onCanPlay={handleVideoCanPlay}
            onEnded={handleVideoEnded}
          />
        </Pressable>
      )}

      <SubtitleDisplay
        text={currentSubtitle}
        showControls={showControls}
        subtitleSize={subtitleSettings.subtitleSize}
        subtitleTextColor={subtitleSettings.subtitleTextColor}
        subtitleBackgroundColor={subtitleSettings.subtitleBackgroundColor}
        subtitleBackgroundOpacity={subtitleSettings.subtitleBackgroundOpacity}
        subtitlePosition={subtitleSettings.subtitlePosition}
        subtitleOutlineStyle={subtitleSettings.subtitleOutlineStyle}
        isLoading={subtitlesLoading && (selectedSubtitleIndex !== undefined || externalSubtitleCues !== null)}
        error={subtitleLoadError}
      />

      <DesktopVideoPlayerOverlays
        showLoadingIndicator={showLoadingIndicator}
        hasStreamUrl={!!streamUrl}
        accentColor={accentColor}
        showSkipIntro={showSkipIntro}
        isIntroPreview={isIntroPreview}
        onSkipIntro={handleSkipIntro}
        showSkipCredits={showSkipCredits}
        onSkipCredits={handleSkipCredits}
        showNextEpisode={progress.duration > 0 && progress.position >= progress.duration - 30000 && !!nextEpisode}
        nextEpisodeNumber={nextEpisode?.IndexNumber}
        onNavigateToNextEpisode={navigateToNextEpisode}
      />

      <Animated.View style={[styles.controlsOverlay, controlsStyle]} pointerEvents={showControls ? 'auto' : 'none'}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'transparent']}
          style={styles.topGradient}
        />

        <DesktopVideoPlayerHeader
          title={getDisplayName(item)}
          subtitle={getSubtitle()}
          isEpisode={isEpisode}
          hasEpisodes={!!seasonEpisodes?.Items && seasonEpisodes.Items.length > 1}
          hasChapters={!!chapters && (chapters as any[]).length > 0}
          videoPlaybackSpeed={videoPlaybackSpeed}
          isFullscreen={isFullscreen}
          onClose={handleClose}
          onEpisodeList={() => modals.openModal('episodeList')}
          onAudioSubtitleSelector={() => modals.openModal('audioSubtitleSelector')}
          onChapterList={() => modals.openModal('chapterList')}
          onSpeedSelector={() => modals.openModal('speedSelector')}
          onToggleFullscreen={toggleFullscreen}
        />

        <DesktopVideoPlaybackControls
          playerState={playerState}
          onPlayPause={webPlayPause}
          onSeekBackward={() => webSeek(Math.max(0, progress.position - 10000))}
          onSeekForward={() => webSeek(Math.min(progress.duration, progress.position + 10000))}
        />

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.bottomGradient}
        />

        <DesktopVideoSeekBar
          position={progress.position}
          duration={progress.duration}
          buffered={progress.buffered}
          accentColor={accentColor}
          isSeeking={isSeeking}
          seekPosition={seekPosition}
          onSeekStart={(pos) => { setIsSeeking(true); setSeekPosition(pos); }}
          onSeekUpdate={setSeekPosition}
          onSeekEnd={(pos) => { webSeek(pos); setIsSeeking(false); }}
          onTap={webSeek}
          chapters={chapters as ChapterInfo[] | undefined}
          itemId={itemId}
          mediaSourceId={mediaSource?.Id}
          onChapterSeek={webSeek}
          introStart={introStart}
          introEnd={introEnd}
          creditsStart={creditsStart}
          abLoop={abLoop}
          trickplayInfo={trickplayInfo}
          trickplayResolution={trickplayResolution ?? undefined}
        />

        <View style={styles.shortcutsHint}>
          <Text style={styles.shortcutsText}>
            Space: Play/Pause | Arrows: Seek/Volume | F: Fullscreen | M: Mute | C: Subtitles | Q: Quality
          </Text>
        </View>
      </Animated.View>

      <SpeedSelectorModal
        visible={modals.isOpen.speedSelector}
        onClose={() => modals.closeModal('speedSelector')}
        currentSpeed={videoPlaybackSpeed}
        onSelectSpeed={handleSpeedChange}
        accentColor={accentColor}
      />

      <QualitySelectorModal
        visible={showQualityModal}
        onClose={() => setShowQualityModal(false)}
        screenHeight={800}
        accentColor={accentColor}
        currentQuality={streamingQuality}
        onSelectQuality={setStreamingQuality}
      />

      <SleepTimerSelector
        visible={modals.isOpen.sleepTimerSelector}
        onClose={() => modals.closeModal('sleepTimerSelector')}
        onSelectTimer={handleSleepTimerSelect}
        currentTimer={sleepTimer}
        isEpisode={isEpisode}
        episodeEndTimeMs={progress.duration > 0 ? progress.duration - progress.position : undefined}
      />

      {modals.isOpen.audioSubtitleSelector && (
        <AudioSubtitleSelector
          onClose={() => modals.closeModal('audioSubtitleSelector')}
          audioTracks={jellyfinAudioTracks}
          subtitleTracks={jellyfinSubtitleTracks}
          selectedAudioIndex={selectedAudioIndex}
          selectedSubtitleIndex={selectedSubtitleIndex}
          onSelectAudio={handleSelectAudio}
          onSelectSubtitle={handleSelectSubtitle}
        />
      )}

      <ChapterList
        visible={modals.isOpen.chapterList}
        onClose={() => modals.closeModal('chapterList')}
        chapters={(chapters as ChapterInfo[]) || []}
        currentPositionMs={progress.position}
        onSelectChapter={handleSeek}
        itemId={item?.Id}
      />

      {isEpisode && (
        <EpisodeList
          visible={modals.isOpen.episodeList}
          onClose={() => {
            modals.closeModal('episodeList');
            setEpisodeListSeasonId(null);
          }}
          episodes={
            episodeListSeasonId && episodeListSeasonId !== core.seasonId
              ? episodeListEpisodes?.Items || []
              : seasonEpisodes?.Items || []
          }
          seasons={allSeasons?.Items}
          currentEpisodeId={itemId}
          currentSeasonId={episodeListSeasonId || core.seasonId}
          onSelectEpisode={navigateToEpisode}
          onSelectSeason={setEpisodeListSeasonId}
          isLoading={episodeListLoading}
          seriesName={item?.SeriesName}
        />
      )}
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
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  shortcutsHint: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shortcutsText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
  },
});

export default DesktopVideoPlayer;
