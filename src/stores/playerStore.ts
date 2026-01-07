import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type {
  PlayerStoreState,
  PlayerItem,
  QueueItem,
  PlayerState,
  PlayerMediaType,
  SubtitleTrack,
  AudioTrackInfo,
  RepeatMode,
  Bookmark,
  Lyrics,
} from '@/types/player';

interface PlayerActions {
  // Playback control
  setPlayerState: (state: PlayerState) => void;
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  stop: () => void;

  // Current item
  setCurrentItem: (item: PlayerItem, mediaType: PlayerMediaType) => void;
  clearCurrentItem: () => void;

  // Progress
  setProgress: (position: number, duration: number, buffered?: number) => void;
  seek: (position: number) => void;
  seekRelative: (delta: number) => void;

  // Queue management
  setQueue: (items: QueueItem[], startIndex?: number) => void;
  addToQueue: (item: QueueItem) => void;
  addToPlayNext: (item: QueueItem) => void;
  removeFromQueue: (index: number) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  skipToIndex: (index: number) => void;

  // Tracks
  setSubtitleTracks: (tracks: SubtitleTrack[]) => void;
  setAudioTracks: (tracks: AudioTrackInfo[]) => void;
  selectSubtitleTrack: (index: number | undefined) => void;
  selectAudioTrack: (index: number) => void;

  // Music-specific
  setShuffle: (enabled: boolean) => void;
  toggleShuffle: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  setLyrics: (lyrics: Lyrics | undefined) => void;
  setShowLyrics: (show: boolean) => void;

  // Audiobook-specific
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (minutes: number | undefined) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // Video-specific
  setAspectRatio: (ratio: PlayerStoreState['video']['aspectRatio']) => void;
  setPictureInPicture: (enabled: boolean) => void;
  toggleFlip: () => void;
}

type PlayerStore = PlayerStoreState & PlayerActions;

const initialState: PlayerStoreState = {
  mediaType: null,
  playerState: 'idle',
  currentItem: null,
  progress: {
    position: 0,
    duration: 0,
    buffered: 0,
  },
  queue: [],
  currentQueueIndex: -1,
  subtitleTracks: [],
  audioTracks: [],
  audiobook: {
    playbackSpeed: 1.0,
    bookmarks: [],
  },
  music: {
    shuffle: false,
    repeatMode: 'off',
    showLyrics: false,
    visualizerEnabled: false,
  },
  video: {
    aspectRatio: 'auto',
    brightness: 1,
    pictureInPicture: false,
    flipped: false,
  },
  settings: {
    autoPlay: true,
    defaultSubtitleLanguage: 'eng',
    defaultAudioLanguage: 'eng',
    subtitleSize: 'medium',
    subtitlePosition: 'bottom',
    subtitleBackgroundOpacity: 0.75,
    subtitleTextColor: '#ffffff',
    subtitleBackgroundColor: '#000000',
    hardwareAcceleration: true,
    maxStreamingBitrate: 20,
  },
};

