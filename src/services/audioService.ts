import { createAudioPlayer, setAudioModeAsync, AudioPlayer, AudioStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { usePlayerStore } from '@/stores';
import { useDownloadStore } from '@/stores/downloadStore';
import { getAudioStreamUrl, reportPlaybackStart, reportPlaybackStopped, generatePlaySessionId } from '@/api';
import { ticksToMs, msToTicks } from '@/utils';
import { mediaSessionService } from './mediaSessionService';
import { encryptionService } from './encryptionService';
import type { BaseItem } from '@/types/jellyfin';

class AudioService {
  private player: AudioPlayer | null = null;
  private preloadedPlayer: AudioPlayer | null = null;
  private preloadedItemId: string | null = null;
  private currentItemId: string | null = null;
  private currentItem: BaseItem | null = null;
  private playSessionId: string | null = null;
  private isInitialized = false;
  private isLoading = false;
  private isSeeking = false;
  private hasHandledTrackEnd = false;
  private isPreloading = false;
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
    const hasNext = store.currentQueueIndex < store.queue.length - 1 || store.music.repeatMode === 'all';

    if (!hasNext) {
      return;
    }

    this.hasHandledTrackEnd = false;
    store.playNext();
  }

  async skipToPrevious() {
    const store = usePlayerStore.getState();
    const currentIndex = store.currentQueueIndex;
    const position = store.progress.position;

    // If more than 3 seconds in, restart current track
    if (position > 3000) {
      this.hasHandledTrackEnd = false;

      // Seek to beginning and ensure playback
      if (this.player) {
        this.player.seekTo(0);
        if (!this.player.playing) {
          this.player.play();
        }
      }

      // Update store progress
      store.setProgress(0, store.progress.duration, store.progress.buffered);
      return;
    }

    // Otherwise go to previous track if available
    if (currentIndex > 0) {
      this.hasHandledTrackEnd = false;

      // Clear current item ID to ensure the subscription triggers a reload
      // This prevents the subscription's ID check from blocking the load
      this.currentItemId = null;

      store.playPrevious();
    } else {
      // At first track, just restart it
      if (this.player) {
        this.player.seekTo(0);
        if (!this.player.playing) {
          this.player.play();
        }
      }
      store.setProgress(0, store.progress.duration, store.progress.buffered);
    }
  }

  // Force play a specific queue index (always reloads, even if same track)
  async forcePlayIndex(index: number) {
    const store = usePlayerStore.getState();
    const queueItem = store.queue[index];

    if (!queueItem || !this.currentUserId) {
      return;
    }

    // Clear current item ID to force reload
    this.currentItemId = null;
    this.hasHandledTrackEnd = false;

    // Update store index (this triggers the subscription)
    store.skipToIndex(index);

    // If subscription didn't trigger (same index), manually load
    if (store.currentQueueIndex === index) {
      const mediaType = store.mediaType;
      await this.loadAndPlay(
        queueItem.item,
        this.currentUserId,
        undefined,
        mediaType === 'audiobook' ? 'audiobook' : 'audio'
      );
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
        // Silently handle resume errors
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
          // Silently handle player cleanup errors
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
      this.hasHandledTrackEnd = false;

      store.setCurrentItem(
        { item, mediaSource: { Id: item.Id } as any, streamUrl: '', playSessionId: this.playSessionId },
        isAudiobook ? 'audiobook' : 'audio'
      );
      store.setPlayerState('loading');

      // Use direct stream for M4B/M4A audiobooks (better seeking support)
      // Transcoded streams don't support proper seeking
      const container = item.MediaSources?.[0]?.Container?.toLowerCase();
      const useDirectStream = isAudiobook && (container === 'm4b' || container === 'm4a' || container === 'mp4');

      let playbackUrl: string;
      let isLocalPlayback = false;
      const downloadStore = useDownloadStore.getState();
      const downloadedItem = downloadStore.getDownloadedItem(item.Id);

      if (downloadedItem?.localPath) {
        const fileInfo = await FileSystem.getInfoAsync(downloadedItem.localPath);
        if (fileInfo.exists) {
          if (downloadedItem.localPath.endsWith('.enc')) {
            playbackUrl = await encryptionService.getDecryptedUri(downloadedItem.localPath);
          } else {
            playbackUrl = downloadedItem.localPath;
          }
          isLocalPlayback = true;
        } else {
          playbackUrl = getAudioStreamUrl(item.Id, { directStream: useDirectStream });
        }
      } else {
        playbackUrl = getAudioStreamUrl(item.Id, { directStream: useDirectStream });
      }

      const preloaded = this.usePreloadedPlayer(item.Id);
      if (preloaded) {
        this.player = preloaded;
      } else {
        this.player = createAudioPlayer({ uri: playbackUrl });
      }

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
        PlayMethod: isLocalPlayback ? 'DirectPlay' : 'DirectStream',
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

    if (store.mediaType === 'audio' && status.playing && durationMs > 0) {
      this.checkPreloadTrigger(positionMs, durationMs);
    }

    const isNearEnd = durationMs > 0 && positionMs >= durationMs - 500;
    const shouldTriggerEnd = status.didJustFinish || (isNearEnd && !status.playing);

    if (shouldTriggerEnd && !this.hasHandledTrackEnd) {
      this.handleTrackEnd();
      return;
    }

    if (status.playing) {
      store.setPlayerState('playing');
      mediaSessionService.updatePlaybackState('playing', positionMs);
    } else if (!shouldTriggerEnd) {
      store.setPlayerState('paused');
      mediaSessionService.updatePlaybackState('paused', positionMs);
    }

    store.setProgress(positionMs, durationMs, bufferedMs);
  }

  private handleTrackEnd() {
    if (this.hasHandledTrackEnd) {
      return;
    }
    this.hasHandledTrackEnd = true;

    const store = usePlayerStore.getState();

    if (store.music.repeatMode === 'one') {
      this.hasHandledTrackEnd = false;
      this.player?.seekTo(0);
      this.player?.play();
    } else if (store.music.repeatMode === 'all' || store.currentQueueIndex < store.queue.length - 1) {
      store.playNext();
    } else {
      store.setPlayerState('idle');
    }
  }

  private async preloadNextTrack() {
    if (this.isPreloading || this.preloadedPlayer) return;

    const store = usePlayerStore.getState();
    const hasNext = store.currentQueueIndex < store.queue.length - 1 || store.music.repeatMode === 'all';
    if (!hasNext || store.music.repeatMode === 'one') return;

    let nextIndex = store.currentQueueIndex + 1;
    if (nextIndex >= store.queue.length && store.music.repeatMode === 'all') {
      nextIndex = 0;
    }

    const nextItem = store.queue[nextIndex]?.item;
    if (!nextItem || nextItem.Id === this.preloadedItemId) return;

    this.isPreloading = true;

    try {
      const container = nextItem.MediaSources?.[0]?.Container?.toLowerCase();
      const useDirectStream = container === 'm4b' || container === 'm4a' || container === 'mp4';

      let playbackUrl: string;
      const downloadStore = useDownloadStore.getState();
      const downloadedItem = downloadStore.getDownloadedItem(nextItem.Id);

      if (downloadedItem?.localPath) {
        const fileInfo = await FileSystem.getInfoAsync(downloadedItem.localPath);
        if (fileInfo.exists) {
          if (downloadedItem.localPath.endsWith('.enc')) {
            playbackUrl = await encryptionService.getDecryptedUri(downloadedItem.localPath);
          } else {
            playbackUrl = downloadedItem.localPath;
          }
        } else {
          playbackUrl = getAudioStreamUrl(nextItem.Id, { directStream: useDirectStream });
        }
      } else {
        playbackUrl = getAudioStreamUrl(nextItem.Id, { directStream: useDirectStream });
      }

      this.preloadedPlayer = createAudioPlayer({ uri: playbackUrl });
      this.preloadedItemId = nextItem.Id;
    } catch (error) {
      this.clearPreloadedPlayer();
    } finally {
      this.isPreloading = false;
    }
  }

  private clearPreloadedPlayer() {
    if (this.preloadedPlayer) {
      try {
        this.preloadedPlayer.remove();
      } catch (e) {}
      this.preloadedPlayer = null;
      this.preloadedItemId = null;
    }
  }

  private usePreloadedPlayer(itemId: string): AudioPlayer | null {
    if (this.preloadedPlayer && this.preloadedItemId === itemId) {
      const player = this.preloadedPlayer;
      this.preloadedPlayer = null;
      this.preloadedItemId = null;
      return player;
    }
    this.clearPreloadedPlayer();
    return null;
  }

  private checkPreloadTrigger(positionMs: number, durationMs: number) {
    const timeRemaining = durationMs - positionMs;
    const preloadThreshold = 10000;

    if (timeRemaining <= preloadThreshold && timeRemaining > preloadThreshold - 500) {
      this.preloadNextTrack();
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
      return;
    }

    this.isSeeking = true;
    const positionSec = positionMs / 1000;

    try {
      await this.player.seekTo(positionSec);
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
      return;
    }
    try {
      const clampedRate = Math.min(Math.max(rate, 0.5), 2.0);
      (this.player as any).setPlaybackRate(clampedRate, 'high');
    } catch (e) {
      console.error('Error setting playback rate:', e);
    }
  }

  async stop() {
    const store = usePlayerStore.getState();

    this.clearPreloadedPlayer();

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

    if (this.queueSubscription) {
      this.queueSubscription();
      this.queueSubscription = null;
    }

    await mediaSessionService.clear();

    this.player = null;
    this.statusSubscription = null;
    this.currentItemId = null;
    this.currentItem = null;
    this.playSessionId = null;
    this.isInitialized = false;
    this.isPreloading = false;

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

  /**
   * Fully destroys the audio service, cleaning up all resources.
   * After calling this, initialize() must be called again before use.
   */
  async destroy() {
    await this.stop();
    this.currentUserId = null;
  }
}

export const audioService = new AudioService();
