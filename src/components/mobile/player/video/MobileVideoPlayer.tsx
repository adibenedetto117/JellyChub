/**
 * Mobile/Tablet Video Player UI
 * Uses useVideoPlayerCore for all logic, renders mobile-optimized controls
 */
import React from 'react';
import { View, StatusBar, Platform } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView } from 'expo-video';
import { useVideoGestures, useBackHandler, type VideoPlayerCore } from '@/hooks';
import { isWeb } from '@/utils/platform';
import { isChromecastSupported } from '@/utils/casting';
import {
  AudioTrackSelector,
  SubtitleSelector,
  AudioSubtitleSelector,
  SubtitleDisplay,
  SubtitleStyleModal,
  SleepTimerSelector,
  ChapterList,
  OpenSubtitlesSearch,
  EpisodeList,
  CastRemoteControl,
  WebVideoView,
  type ChapterInfo,
} from '@/components/shared/player';
import {
  VideoSeekBar,
  VideoPlayerHeader,
  VideoPlaybackControls,
  VideoPlayerOverlays,
  SpeedSelectorModal,
  ControlsLockedOverlay,
  MoreOptionsModal,
  QualitySelectorModal,
} from './';

interface MobileVideoPlayerProps {
  core: VideoPlayerCore;
}

export function MobileVideoPlayer({ core }: MobileVideoPlayerProps) {
  const {
    itemId,
    from,
    item,
    isEpisode,
    mediaSource,
    streamUrl,
    player,
    videoViewRef,
    playerState,
    progress,
    showLoadingIndicator,
    showControls,
    showControlsNow,
    isSeeking,
    setIsSeeking,
    seekPosition,
    setSeekPosition,
    isPortrait,
    screenHeight,
    controlsLocked,
    toggleControlsLock,
    showFrameControls,
    modals,
    showSubtitleOffset,
    setShowSubtitleOffset,
    accentColor,
    subtitleSettings,
    openSubtitlesApiKey,
    controlsConfig,
    controlsOrder,
    externalPlayerEnabled,
    externalPlayerAvailable,
    streamingQuality,
    setStreamingQuality,
    videoPlaybackSpeed,
    handleSpeedChange,
    sleepTimer,
    handleSleepTimerSelect,
    subtitleOffset,
    setSubtitleOffset,
    selectedSubtitleIndex,
    selectedAudioIndex,
    jellyfinSubtitleTracks,
    jellyfinAudioTracks,
    externalSubtitleCues,
    handleSelectSubtitle,
    handleSelectAudio,
    handleExternalSubtitleSelect,
    currentSubtitle,
    subtitlesLoading,
    subtitleLoadError,
    showSkipIntro,
    isIntroPreview,
    introStart,
    introEnd,
    showSkipCredits,
    creditsStart,
    handleSkipIntro,
    handleSkipCredits,
    showNextUpCard,
    nextEpisode,
    handlePlayNextEpisode,
    seasonEpisodes,
    allSeasons,
    episodeListSeasonId,
    setEpisodeListSeasonId,
    episodeListEpisodes,
    episodeListLoading,
    handleSelectEpisode,
    trickplayInfo,
    trickplayResolution,
    chapters,
    abLoop,
    chromecast,
    CastButton,
    handleCastDisconnect,
    handleCastRemoteClose,
    currentBrightness,
    setCurrentBrightness,
    currentVolume,
    setCurrentVolume,
    controlsOpacity,
    playButtonScale,
    skipLeftOpacity,
    skipRightOpacity,
    skipLeftScale,
    skipRightScale,
    handlePlayPause,
    handleSeek,
    handleDoubleTapSeek,
    handleFrameStep,
    handleEnterPiP,
    handleOpenExternalPlayer,
    handleClose,
    getDisplayName,
    getSubtitle,
    formatPlayerTime,
  } = core;

  // Back handler - needs to return boolean for useBackHandler
  useBackHandler(() => {
    handleClose();
    return true;
  });

  // Horizontal seek tracking (for updating position on gesture end)
  const horizontalSeekPositionRef = React.useRef(progress.position);

  const handleHorizontalSeekStart = React.useCallback((_startX: number) => {
    horizontalSeekPositionRef.current = progress.position;
  }, [progress.position]);

  const handleHorizontalSeekUpdate = React.useCallback((translationX: number) => {
    const seekAmount = translationX * 100;
    const newPosition = Math.max(0, Math.min(progress.duration, progress.position + seekAmount));
    horizontalSeekPositionRef.current = newPosition;
  }, [progress.duration, progress.position]);

  const handleHorizontalSeekEnd = React.useCallback(() => {
    handleSeek(horizontalSeekPositionRef.current);
  }, [handleSeek]);

  // Gesture handling using hook
  const {
    gesture,
    showBrightnessIndicator,
    showVolumeIndicator,
    isHorizontalSeeking,
    horizontalSeekPosition,
    horizontalSeekDelta,
  } = useVideoGestures({
    isPortrait,
    currentBrightness,
    currentVolume,
    onBrightnessChange: setCurrentBrightness,
    onVolumeChange: setCurrentVolume,
    onToggleControls: showControlsNow,
    onDoubleTapSeek: handleDoubleTapSeek,
    onHorizontalSeekStart: handleHorizontalSeekStart,
    onHorizontalSeekUpdate: handleHorizontalSeekUpdate,
    onHorizontalSeekEnd: handleHorizontalSeekEnd,
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

      <GestureDetector gesture={gesture}>
        <View className="flex-1">
          {streamUrl && (
            isWeb ? (
              <WebVideoView
                player={player}
                streamUrl={streamUrl}
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <VideoView
                ref={videoViewRef}
                player={player}
                style={{ width: '100%', height: '100%' }}
                contentFit="contain"
                nativeControls={false}
                allowsPictureInPicture={true}
                startsPictureInPictureAutomatically={true}
              />
            )
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

          <VideoPlayerOverlays
            isPortrait={isPortrait}
            showControls={showControls}
            isLoading={showLoadingIndicator}
            hasStreamUrl={!!streamUrl}
            accentColor={accentColor}
            skipLeftOpacity={skipLeftOpacity}
            skipLeftScale={skipLeftScale}
            skipRightOpacity={skipRightOpacity}
            skipRightScale={skipRightScale}
            abLoop={abLoop}
            showBrightnessIndicator={showBrightnessIndicator}
            showVolumeIndicator={showVolumeIndicator}
            currentBrightness={currentBrightness}
            currentVolume={currentVolume}
            isHorizontalSeeking={isHorizontalSeeking}
            horizontalSeekPosition={horizontalSeekPosition}
            horizontalSeekDelta={horizontalSeekDelta}
            currentPosition={progress.position}
            formatTime={formatPlayerTime}
            showSubtitleOffset={showSubtitleOffset}
            subtitleOffset={subtitleOffset}
            onSubtitleOffsetChange={setSubtitleOffset}
            hasActiveSubtitles={selectedSubtitleIndex !== undefined || externalSubtitleCues !== null}
            showSkipIntro={showSkipIntro}
            isIntroPreview={isIntroPreview}
            onSkipIntro={handleSkipIntro}
            showSkipCredits={showSkipCredits}
            onSkipCredits={handleSkipCredits}
            hasNextEpisode={!!nextEpisode}
            nextEpisodeNumber={nextEpisode?.IndexNumber}
            onPlayNextEpisode={navigateToNextEpisode}
            showNextUpCard={showNextUpCard}
          />

          <Animated.View style={controlsStyle} className="absolute inset-0" pointerEvents={showControls ? 'auto' : 'none'}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
              locations={[0, 0.25, 0.7, 1]}
              className="absolute inset-0"
            />

            <VideoPlayerHeader
              title={getDisplayName(item)}
              subtitle={getSubtitle()}
              isPortrait={isPortrait}
              accentColor={accentColor}
              controlsConfig={controlsConfig}
              controlsOrder={controlsOrder}
              onClose={handleClose}
              onMoreOptions={() => modals.openModal('moreOptions')}
              selectedSubtitleIndex={selectedSubtitleIndex}
              externalSubtitleCues={externalSubtitleCues !== null}
              openSubtitlesApiKey={openSubtitlesApiKey ?? undefined}
              isEpisode={isEpisode}
              hasEpisodes={!!seasonEpisodes?.Items && seasonEpisodes.Items.length > 1}
              chromecastAvailable={isChromecastSupported && chromecast.isAvailable}
              chromecastConnected={chromecast.isConnected}
              videoPlaybackSpeed={videoPlaybackSpeed}
              streamingQuality={streamingQuality}
              hasChapters={!!chapters && (chapters as any[]).length > 0}
              hasSleepTimer={!!sleepTimer}
              controlsLocked={controlsLocked}
              externalPlayerAvailable={externalPlayerAvailable}
              externalPlayerEnabled={externalPlayerEnabled}
              hasStreamUrl={!!streamUrl}
              onAudioSubtitleSelector={() => modals.openModal('audioSubtitleSelector')}
              onSubtitleSearch={() => modals.openModal('openSubtitlesSearch')}
              onEpisodeList={() => modals.openModal('episodeList')}
              onChromecast={() => chromecast.isConnected ? modals.openModal('castRemote') : chromecast.showCastDialog()}
              onPiP={handleEnterPiP}
              onSpeed={() => modals.openModal('speedSelector')}
              onQuality={() => modals.openModal('qualitySelector')}
              onChapters={() => modals.openModal('chapterList')}
              onSleepTimer={() => modals.openModal('sleepTimerSelector')}
              onLock={toggleControlsLock}
              onExternalPlayer={handleOpenExternalPlayer}
            />

            <VideoPlaybackControls
              playerState={playerState}
              isLoading={showLoadingIndicator}
              accentColor={accentColor}
              playButtonScale={playButtonScale}
              position={progress.position}
              duration={progress.duration}
              onPlayPause={handlePlayPause}
              onSeekBackward={() => handleSeek(Math.max(0, progress.position - 10000), true)}
              onSeekForward={() => handleSeek(Math.min(progress.duration, progress.position + 10000), true)}
              showFrameControls={showFrameControls}
              onFrameStep={handleFrameStep}
            />

            <VideoSeekBar
              position={progress.position}
              duration={progress.duration}
              buffered={progress.buffered}
              accentColor={accentColor}
              isSeeking={isSeeking}
              seekPosition={seekPosition}
              onSeekStart={(pos) => { setIsSeeking(true); setSeekPosition(pos); }}
              onSeekUpdate={setSeekPosition}
              onSeekEnd={(pos) => { handleSeek(pos); setIsSeeking(false); }}
              onTap={handleSeek}
              formatTime={formatPlayerTime}
              chapters={chapters as ChapterInfo[] | undefined}
              introStart={introStart}
              introEnd={introEnd}
              creditsStart={creditsStart}
              abLoop={abLoop}
              trickplayInfo={trickplayInfo}
              trickplayResolution={trickplayResolution ?? undefined}
              itemId={itemId}
              mediaSourceId={mediaSource?.Id}
              onChapterSeek={handleSeek}
            />
          </Animated.View>

          <ControlsLockedOverlay visible={controlsLocked} onUnlock={toggleControlsLock} />
        </View>
      </GestureDetector>

      {/* Modals */}
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

      <SubtitleStyleModal
        visible={modals.isOpen.subtitleStyleModal}
        onClose={() => modals.closeModal('subtitleStyleModal')}
      />

      <MoreOptionsModal
        visible={modals.isOpen.moreOptions}
        onClose={() => modals.closeModal('moreOptions')}
        screenHeight={screenHeight}
        accentColor={accentColor}
        controlsConfig={controlsConfig}
        controlsOrder={controlsOrder}
        selectedSubtitleIndex={selectedSubtitleIndex}
        externalSubtitleCues={externalSubtitleCues !== null}
        openSubtitlesApiKey={openSubtitlesApiKey ?? undefined}
        videoPlaybackSpeed={videoPlaybackSpeed}
        streamingQuality={streamingQuality}
        hasChapters={!!chapters && (chapters as any[]).length > 0}
        isEpisode={isEpisode}
        hasEpisodes={!!seasonEpisodes?.Items && seasonEpisodes.Items.length > 1}
        episodeInfo={item ? { season: item.ParentIndexNumber, episode: item.IndexNumber } : undefined}
        hasSleepTimer={!!sleepTimer}
        controlsLocked={controlsLocked}
        chromecastAvailable={isChromecastSupported && chromecast.isAvailable}
        chromecastConnected={chromecast.isConnected}
        externalPlayerAvailable={externalPlayerAvailable}
        externalPlayerEnabled={externalPlayerEnabled}
        hasStreamUrl={!!streamUrl}
        subtitleOffset={subtitleOffset}
        hasActiveSubtitles={selectedSubtitleIndex !== undefined || externalSubtitleCues !== null}
        onAudioSubtitleSelector={() => modals.openModal('audioSubtitleSelector')}
        onSubtitleSearch={() => modals.openModal('openSubtitlesSearch')}
        onSpeed={() => modals.openModal('speedSelector')}
        onQuality={() => modals.openModal('qualitySelector')}
        onChapters={() => modals.openModal('chapterList')}
        onEpisodes={() => modals.openModal('episodeList')}
        onSleepTimer={() => modals.openModal('sleepTimerSelector')}
        onLock={toggleControlsLock}
        onPiP={handleEnterPiP}
        onCast={() => chromecast.isConnected ? modals.openModal('castRemote') : chromecast.showCastDialog()}
        onExternalPlayer={handleOpenExternalPlayer}
        onSubtitleStyle={() => modals.openModal('subtitleStyleModal')}
        onSubtitleOffset={() => setShowSubtitleOffset(!showSubtitleOffset)}
      />

      <QualitySelectorModal
        visible={modals.isOpen.qualitySelector}
        onClose={() => modals.closeModal('qualitySelector')}
        screenHeight={screenHeight}
        accentColor={accentColor}
        currentQuality={streamingQuality}
        onSelectQuality={setStreamingQuality}
      />

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

      <CastRemoteControl
        visible={modals.isOpen.castRemote}
        castState={chromecast.castState}
        mediaInfo={core.castMediaInfo}
        itemId={item?.Id}
        onDisconnect={handleCastDisconnect}
        onClose={handleCastRemoteClose}
      />

      {modals.isOpen.openSubtitlesSearch && (
        <OpenSubtitlesSearch
          onClose={() => modals.closeModal('openSubtitlesSearch')}
          onSelectSubtitle={handleExternalSubtitleSelect}
          initialQuery={item?.Name || ''}
          initialYear={item?.ProductionYear}
          type={item?.Type === 'Episode' ? 'episode' : 'movie'}
          seasonNumber={item?.ParentIndexNumber}
          episodeNumber={item?.IndexNumber}
          tmdbId={item?.ProviderIds?.Tmdb ? parseInt(item.ProviderIds.Tmdb, 10) : undefined}
          imdbId={item?.ProviderIds?.Imdb}
        />
      )}

      {isChromecastSupported && CastButton && (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
          <CastButton style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );
}
