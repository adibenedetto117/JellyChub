import type { BaseItem, MediaSource, MediaStream } from './jellyfin';

export type PlayerMediaType = 'video' | 'audio' | 'audiobook';

export type RepeatMode = 'off' | 'one' | 'all';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'ended' | 'error';

export interface PlayerItem {
  item: BaseItem;
  mediaSource: MediaSource;
  streamUrl: string;
  playSessionId: string;
}

export interface QueueItem {
  id: string;
  item: BaseItem;
  index: number;
}

export interface PlayerProgress {
  position: number; // in milliseconds
  duration: number; // in milliseconds
  buffered: number; // percentage 0-100
}

export interface SubtitleTrack {
  index: number;
  id: string;
  language?: string;
  title?: string;
  isDefault: boolean;
  isForced: boolean;
  isExternal: boolean;
  url?: string; // for external subtitles
}

export interface AudioTrackInfo {
  index: number;
  id: string;
  language?: string;
  title?: string;
  codec?: string;
  channels?: number;
  isDefault: boolean;
}

export type SubtitleSize = 'small' | 'medium' | 'large' | 'extraLarge';
export type SubtitlePosition = 'bottom' | 'top';
export type SubtitleFontColor = '#ffffff' | '#ffff00' | '#00ffff' | '#00ff00';
export type SubtitleBackgroundColor = 'none' | '#000000' | '#333333';
export type SubtitleOutlineStyle = 'none' | 'outline' | 'shadow' | 'both';

export interface PlayerSettings {
  autoPlay: boolean;
  defaultSubtitleLanguage: string;
  defaultAudioLanguage: string;
  forceSubtitles: boolean;
  subtitleSize: SubtitleSize;
  subtitlePosition: SubtitlePosition;
  subtitleBackgroundOpacity: number;
  subtitleTextColor: SubtitleFontColor;
  subtitleBackgroundColor: SubtitleBackgroundColor;
  subtitleOutlineStyle: SubtitleOutlineStyle;
  hardwareAcceleration: boolean;
  maxStreamingBitrate: number;
  externalPlayerEnabled: boolean;
}

export interface AudiobookPlayerState {
  sleepTimerEndTime?: number; // timestamp when sleep timer ends
  sleepTimerMinutes?: number;
  playbackSpeed: number; // 0.5 - 3.0
  currentChapter?: Chapter;
  bookmarks: Bookmark[];
}

export interface Chapter {
  id: string;
  name: string;
  startPositionTicks: number;
  imageTag?: string;
}

export interface Bookmark {
  id: string;
  itemId: string;
  positionTicks: number;
  name?: string;
  createdAt: string;
}

export interface LyricsLine {
  startTime: number; // in milliseconds
  endTime?: number;
  text: string;
}

export interface Lyrics {
  isSynced: boolean;
  lines: LyricsLine[];
  source?: string;
}

export interface MusicPlayerState {
  shuffle: boolean;
  repeatMode: RepeatMode;
  showLyrics: boolean;
  lyrics?: Lyrics;
  visualizerEnabled: boolean;
  // Sleep timer
  sleepTimerEndTime?: number;
  sleepTimerMinutes?: number;
  // Crossfade
  crossfadeEnabled: boolean;
  crossfadeDuration: number; // in seconds (0-12)
}

export type VideoSleepTimerType = 'duration' | 'end_of_episode' | 'custom';

export interface VideoSleepTimer {
  type: VideoSleepTimerType;
  endTime: number;
  durationMinutes?: number;
}

export interface VideoPlayerState {
  aspectRatio: 'auto' | '16:9' | '4:3' | '21:9' | 'fill';
  brightness: number; // 0-1
  pictureInPicture: boolean;
  selectedSubtitleTrack?: number;
  selectedAudioTrack?: number;
  flipped: boolean;
  subtitleOffset: number; // in milliseconds, positive = delay subtitles, negative = advance subtitles
  playbackSpeed: number; // 0.25 - 3.0
  sleepTimer?: VideoSleepTimer;
}

// Combined player store state
export interface PlayerStoreState {
  // Current playback
  mediaType: PlayerMediaType | null;
  playerState: PlayerState;
  currentItem: PlayerItem | null;
  progress: PlayerProgress;

  // Queue
  queue: QueueItem[];
  currentQueueIndex: number;

  // Tracks
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrackInfo[];

  // Type-specific state
  audiobook: AudiobookPlayerState;
  music: MusicPlayerState;
  video: VideoPlayerState;

  // Settings
  settings: PlayerSettings;
}
