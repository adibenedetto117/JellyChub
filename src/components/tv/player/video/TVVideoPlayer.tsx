import React from 'react';
import { View, StatusBar } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { VideoView } from 'expo-video';
import { useTVRemoteHandler, useBackHandler, type VideoPlayerCore } from '@/hooks';
import {
  AudioTrackSelector,
  SubtitleSelector,
  SubtitleDisplay,
  SleepTimerSelector,
  EpisodeList,
} from '@/components/shared/player';
import { SpeedSelectorModal } from '@/components/mobile/player/video';
import type { ChapterInfo } from '@/components/shared/player';
import { TVVideoPlayerControls } from './TVVideoPlayerControls';

interface TVVideoPlayerProps {
  core: VideoPlayerCore;
}

export function TVVideoPlayer({ core }: TVVideoPlayerProps) {
  const {
    itemId,
    from,
    item,
    isEpisode,
    streamUrl,
    player,
    videoViewRef,
    playerState,
    progress,
    showLoadingIndicator,
    showControls,
    setShowControls,
    showControlsNow,
    modals,
    accentColor,
    subtitleSettings,
    hideMedia,
    videoPlaybackSpeed,
    handleSpeedChange,
    sleepTimer,
    handleSleepTimerSelect,
    selectedSubtitleIndex,
    selectedAudioIndex,
    jellyfinSubtitleTracks,
    jellyfinAudioTracks,
    handleSelectSubtitle,
    handleSelectAudio,
    currentSubtitle,
    subtitlesLoading,
    externalSubtitleCues,
    nextEpisode,
    handlePlayNextEpisode,
    seasonEpisodes,
    allSeasons,
    episodeListSeasonId,
    setEpisodeListSeasonId,
    episodeListEpisodes,
    episodeListLoading,
    handleSelectEpisode,
    controlsOpacity,
    handlePlayPause,
    handleSeek,
    handleDoubleTapSeek,
    handleClose,
    getDisplayName,
    getSubtitle,
  } = core;

  // Back handler - needs to return boolean
  useBackHandler(() => {
    handleClose();
    return true;
  });

  // TV Remote handler
  useTVRemoteHandler({
    onSelect: () => {
      if (showControls) {
        handlePlayPause();
      } else {
        showControlsNow();
      }
    },
    onPlayPause: handlePlayPause,
    onLeft: () => handleDoubleTapSeek('left'),
    onRight: () => handleDoubleTapSeek('right'),
    onUp: showControlsNow,
    onDown: showControlsNow,
    onMenu: handleClose,
  });

  // Animated styles
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  // Navigation handlers
  const navigateToEpisode = React.useCallback((episodeId: string) => {
    handleSelectEpisode(episodeId);
    router.replace(`/player/video?itemId=${episodeId}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [handleSelectEpisode, from]);

  const navigateToNextEpisode = React.useCallback(() => {
    if (!nextEpisode) return;
    handlePlayNextEpisode();
    router.replace(`/player/video?itemId=${nextEpisode.Id}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [nextEpisode, handlePlayNextEpisode, from]);

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <View className="flex-1">
        {streamUrl && (
          <VideoView
            ref={videoViewRef}
            player={player}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
            nativeControls={false}
          />
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
          error={null}
        />

        <Animated.View style={controlsStyle} className="absolute inset-0" pointerEvents={showControls ? 'auto' : 'none'}>
          <TVVideoPlayerControls
            isPlaying={playerState === 'playing'}
            isLoading={showLoadingIndicator}
            onPlayPause={handlePlayPause}
            onSeekBack={() => handleDoubleTapSeek('left')}
            onSeekForward={() => handleDoubleTapSeek('right')}
            onClose={handleClose}
            position={progress.position}
            duration={progress.duration}
            buffered={progress.buffered}
            title={getDisplayName(item)}
            subtitle={getSubtitle() || undefined}
            onSubtitlePress={() => modals.openModal('subtitleSelector')}
            onAudioPress={() => modals.openModal('audioSelector')}
            onSpeedPress={() => modals.openModal('speedSelector')}
            playbackSpeed={videoPlaybackSpeed}
            hasActiveSubtitle={selectedSubtitleIndex !== undefined}
            onNextEpisode={navigateToNextEpisode}
            hasNextEpisode={!!nextEpisode}
          />
        </Animated.View>
      </View>

      {/* TV Modals - simplified for remote navigation */}
      {modals.isOpen.audioSelector && (
        <AudioTrackSelector
          onClose={() => modals.closeModal('audioSelector')}
          tracks={jellyfinAudioTracks}
          selectedIndex={selectedAudioIndex}
          onSelectTrack={handleSelectAudio}
        />
      )}

      {modals.isOpen.subtitleSelector && (
        <SubtitleSelector
          onClose={() => modals.closeModal('subtitleSelector')}
          tracks={jellyfinSubtitleTracks}
          selectedIndex={selectedSubtitleIndex}
          onSelectTrack={handleSelectSubtitle}
        />
      )}

      <SpeedSelectorModal
        visible={modals.isOpen.speedSelector}
        onClose={() => modals.closeModal('speedSelector')}
        currentSpeed={videoPlaybackSpeed}
        onSelectSpeed={handleSpeedChange}
        accentColor={accentColor}
      />

      <SleepTimerSelector
        visible={modals.isOpen.sleepTimerSelector}
        onClose={() => modals.closeModal('sleepTimerSelector')}
        onSelectTimer={handleSleepTimerSelect}
        currentTimer={sleepTimer}
        isEpisode={isEpisode}
        episodeEndTimeMs={progress.duration > 0 ? progress.duration - progress.position : undefined}
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