export const usePlayerStore = create<PlayerStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Playback control
    setPlayerState: (playerState) => set({ playerState }),

    play: () => set({ playerState: 'playing' }),

    pause: () => set({ playerState: 'paused' }),

    togglePlayPause: () =>
      set((state) => ({
        playerState: state.playerState === 'playing' ? 'paused' : 'playing',
      })),

    stop: () =>
      set({
        playerState: 'idle',
        currentItem: null,
        progress: { position: 0, duration: 0, buffered: 0 },
      }),

    // Current item
    setCurrentItem: (item, mediaType) =>
      set({
        currentItem: item,
        mediaType,
        playerState: 'loading',
        progress: { position: 0, duration: 0, buffered: 0 },
        subtitleTracks: [],
        audioTracks: [],
      }),

    clearCurrentItem: () =>
      set({
        currentItem: null,
        mediaType: null,
        playerState: 'idle',
        progress: { position: 0, duration: 0, buffered: 0 },
      }),

    // Progress
    setProgress: (position, duration, buffered = 0) =>
      set({ progress: { position, duration, buffered } }),

    seek: (position) =>
      set((state) => ({
        progress: { ...state.progress, position },
      })),

    seekRelative: (delta) =>
      set((state) => ({
        progress: {
          ...state.progress,
          position: Math.max(
            0,
            Math.min(state.progress.duration, state.progress.position + delta)
          ),
        },
      })),

    // Queue management
    setQueue: (items, startIndex = 0) =>
      set({
        queue: items,
        currentQueueIndex: startIndex,
      }),

    addToQueue: (item) =>
      set((state) => ({
        queue: [...state.queue, item],
      })),

    addToPlayNext: (item) =>
      set((state) => {
        const insertIndex = state.currentQueueIndex + 1;
        const newQueue = [
          ...state.queue.slice(0, insertIndex),
          item,
          ...state.queue.slice(insertIndex),
        ];
        // Re-index all items after insertion
        const reindexedQueue = newQueue.map((queueItem, idx) => ({
          ...queueItem,
          index: idx,
        }));
        return {
          queue: reindexedQueue,
        };
      }),

    removeFromQueue: (index) =>
      set((state) => {
        const newQueue = state.queue.filter((_, i) => i !== index);
        let newIndex = state.currentQueueIndex;

        if (index < state.currentQueueIndex) {
          newIndex--;
        } else if (index === state.currentQueueIndex && index >= newQueue.length) {
          newIndex = newQueue.length - 1;
        }

        return {
          queue: newQueue,
          currentQueueIndex: newIndex,
        };
      }),

    clearQueue: () =>
      set({
        queue: [],
        currentQueueIndex: -1,
      }),

    playNext: () => {
      const { queue, currentQueueIndex, music } = get();
      let nextIndex = currentQueueIndex + 1;

      if (nextIndex >= queue.length) {
        if (music.repeatMode === 'all') {
          nextIndex = 0;
        } else {
          return; // End of queue
        }
      }

      set({ currentQueueIndex: nextIndex });
    },

    playPrevious: () => {
      const { currentQueueIndex } = get();

      // Note: 3-second restart logic is handled by audioService.skipToPrevious()
      // This just handles the queue index change
      if (currentQueueIndex > 0) {
        set({ currentQueueIndex: currentQueueIndex - 1 });
      }
    },

    skipToIndex: (index) => {
      const { queue } = get();
      if (index >= 0 && index < queue.length) {
        set({ currentQueueIndex: index });
      }
    },

    // Tracks
    setSubtitleTracks: (subtitleTracks) => set({ subtitleTracks }),

    setAudioTracks: (audioTracks) => set({ audioTracks }),

    selectSubtitleTrack: (index) =>
      set((state) => ({
        video: { ...state.video, selectedSubtitleTrack: index },
      })),

    selectAudioTrack: (index) =>
      set((state) => ({
        video: { ...state.video, selectedAudioTrack: index },
      })),

    // Music-specific
    setShuffle: (shuffle) =>
      set((state) => ({
        music: { ...state.music, shuffle },
      })),

    toggleShuffle: () =>
      set((state) => ({
        music: { ...state.music, shuffle: !state.music.shuffle },
      })),

    setRepeatMode: (repeatMode) =>
      set((state) => ({
        music: { ...state.music, repeatMode },
      })),

    cycleRepeatMode: () =>
      set((state) => {
        const modes: RepeatMode[] = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(state.music.repeatMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        return {
          music: { ...state.music, repeatMode: nextMode },
        };
      }),

    setLyrics: (lyrics) =>
      set((state) => ({
        music: { ...state.music, lyrics },
      })),

    setShowLyrics: (showLyrics) =>
      set((state) => ({
        music: { ...state.music, showLyrics },
      })),

    // Audiobook-specific
    setPlaybackSpeed: (playbackSpeed) =>
      set((state) => ({
        audiobook: { ...state.audiobook, playbackSpeed },
      })),

    setSleepTimer: (minutes) =>
      set((state) => ({
        audiobook: {
          ...state.audiobook,
          sleepTimerMinutes: minutes,
          sleepTimerEndTime: minutes ? Date.now() + minutes * 60 * 1000 : undefined,
        },
      })),

    addBookmark: (bookmark) =>
      set((state) => ({
        audiobook: {
          ...state.audiobook,
          bookmarks: [
            ...state.audiobook.bookmarks,
            {
              ...bookmark,
              id: `bookmark_${Date.now()}`,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      })),

    removeBookmark: (id) =>
      set((state) => ({
        audiobook: {
          ...state.audiobook,
          bookmarks: state.audiobook.bookmarks.filter((b) => b.id !== id),
        },
      })),

    // Video-specific
    setAspectRatio: (aspectRatio) =>
      set((state) => ({
        video: { ...state.video, aspectRatio },
      })),

    setPictureInPicture: (pictureInPicture) =>
      set((state) => ({
        video: { ...state.video, pictureInPicture },
      })),

    toggleFlip: () =>
      set((state) => ({
        video: { ...state.video, flipped: !state.video.flipped },
      })),
  }))
);

// Selectors
export const selectIsPlaying = (state: PlayerStore) =>
  state.playerState === 'playing';

export const selectCurrentQueueItem = (state: PlayerStore) =>
  state.queue[state.currentQueueIndex];

export const selectHasNext = (state: PlayerStore) =>
  state.currentQueueIndex < state.queue.length - 1 ||
  state.music.repeatMode === 'all';

export const selectHasPrevious = (state: PlayerStore) =>
  state.currentQueueIndex >= 0; // Can always restart or go back
