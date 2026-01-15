import type { SharedValue } from 'react-native-reanimated';
import type { GestureType } from 'react-native-gesture-handler';
import type { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { VideoPlayer } from 'expo-video';
import type { LiveTvChannel } from '@/types/livetv';

export const CONTROLS_TIMEOUT = 5000;
export const BUFFERING_SHOW_DELAY_MS = 400;
export const BUFFERING_MIN_DISPLAY_MS = 800;

export interface LiveTvPlayerCore {
  currentChannel: any;
  channelLoading: boolean;
  channels: LiveTvChannel[];
  currentChannelId: string;
  isFavorite: boolean;
  currentProgram: any;

  streamUrl: string | null;
  streamError: string | null;
  player: VideoPlayer;

  showControls: boolean;
  showBufferingOverlay: boolean;
  showChannelList: boolean;
  isOrientationLocked: boolean;

  accentColor: string;
  insets: ReturnType<typeof useSafeAreaInsets>;

  controlsOpacity: SharedValue<number>;
  bufferingOverlayOpacity: SharedValue<number>;

  tapGesture: GestureType;

  handleBack: () => void;
  handleChannelChange: (channel: LiveTvChannel) => void;
  handleToggleFavorite: () => void;
  handleNextChannel: () => void;
  handlePrevChannel: () => void;
  handleToggleOrientationLock: () => Promise<void>;
  toggleControls: () => void;
  showControlsWithTimeout: () => void;
  setShowChannelList: (show: boolean) => void;
  handleRetry: () => void;
}
