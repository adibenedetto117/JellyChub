import type { RefObject } from 'react';
import type { VideoView } from 'expo-video';
import type { SharedValue } from 'react-native-reanimated';
import type { MediaSource, BaseItem } from '@/types/jellyfin';
import type { VideoSleepTimer } from '@/types/player';

export interface UseVideoPlayerCoreOptions {
  itemId: string;
  from?: string;
}

export interface VideoPlayerProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface VideoPlayerTracks {
  selectedSubtitleIndex: number | undefined;
  selectedAudioIndex: number | undefined;
  jellyfinSubtitleTracks: any[];
  jellyfinAudioTracks: any[];
  externalSubtitleCues: SubtitleCue[] | null;
}

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface IntroCreditsState {
  showSkipIntro: boolean;
  isIntroPreview: boolean;
  introStart: number | null;
  introEnd: number | null;
  showSkipCredits: boolean;
  creditsStart: number | null;
  creditsEnd: number | null;
}

export interface ABLoopState {
  a: number | null;
  b: number | null;
}

export interface VideoPlayerAnimatedValues {
  controlsOpacity: SharedValue<number>;
  playButtonScale: SharedValue<number>;
  skipLeftOpacity: SharedValue<number>;
  skipRightOpacity: SharedValue<number>;
  skipLeftScale: SharedValue<number>;
  skipRightScale: SharedValue<number>;
}

export interface ChromecastState {
  connected: boolean;
  connecting: boolean;
  deviceName: string | null;
  position: number;
  duration: number;
  playing: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (position: number) => Promise<void>;
  stop: () => Promise<void>;
  cast: (mediaInfo: any) => Promise<void>;
}

export interface VideoPlayerModals {
  showAudioSelector: boolean;
  showSubtitleSelector: boolean;
  showChapterList: boolean;
  showEpisodeList: boolean;
  showTrickplay: boolean;
  showSpeedSelector: boolean;
  showSleepTimer: boolean;
  showOptionsMenu: boolean;
  showCastRemote: boolean;
  showOpenSubtitlesSearch: boolean;
  openModal: (modal: ModalName) => void;
  closeModal: (modal: ModalName) => void;
  toggleModal: (modal: ModalName) => void;
}

export type ModalName =
  | 'audioSelector'
  | 'subtitleSelector'
  | 'chapterList'
  | 'episodeList'
  | 'trickplay'
  | 'speedSelector'
  | 'sleepTimer'
  | 'optionsMenu'
  | 'castRemote'
  | 'openSubtitlesSearch';
