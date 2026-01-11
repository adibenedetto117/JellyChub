import {
  MediaControl,
  PlaybackState,
  Command,
  MediaControlEvent,
  MediaMetadata,
} from 'expo-media-control';
import { usePlayerStore } from '@/stores';
import { getImageUrl } from '@/api/client';
import type { BaseItem } from '@/types/jellyfin';
import { ticksToMs } from '@/utils';

class MediaSessionService {
  private isEnabled = false;
  private unsubscribe: (() => void) | null = null;
  private onPlayCallback: (() => void) | null = null;
  private onPauseCallback: (() => void) | null = null;
  private onStopCallback: (() => void) | null = null;
  private onNextCallback: (() => void) | null = null;
  private onPreviousCallback: (() => void) | null = null;
  private onSeekCallback: ((position: number) => void) | null = null;

  async initialize() {
    if (this.isEnabled) return;

    try {
      await MediaControl.enableMediaControls({
        capabilities: [
          Command.PLAY,
          Command.PAUSE,
          Command.STOP,
          Command.NEXT_TRACK,
          Command.PREVIOUS_TRACK,
          Command.SKIP_FORWARD,
          Command.SKIP_BACKWARD,
          Command.SEEK,
        ],
        android: {
          skipInterval: 10,
        },
        ios: {
          skipInterval: 10,
        },
      });

      this.unsubscribe = MediaControl.addListener(this.handleMediaControlEvent.bind(this));
      this.isEnabled = true;
    } catch (error) {
      // Silently fail - media controls are optional and the app should work without them
    }
  }

  private handleMediaControlEvent(event: MediaControlEvent) {
    const store = usePlayerStore.getState();

    switch (event.command) {
      case Command.PLAY:
        this.onPlayCallback?.();
        break;

      case Command.PAUSE:
        this.onPauseCallback?.();
        break;

      case Command.STOP:
        this.onStopCallback?.();
        break;

      case Command.NEXT_TRACK:
        this.onNextCallback?.();
        break;

      case Command.PREVIOUS_TRACK:
        this.onPreviousCallback?.();
        break;

      case Command.SKIP_FORWARD:
        const skipForwardSeconds = event.data?.interval || 10;
        const newForwardPosition = store.progress.position + skipForwardSeconds * 1000;
        this.onSeekCallback?.(Math.min(newForwardPosition, store.progress.duration));
        break;

      case Command.SKIP_BACKWARD:
        const skipBackwardSeconds = event.data?.interval || 10;
        const newBackwardPosition = store.progress.position - skipBackwardSeconds * 1000;
        this.onSeekCallback?.(Math.max(0, newBackwardPosition));
        break;

      case Command.SEEK:
        if (event.data?.position !== undefined) {
          this.onSeekCallback?.(event.data.position * 1000);
        }
        break;
    }
  }

  setCallbacks(callbacks: {
    onPlay?: () => void;
    onPause?: () => void;
    onStop?: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    onSeek?: (positionMs: number) => void;
  }) {
    this.onPlayCallback = callbacks.onPlay || null;
    this.onPauseCallback = callbacks.onPause || null;
    this.onStopCallback = callbacks.onStop || null;
    this.onNextCallback = callbacks.onNext || null;
    this.onPreviousCallback = callbacks.onPrevious || null;
    this.onSeekCallback = callbacks.onSeek || null;
  }

  async updateNowPlaying(item: BaseItem, positionMs: number, durationMs: number) {
    if (!this.isEnabled) {
      await this.initialize();
    }

    const artworkUrl = getImageUrl(item.Id, 'Primary', { maxWidth: 512, maxHeight: 512 });

    let artist = '';
    if (item.Type === 'Audio') {
      artist = (item as any).Artists?.join(', ') || (item as any).AlbumArtist || '';
    } else if (item.Type === 'AudioBook') {
      artist = (item as any).AlbumArtist || '';
    } else if (item.Type === 'Episode') {
      artist = item.SeriesName || '';
    }

    const album = (item as any).Album || (item as any).SeasonName || '';

    const metadata: MediaMetadata = {
      title: item.Name || 'Unknown',
      artist: artist || undefined,
      album: album || undefined,
      duration: durationMs / 1000,
      elapsedTime: positionMs / 1000,
      artwork: artworkUrl ? { uri: artworkUrl } : undefined,
    };

    try {
      await MediaControl.updateMetadata(metadata);
    } catch (error) {
      // Silently fail - media controls are optional
    }
  }

  async updatePlaybackState(
    state: 'playing' | 'paused' | 'loading' | 'idle' | 'error',
    positionMs: number,
    playbackRate: number = 1.0
  ) {
    if (!this.isEnabled) return;

    let playbackState: PlaybackState;
    switch (state) {
      case 'playing':
        playbackState = PlaybackState.PLAYING;
        break;
      case 'paused':
        playbackState = PlaybackState.PAUSED;
        break;
      case 'loading':
        playbackState = PlaybackState.BUFFERING;
        break;
      case 'error':
        playbackState = PlaybackState.ERROR;
        break;
      case 'idle':
      default:
        playbackState = PlaybackState.STOPPED;
        break;
    }

    try {
      await MediaControl.updatePlaybackState(
        playbackState,
        positionMs / 1000,
        state === 'playing' ? playbackRate : 0
      );
    } catch (error) {
      // Silently fail - media controls are optional
    }
  }

  async clear() {
    if (!this.isEnabled) return;

    try {
      await MediaControl.resetControls();
    } catch (error) {
      // Silently fail - media controls are optional
    }
  }

  async destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    try {
      await MediaControl.disableMediaControls();
    } catch (error) {
      // Silently fail - media controls are optional
    }

    this.isEnabled = false;
    this.onPlayCallback = null;
    this.onPauseCallback = null;
    this.onStopCallback = null;
    this.onNextCallback = null;
    this.onPreviousCallback = null;
    this.onSeekCallback = null;
  }
}

export const mediaSessionService = new MediaSessionService();
