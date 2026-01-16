import type { RefObject } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import type { Gesture } from 'react-native-gesture-handler';
import type { VideoSleepTimer } from '@/types/player';

export interface LyricLine {
  start: number;
  text: string;
}

export interface MusicPlayerCore {
  itemId: string | undefined;
  item: any;
  isLoading: boolean;
  albumArtUrl: string | null;
  displayName: string;
  albumArtist: string;
  albumName: string;

  playerState: string;
  localProgress: { position: number; duration: number };
  isSeeking: boolean;
  progressValue: number;
  showLoading: boolean;

  shuffleMode: any;
  repeatMode: any;

  lyrics: LyricLine[] | null;
  lyricsLoading: boolean;
  currentLyricIndex: number;
  showLyricsView: boolean;
  lyricsScrollRef: RefObject<any>;

  isFavorite: boolean;

  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;

  playlists: any;
  showPlaylistPicker: boolean;
  setShowPlaylistPicker: (show: boolean) => void;

  showOptions: boolean;
  setShowOptions: (show: boolean) => void;

  musicSleepTimer: VideoSleepTimer | undefined;
  showSleepTimer: boolean;
  setShowSleepTimer: (show: boolean) => void;

  showEqualizer: boolean;
  setShowEqualizer: (show: boolean) => void;

  addedToast: string | null;

  accentColor: string;

  albumScale: SharedValue<number>;
  playButtonScale: SharedValue<number>;
  translateY: SharedValue<number>;
  modalTranslateY: SharedValue<number>;
  playlistPickerTranslateY: SharedValue<number>;
  seekProgress: SharedValue<number>;

  seekGesture: ReturnType<typeof Gesture.Pan>;
  dismissGesture: ReturnType<typeof Gesture.Pan>;
  modalGesture: ReturnType<typeof Gesture.Pan>;
  playlistPickerGesture: ReturnType<typeof Gesture.Pan>;

  handlePlayPause: () => Promise<void>;
  handleSeek: (position: number) => Promise<void>;
  handleSkipPrevious: () => Promise<void>;
  handleSkipNext: () => Promise<void>;
  handleToggleShuffle: () => void;
  handleToggleRepeat: () => void;
  handleToggleFavorite: () => Promise<void>;
  handleToggleLyrics: () => void;
  handleSeekToLyric: (index: number) => void;
  handleGoToAlbum: () => void;
  handleGoToArtist: () => void;
  handleAddToPlaylist: () => void;
  handleSelectPlaylist: (playlistId: string) => void;
  handlePlayNext: () => void;
  handleInstantMix: () => void;
  handleDownload: () => Promise<void>;
  handleSelectSleepTimer: (timer: VideoSleepTimer | undefined) => void;
  handleClose: () => void;
  handleStopAndClose: () => Promise<void>;
  openOptions: () => void;
  closeOptions: () => void;
  closePlaylistPicker: () => void;

  getDisplayPosition: () => number;

  getContainerStyle: () => any;
  getBackgroundStyle: () => any;
  getAlbumStyle: () => any;
  getPlayButtonStyle: () => any;
  getModalSheetStyle: () => any;
  getPlaylistPickerSheetStyle: () => any;
}
