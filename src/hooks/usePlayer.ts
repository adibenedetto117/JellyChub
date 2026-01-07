import { useCallback } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getPlaybackInfo,
  getStreamUrl,
  getAudioStreamUrl,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  selectBestMediaSource,
  determinePlayMethod,
  generatePlaySessionId,
} from '@/api';
import { ticksToMs, msToTicks, getSubtitleStreams, getAudioStreams } from '@/utils';
import type { BaseItem } from '@/types/jellyfin';
import type { PlayerMediaType } from '@/types/player';

export function usePlayer() {
  const {
    playerState,
    progress,
    currentItem,
    queue,
    currentQueueIndex,
    music,
    audiobook,
    video,
    setPlayerState,
    setProgress,
    setCurrentItem,
    clearCurrentItem,
    setSubtitleTracks,
    setAudioTracks,
    setQueue,
    playNext,
    playPrevious,
    togglePlayPause,
    seek,
    seekRelative,
  } = usePlayerStore();

  const currentUser = useAuthStore((state) => state.currentUser);

  const playItem = useCallback(
    async (item: BaseItem, mediaType: PlayerMediaType) => {
      if (!currentUser) return;

      const playSessionId = generatePlaySessionId();

      if (mediaType === 'video') {
        const playbackInfo = await getPlaybackInfo(item.Id, currentUser.Id);
        const source = selectBestMediaSource(playbackInfo.MediaSources);

        if (!source) {
          setPlayerState('error');
          return;
        }

        const streamUrl = getStreamUrl(item.Id, source.Id, {
          startTimeTicks: item.UserData?.PlaybackPositionTicks,
        });

        const subtitles = getSubtitleStreams(source).map((s) => ({
          index: s.Index,
          id: s.Index.toString(),
          language: s.Language,
          title: s.DisplayTitle,
          isDefault: s.IsDefault,
          isForced: s.IsForced,
          isExternal: s.IsExternal,
        }));
        setSubtitleTracks(subtitles);

        const audioTracks = getAudioStreams(source).map((s) => ({
          index: s.Index,
          id: s.Index.toString(),
          language: s.Language,
          title: s.DisplayTitle,
          codec: s.Codec,
          channels: s.Channels,
          isDefault: s.IsDefault,
        }));
        setAudioTracks(audioTracks);

        setCurrentItem(
          { item, mediaSource: source, streamUrl, playSessionId },
          mediaType
        );

        const startPosition = ticksToMs(item.UserData?.PlaybackPositionTicks ?? 0);
        setProgress(startPosition, ticksToMs(item.RunTimeTicks ?? 0), 0);

        await reportPlaybackStart({
          ItemId: item.Id,
          MediaSourceId: source.Id,
          PlaySessionId: playSessionId,
          PlayMethod: determinePlayMethod(source),
        });
      } else {
        const streamUrl = getAudioStreamUrl(item.Id);
        setCurrentItem(
          { item, mediaSource: { Id: item.Id } as any, streamUrl, playSessionId },
          mediaType
        );

        const startPosition = ticksToMs(item.UserData?.PlaybackPositionTicks ?? 0);
        setProgress(startPosition, ticksToMs(item.RunTimeTicks ?? 0), 0);
      }

      setPlayerState('playing');
    },
    [currentUser]
  );

  const stopPlayback = useCallback(async () => {
    if (currentItem) {
      await reportPlaybackStopped(
        currentItem.item.Id,
        currentItem.mediaSource.Id,
        currentItem.playSessionId,
        msToTicks(progress.position)
      );
    }
    clearCurrentItem();
  }, [currentItem, progress.position]);

  const reportProgress = useCallback(async () => {
    if (!currentItem) return;

    await reportPlaybackProgress({
      ItemId: currentItem.item.Id,
      MediaSourceId: currentItem.mediaSource.Id,
      PositionTicks: msToTicks(progress.position),
      IsPaused: playerState === 'paused',
      IsMuted: false,
      PlaySessionId: currentItem.playSessionId,
    });
  }, [currentItem, progress.position, playerState]);

  return {
    playerState,
    progress,
    currentItem,
    queue,
    currentQueueIndex,
    music,
    audiobook,
    video,
    playItem,
    stopPlayback,
    reportProgress,
    togglePlayPause,
    seek,
    seekRelative,
    playNext,
    playPrevious,
    setQueue,
  };
}
