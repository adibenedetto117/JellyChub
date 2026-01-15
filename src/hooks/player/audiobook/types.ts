import type { SharedValue } from 'react-native-reanimated';
import type { Gesture } from 'react-native-gesture-handler';

export const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export const SLEEP_OPTIONS = [
  { label: 'Off', minutes: 0 },
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '45 min', minutes: 45 },
  { label: '1 hour', minutes: 60 },
  { label: '1.5 hours', minutes: 90 },
  { label: '2 hours', minutes: 120 },
] as const;

export interface Chapter {
  Id: string;
  Name: string;
  StartPositionTicks: number;
}

export type AudiobookModalView = 'none' | 'chapters' | 'bookmarks' | 'sleep' | 'speed';

export interface AudiobookPlayerCore {
  itemId: string | undefined;
  item: any;
  isLoading: boolean;
  coverUrl: string | null;
  displayName: string;
  displayAuthor: string;

  playerState: string;
  localProgress: { position: number; duration: number };
  isSeeking: boolean;
  progressValue: number;
  remainingTime: number;

  chapters: Chapter[];
  isLoadingChapters: boolean;
  currentChapter: Chapter | null;
  itemBookmarks: any[];

  audiobookSpeed: number;
  sleepTimeRemaining: number | null;
  accentColor: string;

  downloaded: any;
  isDownloading: boolean;

  modalView: AudiobookModalView;
  setModalView: (view: AudiobookModalView) => void;

  coverScale: SharedValue<number>;
  playButtonScale: SharedValue<number>;
  translateY: SharedValue<number>;
  modalTranslateY: SharedValue<number>;
  seekProgress: SharedValue<number>;

  seekGesture: ReturnType<typeof Gesture.Pan>;
  dismissGesture: ReturnType<typeof Gesture.Pan>;
  modalDismissGesture: ReturnType<typeof Gesture.Pan>;

  handlePlayPause: () => void;
  handleSeek: (position: number) => Promise<void>;
  handleSkip: (seconds: number) => Promise<void>;
  handleChapterSelect: (chapter: Chapter) => Promise<void>;
  handleAddBookmark: () => void;
  handleBookmarkPress: (positionTicks: number) => Promise<void>;
  handleRemoveBookmark: (id: string) => void;
  handleSetSleepTimer: (minutes: number) => void;
  handleSpeedChange: (speed: number) => void;
  handleDownload: () => Promise<void>;
  handleMinimize: () => void;
  handleStop: () => Promise<void>;

  getDisplayPosition: () => number;

  SPEED_OPTIONS: typeof SPEED_OPTIONS;
  SLEEP_OPTIONS: typeof SLEEP_OPTIONS;
}
