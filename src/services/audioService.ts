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
  private hasHandledTrackEnd = false;
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
        console.log(`Queue subscription: index changed from ${prevIndex} to ${newIndex}`);
        if (newIndex !== prevIndex && newIndex >= 0) {
          const store = usePlayerStore.getState();
          const queueItem = store.queue[newIndex];
          console.log(`Queue subscription: queueItem=${queueItem?.item?.Name}, currentUserId=${!!this.currentUserId}, currentItemId=${this.currentItemId}, newItemId=${queueItem?.item?.Id}`);
          if (queueItem && this.currentUserId && queueItem.item.Id !== this.currentItemId) {
            console.log(`Queue subscription: Loading track "${queueItem.item.Name}"`);
            const mediaType = store.mediaType;
            this.loadAndPlay(
              queueItem.item,
              this.currentUserId,
              undefined,
              mediaType === 'audiobook' ? 'audiobook' : 'audio'
            );
          } else {
            console.log(`Queue subscription: Skipping load - conditions not met (queueItem: ${!!queueItem}, userId: ${!!this.currentUserId}, sameId: ${queueItem?.item?.Id === this.currentItemId})`);
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
      console.log('Skip next: No next track available');
      return;
    }

    console.log(`Skip next: ${store.currentQueueIndex + 1}/${store.queue.length}`);
    this.hasHandledTrackEnd = false;
    store.playNext();
  }

  async skipToPrevious() {
    const store = usePlayerStore.getState();
    const currentIndex = store.currentQueueIndex;
    const position = store.progress.position;

    console.log(`Skip previous: currentIndex=${currentIndex}, position=${position}ms, queueLength=${store.queue.length}`);

    // If more than 3 seconds in, restart current track
    if (position > 3000) {
      console.log('Skip previous: Restarting current track (position > 3000ms)');
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
      const prevIndex = currentIndex - 1;
      const prevItem = store.queue[prevIndex];
      console.log(`Skip previous: Going to track index ${prevIndex} (was ${currentIndex}), item: ${prevItem?.item?.Name}`);

      this.hasHandledTrackEnd = false;

      // Clear current item ID to ensure the subscription triggers a reload
      // This prevents the subscription's ID check from blocking the load
      this.currentItemId = null;

      store.playPrevious();

      // Verify the index changed
      const newIndex = usePlayerStore.getState().currentQueueIndex;
      console.log(`Skip previous: Index after playPrevious: ${newIndex}`);
    } else {
      // At first track, just restart it
      console.log('Skip previous: At first track (index 0), restarting');
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
      console.log('forcePlayIndex: Invalid index or no user');
      return;
    }

    console.log(`Force playing index ${index}: ${queueItem.item.Name}`);

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

    // Check for track end - use didJustFinish OR position-based detection as fallback
    // Position-based: if we're within 500ms of the end and not playing, treat as ended
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
    // Prevent duplicate calls for the same track
    if (this.hasHandledTrackEnd) {
      return;
    }
    this.hasHandledTrackEnd = true;

    const store = usePlayerStore.getState();
    console.log(`Track ended. Queue: ${store.currentQueueIndex + 1}/${store.queue.length}, RepeatMode: ${store.music.repeatMode}`);

    if (store.music.repeatMode === 'one') {
      // For repeat one, reset the flag so it can trigger again
      this.hasHandledTrackEnd = false;
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
