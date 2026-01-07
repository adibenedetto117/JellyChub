import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import { usePlayerStore } from '@/stores';
import { getAudioStreamUrl, reportPlaybackStart, reportPlaybackStopped, generatePlaySessionId } from '@/api';
import { ticksToMs, msToTicks } from '@/utils';
import { mediaSessionService } from './mediaSessionService';
import type { BaseItem } from '@/types/jellyfin';

class AudioService {
  private player: AudioPlayer | null = null;
  private currentItemId: string | null = null;
  private currentItem: BaseItem | null = null;
  private playSessionId: string | null = null;
  private isInitialized = false;
  private isLoading = false;
  private isSeeking = false;
  private statusSubscription: { remove: () => void } | null = null;
  private queueSubscription: (() => void) | null = null;
  private currentUserId: string | null = null;

  async initialize() {
    if (this.isInitialized) return;

    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    });

    await mediaSessionService.initialize();
    mediaSessionService.setCallbacks({
      onPlay: () => this.play(),
      onPause: () => this.pause(),
      onNext: () => this.skipToNext(),
      onPrevious: () => this.skipToPrevious(),
      onSeek: (positionMs) => this.seek(positionMs),
    });

    this.queueSubscription = usePlayerStore.subscribe(
      (state) => state.currentQueueIndex,
      (newIndex, prevIndex) => {
        if (newIndex !== prevIndex && newIndex >= 0) {
          const store = usePlayerStore.getState();
          const queueItem = store.queue[newIndex];
          if (queueItem && this.currentUserId && queueItem.item.Id !== this.currentItemId) {
            const mediaType = store.mediaType;
            this.loadAndPlay(
              queueItem.item,
              this.currentUserId,
              undefined,
              mediaType === 'audiobook' ? 'audiobook' : 'audio'
            );
          }
        }
      }
    );

    this.isInitialized = true;
  }

  async skipToNext() {
    const store = usePlayerStore.getState();
    store.playNext();
  }

  async skipToPrevious() {
    const store = usePlayerStore.getState();
    if (store.progress.position > 3000) {
      await this.seek(0);
    } else {
      store.playPrevious();
    }
  }

  async loadAndPlay(item: BaseItem, userId: string, startPositionMs?: number, forceMediaType?: 'audio' | 'audiobook') {
    if (this.isLoading) {
      return;
    }

    await this.initialize();
    this.currentUserId = userId;

    const store = usePlayerStore.getState();
    const isAudiobook = forceMediaType === 'audiobook' || item.Type === 'AudioBook';

    if (this.currentItemId === item.Id && this.player) {
      try {
        if (!this.player.playing) {
          this.player.play();
        }
      } catch (e) {
        console.log('Error resuming playback:', e);
      }
      return;
    }

    this.isLoading = true;

    try {
      if (this.player) {
        try {
          this.player.pause();
          this.statusSubscription?.remove();
          this.player.remove();
        } catch (e) {
          console.log('Error stopping previous player:', e);
        }
        this.player = null;
        this.statusSubscription = null;
      }

      if (this.currentItemId && this.playSessionId) {
        reportPlaybackStopped(
          this.currentItemId,
          this.currentItemId,
          this.playSessionId,
          msToTicks(store.progress.position)
        );
      }

      this.playSessionId = generatePlaySessionId();
      this.currentItemId = item.Id;
      this.currentItem = item;

      store.setCurrentItem(
        { item, mediaSource: { Id: item.Id } as any, streamUrl: '', playSessionId: this.playSessionId },
        isAudiobook ? 'audiobook' : 'audio'
      );
      store.setPlayerState('loading');

      // Use direct stream for M4B/M4A audiobooks (better seeking support)
      // Transcoded streams don't support proper seeking
      const container = item.MediaSources?.[0]?.Container?.toLowerCase();
      const useDirectStream = isAudiobook && (container === 'm4b' || container === 'm4a' || container === 'mp4');
      console.log(`Audio loading: container=${container}, isAudiobook=${isAudiobook}, useDirectStream=${useDirectStream}`);

      const streamUrl = getAudioStreamUrl(item.Id, { directStream: useDirectStream });
      console.log(`Audio stream URL: ${streamUrl}`);
      this.player = createAudioPlayer({ uri: streamUrl });

      this.statusSubscription = this.player.addListener('playbackStatusUpdate', (status) => {
        this.onPlaybackStatusUpdate(status);
      });

      this.player.play();

      if (startPositionMs && startPositionMs > 0) {
        this.player.seekTo(startPositionMs / 1000);
      }

      reportPlaybackStart({
        ItemId: item.Id,
        MediaSourceId: item.Id,
        PlaySessionId: this.playSessionId,
        PlayMethod: 'DirectPlay',
      });

      const durationMs = ticksToMs(item.RunTimeTicks ?? 0);
      await mediaSessionService.updateNowPlaying(item, startPositionMs ?? 0, durationMs);
      await mediaSessionService.updatePlaybackState('playing', startPositionMs ?? 0);
    } catch (error) {
      console.error('Error loading audio:', error);
      store.setPlayerState('error');
    } finally {
      this.isLoading = false;
    }
  }

  private onPlaybackStatusUpdate(status: AudioStatus) {
    const store = usePlayerStore.getState();

    if (!status.isLoaded || this.isSeeking) {
      return;
    }

    const positionMs = status.currentTime * 1000;
    const currentItemData = store.currentItem?.item;
    const durationMs = status.duration ? status.duration * 1000 : ticksToMs(currentItemData?.RunTimeTicks ?? 0);
    const bufferedMs = durationMs;

    if (status.playing) {
      store.setPlayerState('playing');
      mediaSessionService.updatePlaybackState('playing', positionMs);
    } else if (status.didJustFinish) {
      this.handleTrackEnd();
      return;
    } else {
      store.setPlayerState('paused');
      mediaSessionService.updatePlaybackState('paused', positionMs);
    }

    store.setProgress(positionMs, durationMs, bufferedMs);
  }

  private handleTrackEnd() {
    const store = usePlayerStore.getState();

    if (store.music.repeatMode === 'one') {
      this.player?.seekTo(0);
      this.player?.play();
    } else if (store.music.repeatMode === 'all' || store.currentQueueIndex < store.queue.length - 1) {
      store.playNext();
    } else {
      store.setPlayerState('idle');
    }
  }

  async play() {
    this.player?.play();
  }

  async pause() {
    this.player?.pause();
  }

  async togglePlayPause() {
    const store = usePlayerStore.getState();
    if (store.playerState === 'playing') {
      await this.pause();
    } else {
      await this.play();
    }
  }

  async seek(positionMs: number) {
    if (!this.player) {
      console.log('Cannot seek - no player');
      return;
    }

    this.isSeeking = true;
    const positionSec = positionMs / 1000;
    console.log(`Seeking to ${positionSec}s (${positionMs}ms), player exists: ${!!this.player}`);

    try {
      await this.player.seekTo(positionSec);
      // Log current position after seek to verify it worked
      const currentTime = (this.player as any).currentTime;
      console.log(`Seek complete, player reports position: ${currentTime}s`);
    } catch (e) {
      console.error('Seek error:', e);
    }

    // Keep seeking flag on for a bit to let the player catch up
    // Must be >= the timeout in audiobook.tsx component (600ms)
    setTimeout(() => {
      this.isSeeking = false;
    }, 700);
  }

  setPlaybackRate(rate: number) {
    if (!this.player) {
      console.log('Cannot set rate - no player');
      return;
    }
    try {
      const clampedRate = Math.min(Math.max(rate, 0.5), 2.0);
      (this.player as any).setPlaybackRate(clampedRate, 'high');
      console.log(`Playback rate set to ${clampedRate}x`);
    } catch (e) {
      console.error('Error setting playback rate:', e);
    }
  }

  async stop() {
    const store = usePlayerStore.getState();

    try {
      if (this.player && this.currentItemId && this.playSessionId) {
        reportPlaybackStopped(
          this.currentItemId,
          this.currentItemId,
          this.playSessionId,
          msToTicks(store.progress.position)
        );

        this.player.pause();
        this.statusSubscription?.remove();
        this.player.remove();
      }
    } catch (error) {
      console.error('Error stopping audio:', error);
    }

    await mediaSessionService.clear();

    this.player = null;
    this.statusSubscription = null;
    this.currentItemId = null;
    this.currentItem = null;
    this.playSessionId = null;

    store.clearCurrentItem();
  }

  getPlayer() {
    return this.player;
  }

  getCurrentItemId() {
    return this.currentItemId;
  }

  isPlaying() {
    return usePlayerStore.getState().playerState === 'playing';
  }
}

export const audioService = new AudioService();
