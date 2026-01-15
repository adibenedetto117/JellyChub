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
  ShuffleMode,
  Bookmark,
  Lyrics,
  VideoSleepTimer,
  VideoSleepTimerType,
} from '@/types/player';
import {
  DEFAULT_PLAYER_CONTROLS_CONFIG,
  DEFAULT_PLAYER_CONTROLS_ORDER,
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
  shuffleQueue: () => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
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
  setShuffleMode: (mode: ShuffleMode) => void;
  cycleShuffleMode: () => void;
  setRepeatMode: (mode: RepeatMode) => void;
  cycleRepeatMode: () => void;
  setLyrics: (lyrics: Lyrics | undefined) => void;
  setShowLyrics: (show: boolean) => void;
  setMusicSleepTimer: (minutes: number | undefined) => void;

  // Audiobook-specific
  setPlaybackSpeed: (speed: number) => void;
  setSleepTimer: (minutes: number | undefined) => void;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (id: string) => void;

  // Video-specific
  setAspectRatio: (ratio: PlayerStoreState['video']['aspectRatio']) => void;
  setPictureInPicture: (enabled: boolean) => void;
  toggleFlip: () => void;
  setVideoPlaybackSpeed: (speed: number) => void;
  setVideoSleepTimer: (timer: VideoSleepTimer | undefined) => void;
  clearVideoSleepTimer: () => void;

  // Subtitle offset
  setSubtitleOffset: (offset: number) => void;
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
    shuffleMode: 'off' as ShuffleMode,
    repeatMode: 'off',
    showLyrics: false,
    visualizerEnabled: false,
  },
  video: {
    aspectRatio: 'auto',
    brightness: 1,
    pictureInPicture: false,
    flipped: false,
    subtitleOffset: 0,
    playbackSpeed: 1.0,
  },
  settings: {
    autoPlay: true,
    defaultSubtitleLanguage: 'eng',
    defaultAudioLanguage: 'eng',
    forceSubtitles: false,
    subtitleSize: 'medium',
    subtitlePosition: 'bottom',
    subtitleBackgroundOpacity: 0.75,
    subtitleTextColor: '#ffffff',
    subtitleBackgroundColor: '#000000',
    subtitleOutlineStyle: 'shadow',
    hardwareAcceleration: true,
    maxStreamingBitrate: 20,
    externalPlayerEnabled: true,
    controlsConfig: DEFAULT_PLAYER_CONTROLS_CONFIG,
    controlsOrder: DEFAULT_PLAYER_CONTROLS_ORDER,
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

    shuffleQueue: () =>
      set((state) => {
        if (state.queue.length <= 1) return state;

        const upcomingItems = state.queue.slice(state.currentQueueIndex + 1);
        const shuffleMode = state.music.shuffleMode || 'all';
        let shuffled: typeof upcomingItems;

        // Fisher-Yates shuffle helper
        const fisherYates = <T>(arr: T[]): T[] => {
          const result = [...arr];
          for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
          }
          return result;
        };

        switch (shuffleMode) {
          case 'album': {
            // Group tracks by album, shuffle albums, keep track order within albums
            const albumGroups = new Map<string, typeof upcomingItems>();
            upcomingItems.forEach((item) => {
              const albumId = (item.item as any)?.AlbumId || 'unknown';
              if (!albumGroups.has(albumId)) {
                albumGroups.set(albumId, []);
              }
              albumGroups.get(albumId)!.push(item);
            });

            // Shuffle the album order
            const albums = fisherYates(Array.from(albumGroups.keys()));

            // Rebuild with shuffled albums but tracks in original order
            shuffled = albums.flatMap((albumId) => albumGroups.get(albumId) || []);
            break;
          }

          case 'avoid_recent': {
            // Get recently played track IDs from the played portion of queue
            const recentIds = new Set(
              state.queue.slice(Math.max(0, state.currentQueueIndex - 10), state.currentQueueIndex + 1)
                .map((item) => item.id)
            );

            // Separate recent and non-recent tracks
            const notRecent = upcomingItems.filter((item) => !recentIds.has(item.id));
            const recent = upcomingItems.filter((item) => recentIds.has(item.id));

            // Shuffle non-recent first, then add recent tracks at the end
            shuffled = [...fisherYates(notRecent), ...fisherYates(recent)];
            break;
          }

          case 'all':
          default: {
            // Standard Fisher-Yates shuffle
            shuffled = fisherYates(upcomingItems);
            break;
          }
        }

        // Rebuild queue: keep items up to and including current, then shuffled upcoming
        const newQueue = [
          ...state.queue.slice(0, state.currentQueueIndex + 1),
          ...shuffled,
        ].map((item, idx) => ({ ...item, index: idx }));

        return { queue: newQueue };
      }),

    reorderQueue: (fromIndex, toIndex) =>
      set((state) => {
        if (fromIndex === toIndex) return state;
        if (fromIndex < 0 || fromIndex >= state.queue.length) return state;
        if (toIndex < 0 || toIndex >= state.queue.length) return state;

        const newQueue = [...state.queue];
        const [movedItem] = newQueue.splice(fromIndex, 1);
        newQueue.splice(toIndex, 0, movedItem);

        // Update indices
        const reindexedQueue = newQueue.map((item, idx) => ({ ...item, index: idx }));

        // Adjust current queue index if needed
        let newCurrentIndex = state.currentQueueIndex;
        if (fromIndex === state.currentQueueIndex) {
          // Moving the currently playing item
          newCurrentIndex = toIndex;
        } else if (fromIndex < state.currentQueueIndex && toIndex >= state.currentQueueIndex) {
          // Moving an item from before current to after current
          newCurrentIndex--;
        } else if (fromIndex > state.currentQueueIndex && toIndex <= state.currentQueueIndex) {
          // Moving an item from after current to before current
          newCurrentIndex++;
        }

        return {
          queue: reindexedQueue,
          currentQueueIndex: newCurrentIndex,
        };
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

    setShuffleMode: (shuffleMode) =>
      set((state) => ({
        music: {
          ...state.music,
          shuffleMode,
          shuffle: shuffleMode !== 'off',
        },
      })),

    cycleShuffleMode: () =>
      set((state) => {
        const modes: ShuffleMode[] = ['off', 'all', 'album', 'avoid_recent'];
        const currentIndex = modes.indexOf(state.music.shuffleMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        return {
          music: {
            ...state.music,
            shuffleMode: nextMode,
            shuffle: nextMode !== 'off',
          },
        };
      }),

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

    setMusicSleepTimer: (minutes) =>
      set((state) => ({
        music: {
          ...state.music,
          sleepTimerMinutes: minutes,
          sleepTimerEndTime: minutes ? Date.now() + minutes * 60 * 1000 : undefined,
        },
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

    setVideoPlaybackSpeed: (playbackSpeed) =>
      set((state) => ({
        video: { ...state.video, playbackSpeed },
      })),

    setVideoSleepTimer: (sleepTimer) =>
      set((state) => ({
        video: { ...state.video, sleepTimer },
      })),

    clearVideoSleepTimer: () =>
      set((state) => ({
        video: { ...state.video, sleepTimer: undefined },
      })),

    // Subtitle offset (in milliseconds)
    setSubtitleOffset: (subtitleOffset) =>
      set((state) => ({
        video: { ...state.video, subtitleOffset },
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
