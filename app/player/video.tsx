import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StatusBar, Dimensions, ActivityIndicator, Alert, Platform, ScrollView, useWindowDimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  interpolate,
  Extrapolation,
  cancelAnimation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView, VideoAirPlayButton } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as Brightness from 'expo-brightness';
import { VolumeManager } from 'react-native-volume-manager';
import { useAuthStore, usePlayerStore, useSettingsStore, useDownloadStore, useVideoPreferencesStore, selectDownloadHasHydrated } from '@/stores';
import {
  getItem,
  getPlaybackInfo,
  getStreamUrl,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  selectBestMediaSource,
  generatePlaySessionId,
  getEpisodes,
  getSeasons,
  getMediaSegments,
  getSubtitleUrl,
} from '@/api';
import { downloadManager, encryptionService } from '@/services';
import { formatPlayerTime, ticksToMs, msToTicks, getSubtitleStreams, getAudioStreams, openInExternalPlayer, hasExternalPlayerSupport, getDisplayName, getDisplaySeriesName, goBack } from '@/utils';
import { isTV, tvConstants } from '@/utils/platform';
import { useTVRemoteHandler, useBackHandler } from '@/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AudioTrackSelector } from '@/components/player/AudioTrackSelector';
import { SubtitleSelector } from '@/components/player/SubtitleSelector';
import { AudioSubtitleSelector } from '@/components/player/AudioSubtitleSelector';
import { SubtitleDisplay } from '@/components/player/SubtitleDisplay';
import { SubtitleStyleModal } from '@/components/player/SubtitleStyleModal';
import { BrightnessIndicator, VolumeIndicator, SubtitleOffsetControl, SeekIndicator } from '@/components/player/VideoPlayerControls';
import { TVVideoPlayerControls } from '@/components/player/TVVideoPlayerControls';
import { SleepTimerSelector } from '@/components/player/SleepTimerSelector';
import { ChapterList, ChapterMarkers, CurrentChapterDisplay, ChapterNavigation, type ChapterInfo } from '@/components/player/ChapterList';
import { TrickplayPreview, TimeOnlyPreview } from '@/components/player/TrickplayPreview';
import { OpenSubtitlesSearch } from '@/components/player/OpenSubtitlesSearch';
import { EpisodeList } from '@/components/player/EpisodeList';
import type { MediaSource, TrickplayInfo } from '@/types/jellyfin';
import type { VideoSleepTimer, PlayerControlId } from '@/types/player';
import { DEFAULT_PLAYER_CONTROLS_CONFIG, DEFAULT_PLAYER_CONTROLS_ORDER } from '@/types/player';
import { isChromecastSupported, type CastMediaInfo } from '@/utils/casting';
import { useChromecast, useCastButton } from '@/hooks';
import { CastRemoteControl } from '@/components/player/CastRemoteControl';

interface ControlIconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
}

function ControlIconButton({ icon, onPress, isActive, accentColor }: ControlIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 rounded-full items-center justify-center mx-1"
      style={{ backgroundColor: isActive ? accentColor + '60' : 'rgba(0,0,0,0.5)' }}
    >
      <Ionicons name={icon} size={21} color={isActive ? accentColor : '#fff'} />
    </Pressable>
  );
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const subtitleCache = new Map<string, Array<{ start: number; end: number; text: string }>>();

const IMAGE_BASED_SUBTITLE_CODECS = [
  'pgs', 'pgssub', 'hdmv_pgs_subtitle', 'dvdsub', 'dvd_subtitle',
  'vobsub', 'dvbsub', 'dvb_subtitle', 'xsub',
];

function isTextBasedSubtitle(codec?: string): boolean {
  if (!codec) return true;
  return !IMAGE_BASED_SUBTITLE_CODECS.includes(codec.toLowerCase());
}

function findSubtitleCue(cues: Array<{ start: number; end: number; text: string }>, position: number): { start: number; end: number; text: string } | null {
  if (cues.length === 0) return null;

  let left = 0;
  let right = cues.length - 1;
  let bestMatch: { start: number; end: number; text: string } | null = null;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    const cue = cues[mid];

    if (position >= cue.start && position <= cue.end) {
      return cue;
    } else if (position < cue.start) {
      right = mid - 1;
    } else {
      bestMatch = cue;
      left = mid + 1;
    }
  }

  if (bestMatch && position >= bestMatch.start && position <= bestMatch.end + 100) {
    return bestMatch;
  }

  return null;
}

function SkipIcon({ size = 24, seconds = 10, direction = 'forward', color = '#fff' }: { size?: number; seconds?: number; direction?: 'forward' | 'back'; color?: string }) {
  const isBack = direction === 'back';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name="refresh"
        size={size}
        color={color}
        style={{ transform: [{ scaleX: isBack ? -1 : 1 }] }}
      />
      <Text style={{ color: color, fontSize: size * 0.4, fontWeight: '700', position: 'absolute', top: size * 0.28 }}>{seconds}</Text>
    </View>
  );
}

export default function VideoPlayerScreen() {
  const { t } = useTranslation();
  const { itemId, resume, from } = useLocalSearchParams<{ itemId: string; resume?: string; from?: string }>();
  const shouldAutoResume = resume === 'true';
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const subtitleSettings = useSettingsStore((s) => s.player);
  const externalPlayerEnabled = useSettingsStore((s) => s.player.externalPlayerEnabled ?? true);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const openSubtitlesApiKey = useSettingsStore((s) => s.openSubtitlesApiKey);
  // Player controls configuration
  const controlsConfig = useSettingsStore((s) => s.player.controlsConfig);
  const controlsOrder = useSettingsStore((s) => s.player.controlsOrder);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const downloadStoreHydrated = useDownloadStore(selectDownloadHasHydrated);
  const userId = currentUser?.Id ?? '';
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Only look up downloaded item after store has hydrated from persistence
  const allDownloads = useDownloadStore((s) => s.downloads);
  const downloadedItem = downloadStoreHydrated ? getDownloadedItem(itemId) : undefined;
  console.log('[VideoPlayer] Download lookup:', {
    itemId,
    downloadStoreHydrated,
    allDownloadsCount: allDownloads.length,
    completedDownloads: allDownloads.filter(d => d.status === 'completed').map(d => ({ id: d.id, itemId: d.itemId })),
    foundDownloadedItem: downloadedItem ? { id: downloadedItem.id, itemId: downloadedItem.itemId, localPath: downloadedItem.localPath } : null,
  });
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);
  // Track whether we've finished attempting to resolve the local path
  // This is needed to distinguish "not yet resolved" from "resolved but failed"
  const [localPathResolved, setLocalPathResolved] = useState(false);

  // Debug logging for download playback
  useEffect(() => {
    console.log('[VideoPlayer] Download state:', {
      itemId,
      downloadStoreHydrated,
      hasDownloadedItem: !!downloadedItem,
      downloadedItemId: downloadedItem?.id,
      downloadedItemStatus: downloadedItem?.status,
      storedLocalPath: downloadedItem?.localPath,
      resolvedLocalFilePath: localFilePath,
      localPathResolved,
      hasItemData: !!downloadedItem?.item,
      itemName: downloadedItem?.item?.Name,
    });
  }, [itemId, downloadStoreHydrated, downloadedItem, localFilePath, localPathResolved]);

  useEffect(() => {
    console.log('[VideoPlayer] resolveLocalPath effect triggered, downloadedItem?.localPath =', downloadedItem?.localPath);
    // Reset resolution state when the path changes
    setLocalPathResolved(false);

    const resolveLocalPath = async () => {
      if (!downloadedItem?.localPath) {
        console.log('[VideoPlayer] No local path to resolve');
        setLocalFilePath(null);
        setLocalPathResolved(true);
        return;
      }
      try {
        console.log('[VideoPlayer] Checking file existence:', downloadedItem.localPath);
        const fileInfo = await FileSystem.getInfoAsync(downloadedItem.localPath);
        if (!fileInfo.exists) {
          console.log('[VideoPlayer] File does not exist at path:', downloadedItem.localPath);
          setLocalFilePath(null);
          setLocalPathResolved(true);
          return;
        }
        console.log('[VideoPlayer] File exists, size:', (fileInfo as any).size);
        if (downloadedItem.localPath.endsWith('.enc')) {
          const decryptedPath = await encryptionService.getDecryptedUri(downloadedItem.localPath);
          const decryptedInfo = await FileSystem.getInfoAsync(decryptedPath);
          if (decryptedInfo.exists) {
            console.log('[VideoPlayer] Decrypted file ready:', decryptedPath);
            setLocalFilePath(decryptedPath);
          } else {
            console.log('[VideoPlayer] Decrypted file not found');
            setLocalFilePath(null);
          }
          setLocalPathResolved(true);
        } else {
          console.log('[VideoPlayer] Using local file path:', downloadedItem.localPath);
          setLocalFilePath(downloadedItem.localPath);
          setLocalPathResolved(true);
        }
      } catch (error) {
        console.error('[VideoPlayer] Error resolving local path:', error);
        setLocalFilePath(null);
        setLocalPathResolved(true);
      }
    };
    resolveLocalPath();
  }, [downloadedItem?.localPath]);

  // Use granular selectors to prevent unnecessary re-renders during playback
  const playerState = usePlayerStore((s) => s.playerState);
  const progress = usePlayerStore((s) => s.progress);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentItem = usePlayerStore((s) => s.setCurrentItem);
  const clearCurrentItem = usePlayerStore((s) => s.clearCurrentItem);
  // Per-video subtitle offset persistence
  const savedSubtitleOffset = useVideoPreferencesStore((s) => s.getSubtitleOffset(itemId));
  const saveSubtitleOffset = useVideoPreferencesStore((s) => s.setSubtitleOffset);
  const subtitleOffsetFromStore = usePlayerStore((s) => s.video.subtitleOffset);
  const setSubtitleOffsetInStore = usePlayerStore((s) => s.setSubtitleOffset);

  // Use the saved offset, falling back to the current session offset
  const subtitleOffset = savedSubtitleOffset || subtitleOffsetFromStore;

  // Wrapper to save offset both to session store and persistent store
  const setSubtitleOffset = useCallback((offset: number) => {
    setSubtitleOffsetInStore(offset);
    saveSubtitleOffset(itemId, offset);
  }, [itemId, setSubtitleOffsetInStore, saveSubtitleOffset]);
  const videoPlaybackSpeed = usePlayerStore((s) => s.video.playbackSpeed);
  const setVideoPlaybackSpeed = usePlayerStore((s) => s.setVideoPlaybackSpeed);
  const sleepTimer = usePlayerStore((s) => s.video.sleepTimer);
  const setVideoSleepTimer = usePlayerStore((s) => s.setVideoSleepTimer);
  const clearVideoSleepTimer = usePlayerStore((s) => s.clearVideoSleepTimer);

  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [showAudioSelector, setShowAudioSelector] = useState(false);
  const [showSubtitleSelector, setShowSubtitleSelector] = useState(false);
  const [showAudioSubtitleSelector, setShowAudioSubtitleSelector] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);
  const [showSubtitleOffset, setShowSubtitleOffset] = useState(false);
  const [externalSubtitleCues, setExternalSubtitleCues] = useState<Array<{ start: number; end: number; text: string }> | null>(null);
  const [showSpeedSelector, setShowSpeedSelector] = useState(false);
  const [showSleepTimerSelector, setShowSleepTimerSelector] = useState(false);
  const [skipIndicator, setSkipIndicator] = useState<{ direction: 'left' | 'right'; visible: boolean }>({ direction: 'left', visible: false });
  const [playSessionId] = useState(() => generatePlaySessionId());
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [orientationLocked, setOrientationLocked] = useState<'landscape-left' | 'landscape-right'>('landscape-right');
  const [isRotationLocked, setIsRotationLocked] = useState(false);
  const [isPortraitToggle, setIsPortraitToggle] = useState(false);
  const isActuallyPortrait = screenHeight > screenWidth;
  const isPortrait = isPortraitToggle || isActuallyPortrait;
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | undefined>(undefined);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [jellyfinSubtitleTracks, setJellyfinSubtitleTracks] = useState<any[]>([]);
  const [jellyfinAudioTracks, setJellyfinAudioTracks] = useState<any[]>([]);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [isIntroPreview, setIsIntroPreview] = useState(false);
  const [introStart, setIntroStart] = useState<number | null>(null);
  const [introEnd, setIntroEnd] = useState<number | null>(null);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [creditsStart, setCreditsStart] = useState<number | null>(null);
  const [creditsEnd, setCreditsEnd] = useState<number | null>(null);
  const [showNextUpCard, setShowNextUpCard] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<any>(null);
  const [subtitleCues, setSubtitleCues] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [subtitleLoadError, setSubtitleLoadError] = useState<string | null>(null);
  const [showChapterList, setShowChapterList] = useState(false);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [episodeListSeasonId, setEpisodeListSeasonId] = useState<string | null>(null);
  const [showOpenSubtitlesSearch, setShowOpenSubtitlesSearch] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showQualitySelector, setShowQualitySelector] = useState(false);
  const [streamingQuality, setStreamingQuality] = useState<'auto' | 'original' | '1080p' | '720p' | '480p'>('auto');

  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [controlsLocked, setControlsLocked] = useState(false);
  const [showFrameControls, setShowFrameControls] = useState(false);

  const chromecast = useChromecast();
  const CastButton = useCastButton();
  const [showCastRemote, setShowCastRemote] = useState(false);
  const [castMediaInfo, setCastMediaInfo] = useState<CastMediaInfo | null>(null);
  const wasCasting = useRef(false);
  const castResumePosition = useRef<number | null>(null);

  const [externalPlayerAvailable, setExternalPlayerAvailable] = useState(false);

  // Brightness/Volume gesture state
  const [currentBrightness, setCurrentBrightness] = useState(0.5);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const [showBrightnessIndicator, setShowBrightnessIndicator] = useState(false);
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false);
  const [gestureStartValue, setGestureStartValue] = useState(0);
  const [isHorizontalSeeking, setIsHorizontalSeeking] = useState(false);
  const [horizontalSeekPosition, setHorizontalSeekPosition] = useState(0);
  const [horizontalSeekDelta, setHorizontalSeekDelta] = useState(0);
  const brightnessIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeIndicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gestureStartX = useRef(0);
  const gestureStartPosition = useRef(0);

  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoViewRef = useRef<VideoView>(null);
  const hasResumedPosition = useRef(false);
  const resumePositionMs = useRef(0);
  const isFrameStepping = useRef(false);
  const frameStepTimestamp = useRef(0);
  const [seekBarLayoutWidth, setSeekBarLayoutWidth] = useState(500);

  const controlsOpacity = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const seekBarWidth = useSharedValue(0);
  const skipLeftOpacity = useSharedValue(0);
  const skipRightOpacity = useSharedValue(0);
  const skipLeftScale = useSharedValue(0.5);
  const skipRightScale = useSharedValue(0.5);

  const playerKey = useRef(0);
  const isPlayerValid = useRef(true);
  const isPlayerReady = useRef(false);
  const pendingSubtitleLoad = useRef<{ itemId: string; mediaSourceId: string; index: number } | null>(null);
  const pendingSubtitleSelection = useRef<{ itemId: string; mediaSourceId: string; index: number } | null>(null);
  const currentPositionRef = useRef(0);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const playSessionIdRef = useRef(playSessionId);

  const player = useVideoPlayer(streamUrl ?? '', (p) => {
    p.loop = false;
    // Configure buffer settings to reduce rebuffering
    p.bufferOptions = {
      preferredForwardBufferDuration: 30, // Buffer 30 seconds ahead
      minBufferForPlayback: 5, // Require 5 seconds buffered before playing (Android)
      waitsToMinimizeStalling: true, // Auto-pause to buffer if needed (iOS)
    };
    p.play();
  });

  useEffect(() => {
    playerKey.current += 1;
    isPlayerValid.current = true;
    isPlayerReady.current = false;
    return () => {
      isPlayerValid.current = false;
      isPlayerReady.current = false;
    };
  }, [streamUrl]);

  // Load saved subtitle offset when video changes
  useEffect(() => {
    if (savedSubtitleOffset && savedSubtitleOffset !== 0) {
      setSubtitleOffsetInStore(savedSubtitleOffset);
    }
  }, [itemId, savedSubtitleOffset, setSubtitleOffsetInStore]);

  // For downloaded items, use cached data; otherwise fetch from server
  const isOfflinePlayback = !!downloadedItem?.localPath && !!localFilePath;

  const { data: fetchedItem, isLoading: itemLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId && !isOfflinePlayback,
  });

  const { data: playbackInfo, isLoading: playbackLoading } = useQuery({
    queryKey: ['playback', userId, itemId],
    queryFn: () => getPlaybackInfo(itemId, userId),
    enabled: !!userId && !!itemId && !isOfflinePlayback,
  });

  // Use cached item data for offline playback, or fetched data for online
  const item = isOfflinePlayback ? downloadedItem?.item : fetchedItem;

  // Get next episode for auto-play (only for TV episodes)
  const isEpisode = item?.Type === 'Episode';
  const seriesId = item?.SeriesId;
  const seasonId = item?.SeasonId;
  const currentEpisodeNumber = item?.IndexNumber;
  const currentSeasonNumber = item?.ParentIndexNumber;

  const { data: seasonEpisodes } = useQuery({
    queryKey: ['seasonEpisodes', seriesId, seasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, seasonId),
    enabled: !!userId && !!seriesId && !!seasonId && isEpisode,
  });

  // Get all seasons for finding next season
  const { data: allSeasons } = useQuery({
    queryKey: ['seriesSeasons', seriesId, userId],
    queryFn: () => getSeasons(seriesId!, userId),
    enabled: !!userId && !!seriesId && isEpisode,
  });

  // Find next season ID if we're on the last episode of current season
  const [nextSeasonId, setNextSeasonId] = useState<string | null>(null);

  // Get next season's episodes (only when we need it)
  const { data: nextSeasonEpisodes } = useQuery({
    queryKey: ['nextSeasonEpisodes', seriesId, nextSeasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, nextSeasonId!),
    enabled: !!userId && !!seriesId && !!nextSeasonId,
  });

  // Get episodes for the selected season in episode list (when browsing different seasons)
  const { data: episodeListEpisodes, isLoading: episodeListLoading } = useQuery({
    queryKey: ['episodeListEpisodes', seriesId, episodeListSeasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, episodeListSeasonId!),
    enabled: !!userId && !!seriesId && !!episodeListSeasonId && episodeListSeasonId !== seasonId,
  });

  // Get media segments for intro/credits detection (from server)
  const { data: mediaSegments } = useQuery({
    queryKey: ['mediaSegments', itemId],
    queryFn: () => getMediaSegments(itemId),
    enabled: !!itemId,
  });

  // Set intro/credits from media segments when available
  useEffect(() => {
    if (mediaSegments?.Items?.length) {
      const intro = mediaSegments.Items.find((s) => s.Type === 'Intro');
      const outro = mediaSegments.Items.find((s) => s.Type === 'Outro');

      if (intro && intro.StartTicks !== undefined && intro.EndTicks !== undefined) {
        setIntroStart(ticksToMs(intro.StartTicks));
        setIntroEnd(ticksToMs(intro.EndTicks));
      }
      if (outro && outro.StartTicks !== undefined) {
        setCreditsStart(ticksToMs(outro.StartTicks));
        // Use EndTicks if available for credits end
        if (outro.EndTicks !== undefined) {
          setCreditsEnd(ticksToMs(outro.EndTicks));
        }
      }
    }
  }, [mediaSegments]);

  const isNavigatingRef = useRef(false);

  // Auto-clear subtitle error after 5 seconds
  useEffect(() => {
    if (subtitleLoadError) {
      const timeout = setTimeout(() => {
        setSubtitleLoadError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [subtitleLoadError]);

  // Initialize brightness and volume values on mount
  useEffect(() => {
    const initBrightnessAndVolume = async () => {
      try {
        const brightness = await Brightness.getBrightnessAsync();
        setCurrentBrightness(brightness);
      } catch (e) {
        // Fallback to 0.5 if we can't get brightness
      }
      try {
        const volume = await VolumeManager.getVolume();
        setCurrentVolume(typeof volume === 'number' ? volume : volume.volume);
      } catch (e) {
        // Fallback to 0.5 if we can't get volume
      }
    };
    initBrightnessAndVolume();
  }, []);

  useEffect(() => {
    if (!chromecast.isAvailable) return;

    if (chromecast.isConnected && !wasCasting.current && castMediaInfo) {
      wasCasting.current = true;
      player?.pause();
      setShowCastRemote(true);
    }

    if (!chromecast.isConnected && wasCasting.current) {
      wasCasting.current = false;
      setShowCastRemote(false);

      if (castResumePosition.current !== null && player) {
        const resumePos = castResumePosition.current;
        castResumePosition.current = null;
        try {
          player.currentTime = resumePos / 1000;
          player.play();
        } catch {
        }
      }
    }
  }, [chromecast.isConnected, chromecast.isAvailable, castMediaInfo, player]);

  // Check external player availability
  useEffect(() => {
    hasExternalPlayerSupport().then(setExternalPlayerAvailable);
  }, []);

  useEffect(() => {
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  const cycleOrientationLock = useCallback(() => {
    setOrientationLocked((current) => {
      if (current === 'landscape-left') return 'landscape-right';
      return 'landscape-left';
    });
  }, []);

  const toggleOrientation = useCallback(() => {
    if (isRotationLocked) return;
    setIsPortraitToggle((current) => !current);
  }, [isRotationLocked]);

  const toggleRotationLock = useCallback(() => {
    setIsRotationLocked((current) => !current);
  }, []);

  // isLocalPathReady: true if we've determined there's no downloaded item (after hydration),
  // or if we have a downloaded item and have finished resolving its local path (success or failure)
  const isLocalPathReady = downloadStoreHydrated && (!downloadedItem || localPathResolved);
  const hasStartedPlayback = useRef(false);

  useEffect(() => {
    // Prevent double-initialization
    if (hasStartedPlayback.current) return;

    // Wait for download store to hydrate before making decisions
    if (!downloadStoreHydrated) {
      console.log('[VideoPlayer] Waiting for download store to hydrate...');
      return;
    }

    // For offline playback, we only need item and localFilePath
    // For online playback, we also need playbackInfo
    const canStartOnline = playbackInfo && item && isLocalPathReady && !isOfflinePlayback;
    const canStartOffline = isOfflinePlayback && item && localFilePath;

    console.log('[VideoPlayer] Playback check:', {
      canStartOnline,
      canStartOffline,
      isOfflinePlayback,
      hasItem: !!item,
      itemSource: isOfflinePlayback ? 'downloadedItem.item' : 'fetchedItem',
      itemId: item?.Id,
      itemName: item?.Name,
      hasPlaybackInfo: !!playbackInfo,
      isLocalPathReady,
      localPathResolved,
      localFilePath,
      downloadedItemLocalPath: downloadedItem?.localPath,
    });

    if (canStartOnline || canStartOffline) {
      console.log('[VideoPlayer] Starting playback:', isOfflinePlayback ? 'OFFLINE' : 'ONLINE');
      hasStartedPlayback.current = true;
      // For offline playback, create a minimal media source from the cached item
      const source: MediaSource | null = isOfflinePlayback
        ? {
            Id: item.Id,
            Path: localFilePath,
            Protocol: 'File',
            Type: 'Default',
            Container: item.Container || 'mp4',
            Size: item.MediaSources?.[0]?.Size,
            MediaStreams: item.MediaSources?.[0]?.MediaStreams || [],
            SupportsDirectPlay: true,
            SupportsDirectStream: true,
            SupportsTranscoding: false,
          }
        : selectBestMediaSource(playbackInfo!.MediaSources);

      if (source) {
        setMediaSource(source);
        mediaSourceRef.current = source;

        const subtitleStreams = getSubtitleStreams(source);
        const subtitles = subtitleStreams.map((s) => ({
          index: s.Index,
          language: s.Language,
          title: s.DisplayTitle,
          isDefault: s.IsDefault,
          isForced: s.IsForced,
          codec: s.Codec,
        }));
        setJellyfinSubtitleTracks(subtitles);

        const audioStreams = getAudioStreams(source);
        const audioTracks = audioStreams.map((s) => ({
          index: s.Index,
          language: s.Language,
          title: s.DisplayTitle,
          codec: s.Codec,
          channels: s.Channels,
          isDefault: s.IsDefault,
        }));
        setJellyfinAudioTracks(audioTracks);

        const preferredAudioLang = useSettingsStore.getState().player.defaultAudioLanguage || 'eng';
        const preferredAudio = audioTracks.find((a) => a.language?.toLowerCase() === preferredAudioLang.toLowerCase())
          || audioTracks.find((a) => a.isDefault)
          || audioTracks[0];
        if (preferredAudio) {
          setSelectedAudioIndex(preferredAudio.index);
        }

        const playerSettings = useSettingsStore.getState().player;
        const preferredSubLang = playerSettings.defaultSubtitleLanguage;
        const forceSubtitles = playerSettings.forceSubtitles;

        const textSubtitles = subtitles.filter((s) => isTextBasedSubtitle(s.codec));

        if (textSubtitles.length > 0 && (preferredSubLang || forceSubtitles)) {
          const preferredSub = textSubtitles.find((s) => s.language?.toLowerCase() === preferredSubLang?.toLowerCase())
            || textSubtitles.find((s) => s.isDefault)
            || (forceSubtitles ? textSubtitles[0] : undefined);
          if (preferredSub) {
            pendingSubtitleSelection.current = { itemId: item.Id, mediaSourceId: source.Id, index: preferredSub.index };
            setSelectedSubtitleIndex(preferredSub.index);
          }
        }

        const savedPosition = ticksToMs(item.UserData?.PlaybackPositionTicks ?? 0);
        setProgress(0, ticksToMs(item.RunTimeTicks ?? 0), 0);

        if (!introEnd) {
          const chapters = (item as any).Chapters || [];
          const introChapter = chapters.find((c: any) =>
            c.MarkerType === 'IntroStart' ||
            c.Name?.toLowerCase().includes('intro') ||
            c.Name?.toLowerCase().includes('opening')
          );
          if (introChapter) {
            const introIndex = chapters.indexOf(introChapter);
            const introEndChapter = chapters.find((c: any) => c.MarkerType === 'IntroEnd');
            const nextChapter = chapters[introIndex + 1];
            const introStartTime = ticksToMs(introChapter.StartPositionTicks);
            const introEndTime = introEndChapter
              ? ticksToMs(introEndChapter.StartPositionTicks)
              : nextChapter
                ? ticksToMs(nextChapter.StartPositionTicks)
                : introStartTime + 90000;
            setIntroStart(introStartTime);
            setIntroEnd(introEndTime);
          }
        }

        if (savedPosition > 10000) {
          startPlayback(source, savedPosition);
        } else {
          startPlayback(source, 0);
        }
      }
    }
  }, [playbackInfo, item, isLocalPathReady, isOfflinePlayback, localFilePath, downloadStoreHydrated, localPathResolved]);

  const startPlayback = useCallback((
    source: MediaSource,
    startPositionMs: number
  ) => {
    if (!item) {
      console.log('[VideoPlayer] startPlayback: item is null, aborting');
      return;
    }

    // Use local file if downloaded, otherwise stream from server
    const url = localFilePath
      ? localFilePath
      : getStreamUrl(item.Id, source.Id, {
          startTimeTicks: startPositionMs > 0 ? msToTicks(startPositionMs) : undefined,
          useHls: false,
        });
    console.log('[VideoPlayer] startPlayback: setting streamUrl to:', url);
    setStreamUrl(url);

    resumePositionMs.current = startPositionMs;
    hasResumedPosition.current = false;
    setProgress(startPositionMs, ticksToMs(item.RunTimeTicks ?? 0), 0);

    setCurrentItem({ item, mediaSource: source, streamUrl: url, playSessionId }, 'video');

    // Report playback start to server (skip for offline playback to avoid network errors)
    if (!isOfflinePlayback) {
      reportPlaybackStart({
        ItemId: item.Id,
        MediaSourceId: source.Id,
        PlaySessionId: playSessionId,
        PlayMethod: localFilePath ? 'DirectPlay' : 'DirectStream',
        StartTimeTicks: startPositionMs > 0 ? msToTicks(startPositionMs) : undefined,
      }).catch(() => {
        // Silently ignore network errors when reporting playback
      });
    }

    setPlayerState('playing');
  }, [item, playSessionId, localFilePath, isOfflinePlayback]);

  const loadSubtitleTrack = useCallback(async (itemId: string, mediaSourceId: string, index: number, retryCount = 0): Promise<boolean> => {
    // Track this load request to detect race conditions
    const loadRequest = { itemId, mediaSourceId, index };
    pendingSubtitleLoad.current = loadRequest;

    setSubtitlesLoading(true);
    setSubtitleLoadError(null);

    // Check cache first
    const cacheKey = `${itemId}-${mediaSourceId}-${index}`;
    const cachedCues = subtitleCache.get(cacheKey);
    if (cachedCues && cachedCues.length > 0) {
      // Verify this is still the current request (no race condition)
      if (pendingSubtitleLoad.current === loadRequest) {
        setSubtitleCues(cachedCues);
        setSubtitlesLoading(false);
        console.log(`[Subtitles] Loaded ${cachedCues.length} cues from cache`);
      }
      return true;
    }

    const tryFetch = async (format: string): Promise<string | null> => {
      try {
        const url = getSubtitleUrl(itemId, mediaSourceId, index, format);
        console.log(`[Subtitles] Trying format ${format}: ${url}`);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000); // Increased timeout
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) {
          console.warn(`[Subtitles] HTTP ${res.status} for format ${format}`);
          return null;
        }
        const text = await res.text();
        console.log(`[Subtitles] Got ${text.length} bytes for format ${format}`);
        return text;
      } catch (e: any) {
        console.warn(`[Subtitles] Fetch error for format ${format}:`, e?.message || e);
        return null;
      }
    };

    try {
      // Try multiple formats in order of preference
      let text = await tryFetch('vtt');
      if (!text || text.length < 10) {
        text = await tryFetch('srt');
      }
      if (!text || text.length < 10) {
        text = await tryFetch('ass');
      }
      if (!text || text.length < 10) {
        text = await tryFetch('ssa');
      }

      // Check if this request is still current (handle race condition)
      if (pendingSubtitleLoad.current !== loadRequest) {
        console.log('[Subtitles] Load cancelled - newer request pending');
        return false;
      }

      if (!text || text.length < 10) {
        // Retry up to 2 times with exponential backoff
        if (retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s
          console.log(`[Subtitles] Retrying in ${delay}ms (attempt ${retryCount + 2}/3)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSubtitleTrack(itemId, mediaSourceId, index, retryCount + 1);
        }
        console.error('[Subtitles] All format attempts failed after retries');
        if (pendingSubtitleLoad.current === loadRequest) {
          setSubtitleCues([]);
          setSubtitlesLoading(false);
          setSubtitleLoadError('Failed to load subtitles');
        }
        return false;
      }

      const cues: Array<{ start: number; end: number; text: string }> = [];

      // Parse time string to milliseconds
      const parseTime = (t: string): number => {
        const cleaned = t.replace(',', '.').trim();
        const parts = cleaned.split(':');
        if (parts.length === 3) {
          return parseFloat(parts[0]) * 3600000 + parseFloat(parts[1]) * 60000 + parseFloat(parts[2]) * 1000;
        } else if (parts.length === 2) {
          return parseFloat(parts[0]) * 60000 + parseFloat(parts[1]) * 1000;
        }
        return 0;
      };

      // Check if ASS/SSA format (has [Script Info] or Dialogue:)
      const isAss = text.includes('[Script Info]') || text.includes('Dialogue:');

      if (isAss) {
        // Parse ASS/SSA format
        const lines = text.split('\n');
        for (const line of lines) {
          if (line.startsWith('Dialogue:')) {
            const parts = line.substring(9).split(',');
            if (parts.length >= 10) {
              const startTime = parseTime(parts[1]);
              const endTime = parseTime(parts[2]);
              // Text is everything after the 9th comma, remove ASS style tags
              const subtitleText = parts.slice(9).join(',')
                .replace(/\{[^}]*\}/g, '')
                .replace(/\\N/g, '\n')
                .replace(/\\n/g, '\n')
                .trim();
              if (subtitleText) {
                cues.push({ start: startTime, end: endTime, text: subtitleText });
              }
            }
          }
        }
      } else {
        // Parse VTT/SRT format
        const lines = text.split('\n');
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (line.includes('-->')) {
            const [startStr, endStr] = line.split('-->').map(s => s.trim());
            const start = parseTime(startStr);
            const end = parseTime(endStr.split(' ')[0]);
            const textLines: string[] = [];
            i++;
            while (i < lines.length && lines[i].trim() !== '') {
              textLines.push(lines[i].trim());
              i++;
            }
            if (textLines.length > 0) {
              cues.push({ start, end, text: textLines.join('\n').replace(/<[^>]+>/g, '') });
            }
          }
          i++;
        }
      }

      // Final race condition check before setting state
      if (pendingSubtitleLoad.current !== loadRequest) {
        console.log('[Subtitles] Load cancelled - newer request pending');
        return false;
      }

      // Sort cues by start time to ensure correct order
      cues.sort((a, b) => a.start - b.start);

      // Cache the parsed cues
      subtitleCache.set(cacheKey, cues);
      setSubtitleCues(cues);
      setSubtitlesLoading(false);
      console.log(`[Subtitles] Successfully loaded ${cues.length} cues`);
      return cues.length > 0;
    } catch (error: any) {
      console.error('[Subtitles] Error loading subtitle track:', error?.message || error);
      if (pendingSubtitleLoad.current === loadRequest) {
        setSubtitleCues([]);
        setSubtitlesLoading(false);
        setSubtitleLoadError('Error loading subtitles');
      }
      return false;
    }
  }, []);

  const handleSelectSubtitle = useCallback(async (index: number | undefined) => {
    setSelectedSubtitleIndex(index);
    setCurrentSubtitle('');
    setExternalSubtitleCues(null);

    if (index === undefined || !mediaSource || !item) {
      pendingSubtitleLoad.current = null;
      pendingSubtitleSelection.current = null;
      setSubtitleCues([]);
      setSubtitlesLoading(false);
      setSubtitleLoadError(null);
      return;
    }

    const selectedTrack = jellyfinSubtitleTracks.find((t) => t.index === index);
    if (selectedTrack && !isTextBasedSubtitle(selectedTrack.codec)) {
      setSubtitleLoadError('Image-based subtitles require transcoding');
      setSubtitleCues([]);
      return;
    }

    const success = await loadSubtitleTrack(item.Id, mediaSource.Id, index);
    if (!success) {
      console.warn('[Subtitles] Failed to load selected subtitle track');
    }
  }, [mediaSource, item, loadSubtitleTrack, jellyfinSubtitleTracks]);

  const handleExternalSubtitleSelect = useCallback((cues: Array<{ start: number; end: number; text: string }>) => {
    setExternalSubtitleCues(cues);
    setSelectedSubtitleIndex(undefined);
    setSubtitleCues([]);
    setCurrentSubtitle('');
  }, []);

  const handleSelectAudio = useCallback((index: number) => {
    setSelectedAudioIndex(index);
    if (player) {
      try {
        const availableTracks = player.availableAudioTracks || [];
        const jellyfinTrack = jellyfinAudioTracks.find((t) => t.index === index);

        let track = null;

        // Try matching by language code
        if (jellyfinTrack?.language) {
          const lang = jellyfinTrack.language.toLowerCase();
          const langMap: Record<string, string[]> = {
            'eng': ['en', 'eng', 'english'],
            'rus': ['ru', 'rus', 'russian'],
            'jpn': ['ja', 'jpn', 'japanese', 'jp'],
            'spa': ['es', 'spa', 'spanish'],
            'fre': ['fr', 'fra', 'fre', 'french'],
            'ger': ['de', 'deu', 'ger', 'german'],
            'ita': ['it', 'ita', 'italian'],
            'por': ['pt', 'por', 'portuguese'],
            'zho': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
            'chi': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
            'kor': ['ko', 'kor', 'korean'],
            'ara': ['ar', 'ara', 'arabic'],
            'hin': ['hi', 'hin', 'hindi'],
            'tha': ['th', 'tha', 'thai'],
            'vie': ['vi', 'vie', 'vietnamese'],
            'pol': ['pl', 'pol', 'polish'],
            'dut': ['nl', 'dut', 'nld', 'dutch'],
            'nld': ['nl', 'dut', 'nld', 'dutch'],
            'swe': ['sv', 'swe', 'swedish'],
            'dan': ['da', 'dan', 'danish'],
            'nor': ['no', 'nor', 'norwegian'],
            'fin': ['fi', 'fin', 'finnish'],
            'tur': ['tr', 'tur', 'turkish'],
            'heb': ['he', 'heb', 'hebrew'],
            'ind': ['id', 'ind', 'indonesian'],
            'ukr': ['uk', 'ukr', 'ukrainian'],
            'ces': ['cs', 'ces', 'cze', 'czech'],
            'cze': ['cs', 'ces', 'cze', 'czech'],
            'hun': ['hu', 'hun', 'hungarian'],
            'ron': ['ro', 'ron', 'rum', 'romanian'],
            'ell': ['el', 'ell', 'gre', 'greek'],
            'gre': ['el', 'ell', 'gre', 'greek'],
          };
          const variants = langMap[lang] || [lang];
          track = availableTracks.find((t: any) => {
            const tLang = (t.language || '').toLowerCase();
            return variants.some(v => tLang.includes(v) || v.includes(tLang));
          });
        }

        // Fallback: try matching by track index position
        if (!track) {
          const jellyfinIdx = jellyfinAudioTracks.findIndex((t) => t.index === index);
          const reversedIdx = availableTracks.length - 1 - jellyfinIdx;
          if (reversedIdx >= 0 && reversedIdx < availableTracks.length) {
            track = availableTracks[reversedIdx];
          }
        }

        if (track) {
          player.audioTrack = track;
        }
      } catch (e) {}
    }
  }, [player, jellyfinAudioTracks]);

  useEffect(() => {
    if (!player) return;

    const currentKey = playerKey.current;

    const statusSub = player.addListener('statusChange', (payload) => {
      if (currentKey !== playerKey.current || !isPlayerValid.current) return;
      const status = payload.status;
      if (status === 'readyToPlay') {
        setPlayerState('playing');
        setIsBuffering(false);
        isPlayerReady.current = true;

        if (!hasResumedPosition.current && resumePositionMs.current > 0) {
          hasResumedPosition.current = true;
          try {
            player.currentTime = resumePositionMs.current / 1000;
          } catch (e) {}
        }

        if (pendingSubtitleSelection.current) {
          const { itemId: subItemId, mediaSourceId, index } = pendingSubtitleSelection.current;
          pendingSubtitleSelection.current = null;
          loadSubtitleTrack(subItemId, mediaSourceId, index);
        }

        try {
          const savedSpeed = usePlayerStore.getState().video.playbackSpeed;
          if (savedSpeed !== 1) {
            player.playbackRate = savedSpeed;
          }
        } catch (e) {}
        try {
          const availableTracks = player.availableAudioTracks || [];
          if (availableTracks.length > 0 && selectedAudioIndex !== undefined) {
            const jellyfinTrack = jellyfinAudioTracks.find((t) => t.index === selectedAudioIndex);
            let track = null;
            if (jellyfinTrack?.language) {
              const lang = jellyfinTrack.language.toLowerCase();
              const langMap: Record<string, string[]> = {
                'eng': ['en', 'eng', 'english'],
                'rus': ['ru', 'rus', 'russian'],
                'jpn': ['ja', 'jpn', 'japanese', 'jp'],
                'spa': ['es', 'spa', 'spanish'],
                'fre': ['fr', 'fra', 'fre', 'french'],
                'ger': ['de', 'deu', 'ger', 'german'],
                'ita': ['it', 'ita', 'italian'],
                'por': ['pt', 'por', 'portuguese'],
                'zho': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
                'chi': ['zh', 'zho', 'chi', 'chinese', 'cmn'],
                'kor': ['ko', 'kor', 'korean'],
                'ara': ['ar', 'ara', 'arabic'],
                'hin': ['hi', 'hin', 'hindi'],
                'tha': ['th', 'tha', 'thai'],
                'vie': ['vi', 'vie', 'vietnamese'],
                'pol': ['pl', 'pol', 'polish'],
                'dut': ['nl', 'dut', 'nld', 'dutch'],
                'nld': ['nl', 'dut', 'nld', 'dutch'],
                'swe': ['sv', 'swe', 'swedish'],
                'dan': ['da', 'dan', 'danish'],
                'nor': ['no', 'nor', 'norwegian'],
                'fin': ['fi', 'fin', 'finnish'],
                'tur': ['tr', 'tur', 'turkish'],
                'heb': ['he', 'heb', 'hebrew'],
                'ind': ['id', 'ind', 'indonesian'],
                'ukr': ['uk', 'ukr', 'ukrainian'],
                'ces': ['cs', 'ces', 'cze', 'czech'],
                'cze': ['cs', 'ces', 'cze', 'czech'],
                'hun': ['hu', 'hun', 'hungarian'],
                'ron': ['ro', 'ron', 'rum', 'romanian'],
                'ell': ['el', 'ell', 'gre', 'greek'],
                'gre': ['el', 'ell', 'gre', 'greek'],
              };
              const variants = langMap[lang] || [lang];
              track = availableTracks.find((t: any) => {
                const tLang = (t.language || '').toLowerCase();
                return variants.some(v => tLang.includes(v) || v.includes(tLang));
              });
            }
            if (!track) {
              const jellyfinIdx = jellyfinAudioTracks.findIndex((t) => t.index === selectedAudioIndex);
              if (jellyfinIdx >= 0 && jellyfinIdx < availableTracks.length) {
                track = availableTracks[jellyfinIdx];
              }
            }
            if (track) {
              player.audioTrack = track;
            }
          }
        } catch (e) {}
      } else if (status === 'loading') {
        setPlayerState('loading');
      } else if (status === 'error') {
        setPlayerState('idle');
        setIsBuffering(false);
      }
    });

    const playingSub = player.addListener('playingChange', (payload) => {
      if (currentKey !== playerKey.current || !isPlayerValid.current) return;
      // Ignore state changes during frame stepping to prevent control confusion
      // Use both flag and timestamp to handle race conditions reliably
      const timeSinceFrameStep = Date.now() - frameStepTimestamp.current;
      if (isFrameStepping.current || timeSinceFrameStep < 300) return;
      if (payload.isPlaying) {
        setIsBuffering(false);
        setPlayerState('playing');
        setShowFrameControls(false);
      } else {
        if (!isBuffering) {
          setPlayerState('paused');
          setShowFrameControls(true);
        }
      }
    });

    return () => {
      try {
        statusSub.remove();
        playingSub.remove();
      } catch (e) {}
    };
  }, [player, isBuffering, selectedAudioIndex, jellyfinAudioTracks, loadSubtitleTrack]);

  const progressReportInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastReportedPosition = useRef(0);

  useEffect(() => {
    if (!mediaSource || !player) return;

    const currentKey = playerKey.current;

    const updateProgress = () => {
      if (currentKey !== playerKey.current || !isPlayerValid.current) return;
      try {
        const currentPosition = player.currentTime * 1000;
        const duration = player.duration * 1000;
        currentPositionRef.current = currentPosition;

        if (duration > 0) {
          setProgress(currentPosition, duration, 0);

          // Check intro (show button 3 seconds before intro starts as preview)
          if (introEnd) {
            const introStartTime = introStart ?? 5000;
            const previewStartTime = Math.max(0, introStartTime - 3000);
            const isPreview = currentPosition >= previewStartTime && currentPosition < introStartTime;
            const inIntro = currentPosition >= introStartTime && currentPosition < introEnd;
            setShowSkipIntro(isPreview || inIntro);
            setIsIntroPreview(isPreview);
          }

          // Check credits (use EndTicks if available, otherwise duration - 5000)
          if (creditsStart) {
            const creditsEndTime = creditsEnd ?? duration - 5000;
            const inCredits = currentPosition >= creditsStart && currentPosition < creditsEndTime;
            setShowSkipCredits(inCredits);
          }

          // Check end / next episode
          const timeRemaining = duration - currentPosition;
          if (timeRemaining < 30000 && timeRemaining > 0 && nextEpisode && !showNextUpCard) {
            setShowNextUpCard(true);
          }
          // Auto-play next episode only if setting is enabled
          const autoPlayEnabled = useSettingsStore.getState().player.autoPlay;
          if (timeRemaining < 2000 && timeRemaining > 0 && nextEpisode && autoPlayEnabled) {
            handlePlayNextEpisode();
          }

          if (abLoop.a !== null && abLoop.b !== null && currentPosition >= abLoop.b) {
            player.currentTime = abLoop.a / 1000;
          }
        }

        const activeCueSources = externalSubtitleCues || (selectedSubtitleIndex !== undefined ? subtitleCues : null);
        if (activeCueSources && activeCueSources.length > 0) {
          const adjustedPosition = currentPosition - subtitleOffset;
          const activeCue = findSubtitleCue(activeCueSources, adjustedPosition);
          setCurrentSubtitle(activeCue?.text || '');
        } else {
          setCurrentSubtitle('');
        }
      } catch (e) {}
    };

    progressInterval.current = setInterval(updateProgress, 250);

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [mediaSource, player, subtitleCues, externalSubtitleCues, introStart, introEnd, creditsStart, creditsEnd, nextEpisode, showNextUpCard, selectedSubtitleIndex, subtitleOffset, abLoop]);

  useEffect(() => {
    // Skip progress reporting for offline playback
    if (!mediaSource || !player || isOfflinePlayback) return;

    const currentKey = playerKey.current;

    const reportProgress = () => {
      if (currentKey !== playerKey.current || !isPlayerValid.current) return;
      try {
        const currentPosition = player.currentTime * 1000;
        if (currentPosition === lastReportedPosition.current && playerState !== 'playing') {
          return;
        }
        lastReportedPosition.current = currentPosition;

        reportPlaybackProgress({
          ItemId: itemId,
          MediaSourceId: mediaSource.Id,
          PositionTicks: msToTicks(currentPosition),
          IsPaused: playerState !== 'playing',
          IsMuted: false,
          PlaySessionId: playSessionId,
        });
      } catch (e) {}
    };

    reportProgress();

    progressReportInterval.current = setInterval(reportProgress, 30000); // Every 30 seconds

    return () => {
      if (progressReportInterval.current) clearInterval(progressReportInterval.current);
    };
  }, [playerState, mediaSource, player, itemId, playSessionId, isOfflinePlayback]);

  useEffect(() => {
    if (!sleepTimer || !player) return;

    const checkSleepTimer = () => {
      const now = Date.now();
      if (now >= sleepTimer.endTime) {
        player.pause();
        clearVideoSleepTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    const interval = setInterval(checkSleepTimer, 1000);
    return () => clearInterval(interval);
  }, [sleepTimer, player, clearVideoSleepTimer]);

  useEffect(() => {
    return () => {
      if (mediaSourceRef.current) {
        reportPlaybackStopped(
          itemId,
          mediaSourceRef.current.Id,
          playSessionIdRef.current,
          msToTicks(currentPositionRef.current)
        ).catch(() => {});
      }
    };
  }, [itemId]);

  // Update next episode when data is available
  useEffect(() => {
    if (seasonEpisodes?.Items?.length && currentEpisodeNumber !== undefined) {
      const sortedEpisodes = [...seasonEpisodes.Items].sort(
        (a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0)
      );
      const nextEp = sortedEpisodes.find(
        (ep) => (ep.IndexNumber || 0) > currentEpisodeNumber
      );

      if (nextEp) {
        setNextEpisode(nextEp);
        setNextSeasonId(null);
      } else {
        // Last episode of season - check for next season
        if (allSeasons?.Items?.length && currentSeasonNumber !== undefined) {
          const sortedSeasons = [...allSeasons.Items].sort(
            (a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0)
          );
          const nextSeason = sortedSeasons.find(
            (s) => (s.IndexNumber || 0) > currentSeasonNumber
          );
          if (nextSeason) {
            setNextSeasonId(nextSeason.Id);
          } else {
            setNextEpisode(null);
            setNextSeasonId(null);
          }
        } else {
          setNextEpisode(null);
        }
      }
    } else {
      setNextEpisode(null);
    }
  }, [seasonEpisodes, currentEpisodeNumber, allSeasons, currentSeasonNumber]);

  // Set next episode from next season when available
  useEffect(() => {
    if (nextSeasonEpisodes?.Items?.length) {
      const sortedEpisodes = [...nextSeasonEpisodes.Items].sort(
        (a, b) => (a.IndexNumber || 0) - (b.IndexNumber || 0)
      );
      const firstEp = sortedEpisodes[0];
      if (firstEp) {
        setNextEpisode(firstEp);
      }
    }
  }, [nextSeasonEpisodes]);

  const handleSkipIntro = useCallback(() => {
    if (!player || !introEnd) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      player.currentTime = introEnd / 1000;
      setShowSkipIntro(false);
      setIsIntroPreview(false);
    } catch (e) {}
  }, [player, introEnd]);

  const handleSkipCredits = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSkipCredits(false);
  }, []);

  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisode || !mediaSource) return;

    // Haptic feedback when skipping to next episode
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark that we're navigating to prevent orientation unlock
    isNavigatingRef.current = true;

    // Report current playback stopped
    reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {});

    // Navigate to next episode, preserving the source route
    clearCurrentItem();
    router.replace(`/player/video?itemId=${nextEpisode.Id}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [nextEpisode, mediaSource, itemId, playSessionId, progress.position, clearCurrentItem, from]);

  const handleSelectEpisode = useCallback((episodeId: string) => {
    if (!mediaSource || episodeId === itemId) return;

    // Haptic feedback when selecting episode
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Mark that we're navigating to prevent orientation unlock
    isNavigatingRef.current = true;

    // Report current playback stopped
    reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {});

    // Navigate to selected episode, preserving the source route
    clearCurrentItem();
    router.replace(`/player/video?itemId=${episodeId}${from ? `&from=${encodeURIComponent(from)}` : ''}`);
  }, [mediaSource, itemId, playSessionId, progress.position, clearCurrentItem, from]);

  const hideControlsDelayed = useCallback(() => {
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    controlsTimeout.current = setTimeout(() => {
      controlsOpacity.value = withTiming(0, { duration: 400 });
      runOnJS(setShowControls)(false);
    }, 4000);
  }, []);

  const showControlsNow = useCallback(() => {
    controlsOpacity.value = withTiming(1, { duration: 250 });
    setShowControls(true);
    hideControlsDelayed();
  }, [hideControlsDelayed]);

  const toggleControls = useCallback(() => {
    if (controlsLocked) return;
    if (showControls) {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsOpacity.value = withTiming(0, { duration: 250 });
      setShowControls(false);
    } else {
      showControlsNow();
    }
  }, [showControls, showControlsNow, controlsLocked]);

  const handleClose = useCallback(() => {
    // Immediately pause playback
    try {
      player?.pause();
    } catch (e) {
      // Ignore errors when pausing
    }

    // Report playback stopped to server (fire and forget)
    if (mediaSource) {
      reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {
        // Ignore errors - we're exiting anyway
      });
    }

    // Clear state and exit - navigate back to source screen or home
    clearCurrentItem();
    goBack(from, '/(tabs)/home');
  }, [player, mediaSource, itemId, playSessionId, progress.position, clearCurrentItem, from]);

  const handleOpenExternalPlayer = useCallback(async () => {
    if (!streamUrl || !item) return;

    // Pause internal playback
    try {
      player?.pause();
    } catch (e) {
      // Ignore errors
    }

    // Get current position in milliseconds
    let currentPosition = 0;
    try {
      currentPosition = Math.floor((player?.currentTime ?? 0) * 1000);
    } catch (e) {
      // Use progress state as fallback
      currentPosition = Math.floor(progress.position);
    }

    // Determine mime type based on container
    const container = mediaSource?.Container?.toLowerCase();
    let mimeType = 'video/*';
    if (container === 'mp4' || container === 'm4v') {
      mimeType = 'video/mp4';
    } else if (container === 'mkv') {
      mimeType = 'video/x-matroska';
    } else if (container === 'webm') {
      mimeType = 'video/webm';
    } else if (container === 'avi') {
      mimeType = 'video/avi';
    } else if (container === 'mov') {
      mimeType = 'video/quicktime';
    }

    const success = await openInExternalPlayer(streamUrl, {
      title: item.Name,
      position: currentPosition,
      mimeType,
    });

    // If external player opened successfully, we can optionally close this player
    // For now, we'll let the user decide to come back or not
    if (!success) {
      // Resume playback if external player failed to open
      try {
        player?.play();
      } catch (e) {
        // Ignore errors
      }
    }
  }, [streamUrl, item, player, progress.position, mediaSource]);

  const handlePlayPause = () => {
    if (!player) return;
    try {
      frameStepTimestamp.current = 0;
      isFrameStepping.current = false;
      playButtonScale.value = withSequence(
        withSpring(0.85, { damping: 10 }),
        withSpring(1, { damping: 8 })
      );
      if (playerState === 'playing') player.pause();
      else player.play();
      showControlsNow();
    } catch (e) {}
  };

  const handleSeek = useCallback((position: number, keepControlsVisible = false) => {
    if (!player) return;
    try {
      frameStepTimestamp.current = 0;
      isFrameStepping.current = false;
      const clampedPosition = Math.max(0, Math.min(progress.duration, position));
      setIsBuffering(true);
      player.seekBy((clampedPosition - progress.position) / 1000);
      setProgress(clampedPosition, progress.duration, progress.buffered);
      if (keepControlsVisible) {
        // Reset the hide timer without re-triggering the show animation
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => {
          controlsOpacity.value = withTiming(0, { duration: 400 });
          runOnJS(setShowControls)(false);
        }, 4000);
      } else {
        showControlsNow();
      }
    } catch (e) {}
  }, [player, progress, showControlsNow, controlsOpacity]);

  const showSkipAnimation = useCallback((direction: 'left' | 'right') => {
    const opacity = direction === 'left' ? skipLeftOpacity : skipRightOpacity;
    const scale = direction === 'left' ? skipLeftScale : skipRightScale;

    cancelAnimation(opacity);
    cancelAnimation(scale);

    opacity.value = 0;
    scale.value = 0.5;

    opacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 300 })
    );
    scale.value = withSequence(
      withTiming(1.2, { duration: 100 }),
      withTiming(0.5, { duration: 300 })
    );
  }, [skipLeftOpacity, skipRightOpacity, skipLeftScale, skipRightScale]);

  const handleDoubleTapSeek = useCallback((direction: 'left' | 'right') => {
    const seekAmount = direction === 'left' ? -10000 : 10000;
    const newPosition = Math.max(0, Math.min(progress.duration, progress.position + seekAmount));
    handleSeek(newPosition);
    showSkipAnimation(direction);
  }, [progress, handleSeek, showSkipAnimation]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (!player) return;
    try {
      player.playbackRate = speed;
      setVideoPlaybackSpeed(speed);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowSpeedSelector(false);
      showControlsNow();
    } catch (e) {
      console.warn('Failed to set playback speed:', e);
    }
  }, [player, setVideoPlaybackSpeed, showControlsNow]);

  const handleSleepTimerSelect = useCallback((timer: VideoSleepTimer | undefined) => {
    setVideoSleepTimer(timer);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setVideoSleepTimer]);

  const handleSetLoopA = useCallback(() => {
    if (!player) return;
    const currentPos = player.currentTime * 1000;
    setAbLoop(prev => ({ ...prev, a: currentPos }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [player]);

  const handleSetLoopB = useCallback(() => {
    if (!player) return;
    const currentPos = player.currentTime * 1000;
    if (abLoop.a !== null && currentPos > abLoop.a) {
      setAbLoop(prev => ({ ...prev, b: currentPos }));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [player, abLoop.a]);

  const handleClearLoop = useCallback(() => {
    setAbLoop({ a: null, b: null });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleFrameStep = useCallback((direction: 'prev' | 'next') => {
    if (!player) return;
    // Set both flag and timestamp to reliably block playingChange events
    isFrameStepping.current = true;
    frameStepTimestamp.current = Date.now();
    const frameTime = 1 / 24;
    const step = direction === 'next' ? frameTime : -frameTime;
    const newTime = Math.max(0, player.currentTime + step);
    player.currentTime = newTime;
    // Keep player paused and ensure UI stays in paused state
    try {
      player.pause();
    } catch (e) {}
    // Ensure player stays paused and state is correct after frame step
    // The timestamp check (300ms window) provides additional protection against race conditions
    setTimeout(() => {
      isFrameStepping.current = false;
      setPlayerState('paused');
      setShowFrameControls(true);
    }, 50);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [player, setPlayerState]);

  const toggleControlsLock = useCallback(() => {
    setControlsLocked(prev => !prev);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const handleEnterPiP = useCallback(() => {
    try {
      videoViewRef.current?.startPictureInPicture();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {}
  }, []);

  const handleStartCasting = useCallback(async () => {
    if (!item || !streamUrl || !mediaSource || !chromecast.isConnected) return;

    const activeServer = useAuthStore.getState().getActiveServer();
    const serverUrl = activeServer?.url;
    const posterUrl = serverUrl
      ? `${serverUrl}/Items/${item.Id}/Images/Primary?maxHeight=720`
      : undefined;

    const mediaInfo: CastMediaInfo = {
      title: item.Name || 'Unknown',
      subtitle: item.Type === 'Episode'
        ? `S${item.ParentIndexNumber} E${item.IndexNumber} - ${item.SeriesName}`
        : item.ProductionYear?.toString(),
      imageUrl: posterUrl,
      streamUrl: streamUrl,
      contentType: 'video/mp4',
      duration: progress.duration,
      startPosition: progress.position,
    };

    setCastMediaInfo(mediaInfo);
    const success = await chromecast.loadMedia(mediaInfo);

    if (success) {
      player?.pause();
      setShowCastRemote(true);
    }
  }, [item, streamUrl, mediaSource, progress, player, chromecast]);

  const handleCastDisconnect = useCallback((position: number) => {
    castResumePosition.current = position;
    setCastMediaInfo(null);
    setShowCastRemote(false);
  }, []);

  const handleCastRemoteClose = useCallback(() => {
    setShowCastRemote(false);
  }, []);

  // Brightness/Volume gesture handlers
  const handleBrightnessChange = useCallback(async (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    setCurrentBrightness(clampedValue);
    try {
      await Brightness.setBrightnessAsync(clampedValue);
    } catch (e) {
      // Ignore brightness errors
    }
  }, []);

  const handleVolumeChange = useCallback(async (value: number) => {
    const clampedValue = Math.max(0, Math.min(1, value));
    setCurrentVolume(clampedValue);
    try {
      await VolumeManager.setVolume(clampedValue, { showUI: false });
    } catch (e) {
      // Ignore volume errors
    }
  }, []);

  const showBrightnessIndicatorWithTimeout = useCallback(() => {
    setShowBrightnessIndicator(true);
    if (brightnessIndicatorTimeout.current) {
      clearTimeout(brightnessIndicatorTimeout.current);
    }
    brightnessIndicatorTimeout.current = setTimeout(() => {
      setShowBrightnessIndicator(false);
    }, 1500);
  }, []);

  const showVolumeIndicatorWithTimeout = useCallback(() => {
    setShowVolumeIndicator(true);
    if (volumeIndicatorTimeout.current) {
      clearTimeout(volumeIndicatorTimeout.current);
    }
    volumeIndicatorTimeout.current = setTimeout(() => {
      setShowVolumeIndicator(false);
    }, 1500);
  }, []);

  const gestureZoneWidth = 100;
  const centerDeadzoneStart = screenWidth * 0.35;
  const centerDeadzoneEnd = screenWidth * 0.65;

  const handleHorizontalSeekStart = useCallback((startX: number) => {
    gestureStartX.current = startX;
    gestureStartPosition.current = progress.position;
    setIsHorizontalSeeking(true);
    setHorizontalSeekPosition(progress.position);
    setHorizontalSeekDelta(0);
  }, [progress.position]);

  const handleHorizontalSeekUpdate = useCallback((translationX: number) => {
    const sensitivity = 100;
    const seekDelta = translationX * sensitivity;
    const newPosition = Math.max(0, Math.min(progress.duration, gestureStartPosition.current + seekDelta));
    setHorizontalSeekPosition(newPosition);
    setHorizontalSeekDelta(seekDelta);
  }, [progress.duration]);

  const handleHorizontalSeekEnd = useCallback(() => {
    if (isHorizontalSeeking) {
      handleSeek(horizontalSeekPosition);
      setIsHorizontalSeeking(false);
      setHorizontalSeekDelta(0);
    }
  }, [isHorizontalSeeking, horizontalSeekPosition, handleSeek]);

  const gestureActiveZone = useRef<'left' | 'right' | 'center' | 'deadzone' | null>(null);

  const panGesture = Gesture.Pan()
    .minDistance(10)
    .onStart((e) => {
      const isInLeftZone = e.x < gestureZoneWidth;
      const isInRightZone = e.x > screenWidth - gestureZoneWidth;
      const isInCenterDeadzone = e.x >= centerDeadzoneStart && e.x <= centerDeadzoneEnd;

      if (isInLeftZone && !isPortrait) {
        // Left side controls volume
        gestureActiveZone.current = 'left';
        runOnJS(setGestureStartValue)(currentVolume);
        runOnJS(showVolumeIndicatorWithTimeout)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (isInRightZone && !isPortrait) {
        // Right side controls brightness
        gestureActiveZone.current = 'right';
        runOnJS(setGestureStartValue)(currentBrightness);
        runOnJS(showBrightnessIndicatorWithTimeout)();
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      } else if (isInCenterDeadzone) {
        // Center deadzone - no pan gesture, only taps work here
        gestureActiveZone.current = 'deadzone';
      } else {
        // Areas between edge zones and center deadzone - horizontal seeking
        gestureActiveZone.current = 'center';
        runOnJS(handleHorizontalSeekStart)(e.x);
      }
    })
    .onUpdate((e) => {
      if (gestureActiveZone.current === 'left') {
        // Left side controls volume
        const deltaY = -e.translationY;
        const sensitivity = 0.003;
        const newValue = gestureStartValue + (deltaY * sensitivity);
        runOnJS(handleVolumeChange)(newValue);
        runOnJS(showVolumeIndicatorWithTimeout)();
      } else if (gestureActiveZone.current === 'right') {
        // Right side controls brightness
        const deltaY = -e.translationY;
        const sensitivity = 0.003;
        const newValue = gestureStartValue + (deltaY * sensitivity);
        runOnJS(handleBrightnessChange)(newValue);
        runOnJS(showBrightnessIndicatorWithTimeout)();
      } else if (gestureActiveZone.current === 'center') {
        runOnJS(handleHorizontalSeekUpdate)(e.translationX);
      }
      // 'deadzone' does nothing on update
    })
    .onEnd(() => {
      if (gestureActiveZone.current === 'center') {
        runOnJS(handleHorizontalSeekEnd)();
      }
      gestureActiveZone.current = null;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(toggleControls)();
  });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(300)
    .onEnd((event) => {
      if (event.x < screenWidth * 0.35) {
        runOnJS(handleDoubleTapSeek)('left');
      } else if (event.x > screenWidth * 0.65) {
        runOnJS(handleDoubleTapSeek)('right');
      }
    });

  const gesture = Gesture.Race(
    panGesture,
    Gesture.Exclusive(
      doubleTapGesture,
      tapGesture
    )
  );

  // TV Remote D-pad handler
  useTVRemoteHandler({
    onSelect: handlePlayPause,
    onPlayPause: handlePlayPause,
    onLeft: () => {
      const newPosition = Math.max(0, progress.position - tvConstants.seekStepMs);
      handleSeek(newPosition);
      showSkipAnimation('left');
    },
    onRight: () => {
      const newPosition = Math.min(progress.duration, progress.position + tvConstants.seekStepMs);
      handleSeek(newPosition);
      showSkipAnimation('right');
    },
    onUp: () => {
      const newVolume = Math.min(1, currentVolume + tvConstants.volumeStep);
      handleVolumeChange(newVolume);
      showVolumeIndicatorWithTimeout();
    },
    onDown: () => {
      const newVolume = Math.max(0, currentVolume - tvConstants.volumeStep);
      handleVolumeChange(newVolume);
      showVolumeIndicatorWithTimeout();
    },
    onLongLeft: () => {
      // Fast rewind - 30 seconds
      const newPosition = Math.max(0, progress.position - 30000);
      handleSeek(newPosition);
      showSkipAnimation('left');
    },
    onLongRight: () => {
      // Fast forward - 30 seconds
      const newPosition = Math.min(progress.duration, progress.position + 30000);
      handleSeek(newPosition);
      showSkipAnimation('right');
    },
    onMenu: () => {
      // Toggle controls visibility on menu press
      toggleControls();
    },
    onAnyKey: () => {
      // Show controls on any key press
      if (!showControls) {
        showControlsNow();
      }
    },
    enabled: isTV,
  });

  // Android TV back button handler
  useBackHandler(() => {
    if (showControls) {
      // If controls are showing, hide them first
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
      controlsOpacity.value = withTiming(0, { duration: 250 });
      setShowControls(false);
      return true;
    }
    // Otherwise close the player
    handleClose();
    return true;
  }, isTV);

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const skipLeftStyle = useAnimatedStyle(() => ({
    opacity: skipLeftOpacity.value,
    transform: [{ scale: skipLeftScale.value }],
  }));

  const skipRightStyle = useAnimatedStyle(() => ({
    opacity: skipRightOpacity.value,
    transform: [{ scale: skipRightScale.value }],
  }));

  // Include hydration state in loading check - if store hasn't hydrated, we're still loading
  // Also include local path resolution - if we have a downloaded item but haven't finished resolving its path yet, we're still loading
  const isResolvingLocalPath = downloadStoreHydrated && !!downloadedItem && !localPathResolved;
  const isLoading = !downloadStoreHydrated || isResolvingLocalPath || itemLoading || playbackLoading || playerState === 'loading' || playerState === 'buffering';
  const showLoadingIndicator = isLoading || isBuffering;
  const progressPercent = progress.duration > 0 ? ((isSeeking ? seekPosition : progress.position) / progress.duration) * 100 : 0;

  const trickplayInfo: TrickplayInfo | null = (() => {
    if (!item?.Trickplay || !mediaSource?.Id) return null;
    const sourceData = item.Trickplay[mediaSource.Id];
    if (!sourceData) return null;
    const resolutions = Object.keys(sourceData).map(Number).sort((a, b) => a - b);
    if (resolutions.length === 0) return null;
    const selectedRes = resolutions[0];
    return sourceData[selectedRes.toString()] || null;
  })();

  const getSubtitle = () => {
    if (!item) return null;
    if (item.Type === 'Episode') {
      const seriesName = hideMedia ? 'TV Series' : item.SeriesName;
      return `S${item.ParentIndexNumber} E${item.IndexNumber} - ${seriesName}`;
    }
    if (item.ProductionYear) return hideMedia ? '2024' : item.ProductionYear.toString();
    return null;
  };

  return (
    <View className="flex-1 bg-black">
      <StatusBar hidden />

      <GestureDetector gesture={gesture}>
        <View className="flex-1">
          {streamUrl && (
            <VideoView
              ref={videoViewRef}
              player={player}
              style={{
                width: '100%',
                height: '100%',
              }}
              contentFit="contain"
              nativeControls={false}
              allowsPictureInPicture={true}
              startsPictureInPictureAutomatically={true}
            />
          )}

          {/* Subtle edge indicators for volume/brightness (landscape only, when controls visible) */}
          {!isPortrait && showControls && !showBrightnessIndicator && !showVolumeIndicator && (
            <>
              {/* Left edge indicator (volume) - shows current level */}
              <View
                style={{
                  position: 'absolute',
                  left: 60,
                  top: '30%',
                  height: '40%',
                  alignItems: 'center',
                }}
                pointerEvents="none"
              >
                <Ionicons
                  name={currentVolume === 0 ? "volume-mute-outline" : currentVolume < 0.5 ? "volume-low-outline" : "volume-medium-outline"}
                  size={16}
                  color="rgba(255,255,255,0.35)"
                  style={{ marginBottom: 6 }}
                />
                <View
                  style={{
                    flex: 1,
                    width: 4,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${currentVolume * 100}%`,
                      backgroundColor: 'rgba(255,255,255,0.4)',
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>

              {/* Right edge indicator (brightness) - shows current level */}
              <View
                style={{
                  position: 'absolute',
                  right: 60,
                  top: '30%',
                  height: '40%',
                  alignItems: 'center',
                }}
                pointerEvents="none"
              >
                <Ionicons name="sunny-outline" size={16} color="rgba(255,255,255,0.35)" style={{ marginBottom: 6 }} />
                <View
                  style={{
                    flex: 1,
                    width: 4,
                    backgroundColor: 'rgba(255,255,255,0.15)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${currentBrightness * 100}%`,
                      backgroundColor: 'rgba(255,255,255,0.4)',
                      borderRadius: 2,
                    }}
                  />
                </View>
              </View>
            </>
          )}

          <SubtitleDisplay
            text={currentSubtitle}
            showControls={showControls}
            subtitleSize={subtitleSettings.subtitleSize}
            subtitleTextColor={subtitleSettings.subtitleTextColor}
            subtitleBackgroundColor={subtitleSettings.subtitleBackgroundColor}
            subtitleBackgroundOpacity={subtitleSettings.subtitleBackgroundOpacity}
            subtitlePosition={subtitleSettings.subtitlePosition}
            subtitleOutlineStyle={subtitleSettings.subtitleOutlineStyle}
            isLoading={subtitlesLoading && (selectedSubtitleIndex !== undefined || externalSubtitleCues !== null)}
            error={subtitleLoadError}
          />

          {showLoadingIndicator && (
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <View className="w-20 h-20 rounded-full bg-black/60 items-center justify-center">
                <ActivityIndicator color={accentColor} size="large" />
              </View>
            </View>
          )}

          {!streamUrl && !isLoading && (
            <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
              <Text className="text-white/60 text-lg">No stream available</Text>
            </View>
          )}

          <Animated.View style={[skipLeftStyle, { position: 'absolute', left: '15%', top: '50%', marginTop: -40 }]} pointerEvents="none">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <SkipIcon size={28} seconds={10} direction="back" color={accentColor} />
            </View>
          </Animated.View>

          <Animated.View style={[skipRightStyle, { position: 'absolute', right: '15%', top: '50%', marginTop: -40 }]} pointerEvents="none">
            <View className="w-20 h-20 rounded-full bg-white/20 items-center justify-center">
              <SkipIcon size={28} seconds={10} direction="forward" color={accentColor} />
            </View>
          </Animated.View>

          {abLoop.a !== null && abLoop.b !== null && (
            <View
              style={{
                position: 'absolute',
                top: 60,
                left: '50%',
                transform: [{ translateX: -50 }],
                backgroundColor: '#a855f7',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
              pointerEvents="none"
            >
              <Ionicons name="repeat" size={14} color="#fff" />
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                A-B Loop
              </Text>
            </View>
          )}

          {/* Brightness Indicator (left side) */}
          {!isPortrait && (
            <BrightnessIndicator
              value={currentBrightness}
              visible={showBrightnessIndicator}
              accentColor={accentColor}
            />
          )}

          {/* Volume Indicator (right side) */}
          {!isPortrait && (
            <VolumeIndicator
              value={currentVolume}
              visible={showVolumeIndicator}
              accentColor={accentColor}
            />
          )}

          {/* Horizontal Seek Indicator */}
          <SeekIndicator
            visible={isHorizontalSeeking}
            currentTime={progress.position}
            seekTime={horizontalSeekPosition}
            seekDelta={horizontalSeekDelta}
            accentColor={accentColor}
            formatTime={formatPlayerTime}
          />

          {/* Subtitle Offset Control */}
          <SubtitleOffsetControl
            offset={subtitleOffset}
            onOffsetChange={setSubtitleOffset}
            accentColor={accentColor}
            visible={showSubtitleOffset && (selectedSubtitleIndex !== undefined || externalSubtitleCues !== null)}
          />

          {/* Skip Intro Button */}
          {showSkipIntro && (
            <Pressable
              onPress={handleSkipIntro}
              style={{
                position: 'absolute',
                right: 32,
                bottom: 120,
                backgroundColor: isIntroPreview ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.95)',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: isIntroPreview ? 1 : 0,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ color: '#000', fontSize: 15, fontWeight: '600' }}>
                {t('player.skipIntro')}
              </Text>
              <Text style={{ color: '#666', fontSize: 13, marginLeft: 8 }}>
                {isIntroPreview ? '\u2192' : '\u25B6\u25B6'}
              </Text>
            </Pressable>
          )}

          {/* Skip Credits Button (when no next episode) */}
          {showSkipCredits && !nextEpisode && (
            <Pressable
              onPress={handleSkipCredits}
              style={{
                position: 'absolute',
                right: 24,
                bottom: 100,
                backgroundColor: 'rgba(255,255,255,0.85)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>Skip Credits</Text>
              <Text style={{ color: '#666', fontSize: 14, marginLeft: 8 }}>{'\u25B6\u25B6'}</Text>
            </Pressable>
          )}

          {/* Next Episode Button (during credits or end of video) */}
          {(showSkipCredits || showNextUpCard) && nextEpisode && (
            <Pressable
              onPress={handlePlayNextEpisode}
              style={{
                position: 'absolute',
                right: 24,
                bottom: 100,
                backgroundColor: 'rgba(255,255,255,0.95)',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#000', fontSize: 14, fontWeight: '600' }}>
                {showSkipCredits ? t('player.nextEpisode') : t('player.nextEpisode')}: E{nextEpisode.IndexNumber}
              </Text>
              <Text style={{ color: '#666', fontSize: 14, marginLeft: 8 }}>{'\u25B6'}</Text>
            </Pressable>
          )}

          {/* TV Controls - Shown only on TV platforms */}
          {isTV && (
            <Animated.View style={controlsStyle} className="absolute inset-0" pointerEvents={showControls ? 'auto' : 'none'}>
              <TVVideoPlayerControls
                isPlaying={playerState === 'playing'}
                isLoading={showLoadingIndicator}
                onPlayPause={handlePlayPause}
                onSeekBack={() => handleDoubleTapSeek('left')}
                onSeekForward={() => handleDoubleTapSeek('right')}
                onClose={handleClose}
                position={progress.position}
                duration={progress.duration}
                buffered={progress.buffered}
                title={getDisplayName(item, hideMedia)}
                subtitle={getSubtitle() || undefined}
                onSubtitlePress={() => setShowSubtitleSelector(true)}
                onAudioPress={() => setShowAudioSelector(true)}
                onSpeedPress={() => setShowSpeedSelector(true)}
                playbackSpeed={videoPlaybackSpeed}
                hasActiveSubtitle={selectedSubtitleIndex !== undefined}
                onNextEpisode={handlePlayNextEpisode}
                hasNextEpisode={!!nextEpisode}
              />
            </Animated.View>
          )}

          {/* Mobile/Tablet Controls - Hidden on TV */}
          {!isTV && (
          <Animated.View style={controlsStyle} className="absolute inset-0" pointerEvents={showControls ? 'auto' : 'none'}>
            <LinearGradient
              colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.9)']}
              locations={[0, 0.25, 0.7, 1]}
              className="absolute inset-0"
            />

            <View
              className="absolute top-0 left-0 right-0"
              style={{
                paddingTop: isPortrait ? insets.top + 8 : 20,
                paddingBottom: 8,
                paddingLeft: Math.max(48, insets.left + 24),
                paddingRight: Math.max(48, insets.right + 24),
              }}
            >
              <View className="flex-row items-center">
                {/* Title area - left side */}
                <View className="flex-1 mr-4">
                  <Text className="text-white text-lg font-bold" numberOfLines={1}>
                    {getDisplayName(item, hideMedia)}
                  </Text>
                  {getSubtitle() && (
                    <Text className="text-white/60 text-sm mt-1" numberOfLines={1}>
                      {getSubtitle()}
                    </Text>
                  )}
                </View>

                {/* Top-right controls - dynamically rendered based on controlsConfig */}
                <View className="flex-row items-center">
                  {/* Render visible controls in order */}
                  {(controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER).map((controlId) => {
                    const placement = (controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG)[controlId];
                    if (placement !== 'visible') return null;

                    switch (controlId) {
                      case 'audioSubs':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="chatbubble-ellipses-outline"
                            onPress={() => setShowAudioSubtitleSelector(true)}
                            isActive={selectedSubtitleIndex !== undefined || externalSubtitleCues !== null}
                            accentColor={accentColor}
                          />
                        );
                      case 'subtitleSearch':
                        if (!openSubtitlesApiKey) return null;
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="search-outline"
                            onPress={() => setShowOpenSubtitlesSearch(true)}
                            isActive={externalSubtitleCues !== null}
                            accentColor={accentColor}
                          />
                        );
                      case 'episodes':
                        if (!isEpisode || !seasonEpisodes?.Items || seasonEpisodes.Items.length <= 1) return null;
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="list-outline"
                            onPress={() => setShowEpisodeList(true)}
                            accentColor={accentColor}
                          />
                        );
                      case 'cast':
                        if (!isChromecastSupported || !chromecast.isAvailable) return null;
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon={chromecast.isConnected ? 'tv' : 'tv-outline'}
                            onPress={() => chromecast.isConnected ? setShowCastRemote(true) : chromecast.showCastDialog()}
                            isActive={chromecast.isConnected}
                            accentColor={accentColor}
                          />
                        );
                      case 'pip':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="albums-outline"
                            onPress={handleEnterPiP}
                            accentColor={accentColor}
                          />
                        );
                      case 'speed':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="speedometer-outline"
                            onPress={() => setShowSpeedSelector(true)}
                            isActive={videoPlaybackSpeed !== 1}
                            accentColor={accentColor}
                          />
                        );
                      case 'quality':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="settings-outline"
                            onPress={() => setShowQualitySelector(true)}
                            isActive={streamingQuality !== 'auto'}
                            accentColor={accentColor}
                          />
                        );
                      case 'chapters':
                        if (!item?.Chapters || (item.Chapters as any[]).length === 0) return null;
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="bookmark-outline"
                            onPress={() => setShowChapterList(true)}
                            accentColor={accentColor}
                          />
                        );
                      case 'sleepTimer':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="moon-outline"
                            onPress={() => setShowSleepTimerSelector(true)}
                            isActive={!!sleepTimer}
                            accentColor={accentColor}
                          />
                        );
                      case 'lock':
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon={controlsLocked ? 'lock-closed' : 'lock-open-outline'}
                            onPress={toggleControlsLock}
                            isActive={controlsLocked}
                            accentColor={accentColor}
                          />
                        );
                      case 'externalPlayer':
                        if (!externalPlayerAvailable || !externalPlayerEnabled || !streamUrl) return null;
                        return (
                          <ControlIconButton
                            key={controlId}
                            icon="open-outline"
                            onPress={handleOpenExternalPlayer}
                            accentColor={accentColor}
                          />
                        );
                      default:
                        return null;
                    }
                  })}
                  {/* Always show More Options button (3-dot menu) */}
                  <ControlIconButton
                    icon="ellipsis-horizontal"
                    onPress={() => setShowMoreOptions(true)}
                    accentColor={accentColor}
                  />
                  <Pressable
                    onPress={handleClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    className="w-11 h-11 rounded-full bg-white/15 items-center justify-center active:bg-white/30 ml-1"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>
              </View>
            </View>

            <View className="absolute inset-0 items-center justify-center">
              <View className="flex-row items-center">
                <Pressable
                  onPress={() => handleSeek(Math.max(0, progress.position - 10000), true)}
                  className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mx-6 active:bg-white/20"
                >
                  <SkipIcon size={22} seconds={10} direction="back" color={accentColor} />
                </Pressable>

                <Animated.View style={playButtonStyle}>
                  <Pressable
                    onPress={handlePlayPause}
                    className="w-20 h-20 rounded-full items-center justify-center mx-6"
                    style={{ backgroundColor: accentColor }}
                  >
                    {showLoadingIndicator ? (
                      <ActivityIndicator color="#fff" size="large" />
                    ) : playerState === 'playing' ? (
                      <Ionicons name="pause" size={36} color="#fff" />
                    ) : (
                      <Ionicons name="play" size={36} color="#fff" />
                    )}
                  </Pressable>
                </Animated.View>

                <Pressable
                  onPress={() => handleSeek(Math.min(progress.duration, progress.position + 10000), true)}
                  className="w-14 h-14 rounded-full bg-white/10 items-center justify-center mx-6 active:bg-white/20"
                >
                  <SkipIcon size={22} seconds={10} direction="forward" color={accentColor} />
                </Pressable>
              </View>

              {showFrameControls && playerState === 'paused' && (
                <View className="flex-row items-center mt-4 gap-4">
                  <Pressable
                    onPress={() => handleFrameStep('prev')}
                    className="w-12 h-12 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                  >
                    <Ionicons name="play-back" size={20} color="#fff" />
                  </Pressable>
                  <Text className="text-white/70 text-xs font-medium">FRAME</Text>
                  <Pressable
                    onPress={() => handleFrameStep('next')}
                    className="w-12 h-12 rounded-full bg-white/20 items-center justify-center active:bg-white/30"
                  >
                    <Ionicons name="play-forward" size={20} color="#fff" />
                  </Pressable>
                </View>
              )}
            </View>

            <View
              className="absolute bottom-0 left-0 right-0 pb-8"
              style={{
                paddingLeft: Math.max(32, insets.left + 16),
                paddingRight: Math.max(32, insets.right + 16),
              }}
            >
              {item?.Chapters && item.Chapters.length > 0 && (
                <View className="flex-row items-center justify-between mb-2">
                  <CurrentChapterDisplay
                    chapters={item.Chapters as ChapterInfo[]}
                    currentPositionMs={progress.position}
                    visible={true}
                  />
                  <ChapterNavigation
                    chapters={item.Chapters as ChapterInfo[]}
                    currentPositionMs={progress.position}
                    onNavigate={handleSeek}
                    accentColor={accentColor}
                  />
                </View>
              )}
              <View className="flex-row items-center mb-3">
                <Text className="text-white text-sm font-medium w-14">
                  {formatPlayerTime(isSeeking ? seekPosition : progress.position)}
                </Text>

                <View className="flex-1 mx-4">
                  <GestureDetector
                    gesture={Gesture.Exclusive(
                      Gesture.Pan()
                        .onStart((e) => {
                          runOnJS(setIsSeeking)(true);
                          const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
                          const newPosition = percent * progress.duration;
                          runOnJS(setSeekPosition)(newPosition);
                        })
                        .onUpdate((e) => {
                          const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
                          const newPosition = percent * progress.duration;
                          runOnJS(setSeekPosition)(newPosition);
                        })
                        .onEnd(() => {
                          runOnJS(handleSeek)(seekPosition);
                          runOnJS(setIsSeeking)(false);
                        }),
                      Gesture.Tap().onEnd((e) => {
                        const percent = Math.max(0, Math.min(1, e.x / seekBarLayoutWidth));
                        const newPosition = percent * progress.duration;
                        runOnJS(handleSeek)(newPosition);
                      })
                    )}
                  >
                    <View
                      className="h-10 justify-center"
                      onLayout={(e) => setSeekBarLayoutWidth(e.nativeEvent.layout.width)}
                    >
                      <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3 }}>
                        <View
                          style={{
                            position: 'absolute',
                            top: 0,
                            height: 6,
                            width: `${progressPercent}%`,
                            backgroundColor: accentColor,
                            borderRadius: 3,
                          }}
                        />
                        {introStart !== null && introEnd !== null && progress.duration > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              height: 6,
                              left: `${(introStart / progress.duration) * 100}%`,
                              width: `${((introEnd - introStart) / progress.duration) * 100}%`,
                              backgroundColor: '#FFD700',
                              borderRadius: 3,
                            }}
                          />
                        )}
                        {creditsStart !== null && progress.duration > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              height: 6,
                              left: `${(creditsStart / progress.duration) * 100}%`,
                              width: `${((progress.duration - creditsStart) / progress.duration) * 100}%`,
                              backgroundColor: '#FF8C00',
                              borderRadius: 3,
                            }}
                          />
                        )}
                        {abLoop.a !== null && abLoop.b !== null && progress.duration > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: 0,
                              height: 6,
                              left: `${(abLoop.a / progress.duration) * 100}%`,
                              width: `${((abLoop.b - abLoop.a) / progress.duration) * 100}%`,
                              backgroundColor: '#a855f7',
                              borderRadius: 3,
                              opacity: 0.7,
                            }}
                          />
                        )}
                        {abLoop.a !== null && progress.duration > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: -4,
                              left: `${(abLoop.a / progress.duration) * 100}%`,
                              marginLeft: -6,
                              width: 12,
                              height: 14,
                              backgroundColor: '#a855f7',
                              borderRadius: 2,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>A</Text>
                          </View>
                        )}
                        {abLoop.b !== null && progress.duration > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: -4,
                              left: `${(abLoop.b / progress.duration) * 100}%`,
                              marginLeft: -6,
                              width: 12,
                              height: 14,
                              backgroundColor: '#a855f7',
                              borderRadius: 2,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>B</Text>
                          </View>
                        )}
                        {item?.Chapters && item.Chapters.length > 1 && (
                          <ChapterMarkers
                            chapters={item.Chapters as ChapterInfo[]}
                            duration={progress.duration}
                            accentColor={accentColor}
                          />
                        )}
                      </View>
                      <Animated.View
                        style={{
                          position: 'absolute',
                          left: `${progressPercent}%`,
                          marginLeft: -8,
                          width: 16,
                          height: 16,
                          borderRadius: 8,
                          backgroundColor: '#fff',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                          elevation: 4,
                          transform: [{ scale: isSeeking ? 1.3 : 1 }],
                        }}
                      />
                      {isSeeking && trickplayInfo && mediaSource && (
                        <TrickplayPreview
                          itemId={itemId}
                          mediaSourceId={mediaSource.Id}
                          trickplayInfo={trickplayInfo}
                          position={seekPosition}
                          duration={progress.duration}
                          seekBarWidth={seekBarLayoutWidth}
                          visible={true}
                          formatTime={formatPlayerTime}
                        />
                      )}
                      {isSeeking && !trickplayInfo && (
                        <TimeOnlyPreview
                          position={seekPosition}
                          duration={progress.duration}
                          seekBarWidth={seekBarLayoutWidth}
                          visible={true}
                          formatTime={formatPlayerTime}
                        />
                      )}
                    </View>
                  </GestureDetector>
                </View>

                <Text className="text-white/60 text-sm w-14 text-right">
                  {formatPlayerTime(progress.duration)}
                </Text>
              </View>
            </View>
          </Animated.View>
          )}

          {controlsLocked && (
            <View className="absolute inset-0" pointerEvents="box-only">
              <Pressable
                onPress={toggleControlsLock}
                className="absolute bottom-8 left-1/2 -ml-16 w-32 h-12 rounded-full bg-black/70 flex-row items-center justify-center gap-2"
              >
                <Ionicons name="lock-closed" size={18} color="#ef4444" />
                <Text className="text-white text-sm font-medium">Unlock</Text>
              </Pressable>
            </View>
          )}
        </View>
      </GestureDetector>

      {showAudioSelector && (
        <AudioTrackSelector
          onClose={() => setShowAudioSelector(false)}
          tracks={jellyfinAudioTracks}
          selectedIndex={selectedAudioIndex}
          onSelectTrack={handleSelectAudio}
        />
      )}
      {showSubtitleSelector && (
        <SubtitleSelector
          onClose={() => setShowSubtitleSelector(false)}
          tracks={jellyfinSubtitleTracks}
          selectedIndex={selectedSubtitleIndex}
          onSelectTrack={handleSelectSubtitle}
        />
      )}
      {showAudioSubtitleSelector && (
        <AudioSubtitleSelector
          onClose={() => setShowAudioSubtitleSelector(false)}
          audioTracks={jellyfinAudioTracks}
          subtitleTracks={jellyfinSubtitleTracks}
          selectedAudioIndex={selectedAudioIndex}
          selectedSubtitleIndex={selectedSubtitleIndex}
          onSelectAudio={handleSelectAudio}
          onSelectSubtitle={handleSelectSubtitle}
        />
      )}

      {/* Playback Speed Selector Modal */}
      {showSpeedSelector && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <Pressable
            onPress={() => setShowSpeedSelector(false)}
            className="absolute inset-0"
          />
          <View
            className="bg-neutral-900 rounded-2xl p-6 mx-8"
            style={{ maxWidth: 400, width: '90%' }}
          >
            <Text className="text-white text-lg font-bold mb-4 text-center">Playback Speed</Text>
            <View className="flex-row flex-wrap justify-center gap-2">
              {VIDEO_SPEED_OPTIONS.map((speed) => {
                const isActive = videoPlaybackSpeed === speed;
                return (
                  <Pressable
                    key={speed}
                    onPress={() => handleSpeedChange(speed)}
                    className="rounded-lg items-center justify-center"
                    style={{
                      width: 70,
                      height: 44,
                      backgroundColor: isActive ? accentColor : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text
                      className="font-semibold"
                      style={{ color: isActive ? '#fff' : 'rgba(255,255,255,0.8)' }}
                    >
                      {speed}x
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowSpeedSelector(false)}
              className="mt-4 py-3 rounded-lg bg-white/10 items-center"
            >
              <Text className="text-white font-medium">Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}

      <SleepTimerSelector
        visible={showSleepTimerSelector}
        onClose={() => setShowSleepTimerSelector(false)}
        onSelectTimer={handleSleepTimerSelect}
        currentTimer={sleepTimer}
        isEpisode={isEpisode}
        episodeEndTimeMs={progress.duration > 0 ? progress.duration - progress.position : undefined}
      />

      <SubtitleStyleModal
        visible={showSubtitleStyleModal}
        onClose={() => setShowSubtitleStyleModal(false)}
      />

      {showMoreOptions && (
        <Pressable
          onPress={() => setShowMoreOptions(false)}
          className="absolute inset-0 bg-black/80 items-center justify-center z-50"
        >
          <View
            className="bg-zinc-900 rounded-2xl p-6 w-80"
            style={{ maxHeight: screenHeight * 0.8 }}
          >
            <Text className="text-white text-lg font-bold mb-4 text-center">More Options</Text>
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {(controlsOrder ?? DEFAULT_PLAYER_CONTROLS_ORDER).map((controlId) => {
              const placement = (controlsConfig ?? DEFAULT_PLAYER_CONTROLS_CONFIG)[controlId];
              if (placement !== 'menu') return null;

              switch (controlId) {
                case 'audioSubs':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowAudioSubtitleSelector(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={20} color={selectedSubtitleIndex !== undefined ? accentColor : '#fff'} />
                      <Text className="text-white ml-3 flex-1">Audio & Subtitles</Text>
                    </Pressable>
                  );
                case 'subtitleSearch':
                  if (!openSubtitlesApiKey) return null;
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowOpenSubtitlesSearch(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="search-outline" size={20} color={externalSubtitleCues !== null ? accentColor : '#fff'} />
                      <Text className="text-white ml-3 flex-1">Search Subtitles</Text>
                      {externalSubtitleCues && (
                        <Text className="text-white/60 text-sm">Active</Text>
                      )}
                    </Pressable>
                  );
                case 'speed':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowSpeedSelector(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="speedometer-outline" size={20} color={videoPlaybackSpeed !== 1 ? accentColor : '#fff'} />
                      <Text className="text-white ml-3 flex-1">Playback Speed</Text>
                      <Text className="text-white/60 text-sm">{videoPlaybackSpeed}x</Text>
                    </Pressable>
                  );
                case 'quality':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowQualitySelector(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="settings-outline" size={20} color={streamingQuality !== 'auto' ? accentColor : '#fff'} />
                      <Text className="text-white ml-3 flex-1">Quality</Text>
                      <Text className="text-white/60 text-sm">{streamingQuality === 'auto' ? 'Auto' : streamingQuality === 'original' ? 'Original' : streamingQuality}</Text>
                    </Pressable>
                  );
                case 'chapters':
                  if (!item?.Chapters || (item.Chapters as any[]).length === 0) return null;
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowChapterList(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="bookmark-outline" size={20} color="#fff" />
                      <Text className="text-white ml-3">Chapters</Text>
                    </Pressable>
                  );
                case 'episodes':
                  if (!isEpisode || !seasonEpisodes?.Items || seasonEpisodes.Items.length <= 1) return null;
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowEpisodeList(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="tv-outline" size={20} color="#fff" />
                      <Text className="text-white ml-3 flex-1">Episodes</Text>
                      <Text className="text-white/60 text-sm">S{item?.ParentIndexNumber} E{item?.IndexNumber}</Text>
                    </Pressable>
                  );
                case 'sleepTimer':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); setShowSleepTimerSelector(true); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="moon-outline" size={20} color={sleepTimer ? accentColor : '#fff'} />
                      <Text className="text-white ml-3 flex-1">Sleep Timer</Text>
                      {sleepTimer && (
                        <Text className="text-white/60 text-sm">Active</Text>
                      )}
                    </Pressable>
                  );
                case 'lock':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); toggleControlsLock(); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name={controlsLocked ? 'lock-closed' : 'lock-open-outline'} size={20} color={controlsLocked ? accentColor : '#fff'} />
                      <Text className="text-white ml-3">{controlsLocked ? 'Unlock Controls' : 'Lock Controls'}</Text>
                    </Pressable>
                  );
                case 'pip':
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); handleEnterPiP(); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="albums-outline" size={20} color="#fff" />
                      <Text className="text-white ml-3">Picture-in-Picture</Text>
                    </Pressable>
                  );
                case 'cast':
                  if (!isChromecastSupported || !chromecast.isAvailable) return null;
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); chromecast.isConnected ? setShowCastRemote(true) : chromecast.showCastDialog(); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name={chromecast.isConnected ? 'tv' : 'tv-outline'} size={20} color={chromecast.isConnected ? accentColor : '#fff'} />
                      <Text className="text-white ml-3">{chromecast.isConnected ? 'Cast Remote' : 'Cast'}</Text>
                    </Pressable>
                  );
                case 'externalPlayer':
                  if (!externalPlayerAvailable || !externalPlayerEnabled || !streamUrl) return null;
                  return (
                    <Pressable
                      key={controlId}
                      onPress={() => { setShowMoreOptions(false); handleOpenExternalPlayer(); }}
                      className="flex-row items-center py-3 border-b border-white/10"
                    >
                      <Ionicons name="open-outline" size={20} color="#fff" />
                      <Text className="text-white ml-3">External Player</Text>
                    </Pressable>
                  );
                default:
                  return null;
              }
            })}

              {openSubtitlesApiKey && (
              <Pressable
                onPress={() => { setShowMoreOptions(false); setShowOpenSubtitlesSearch(true); }}
                className="flex-row items-center py-3 border-b border-white/10"
              >
                <Ionicons name="search-outline" size={20} color="#fff" />
                <Text className="text-white ml-3">Search Subtitles</Text>
              </Pressable>
              )}

              {(selectedSubtitleIndex !== undefined || externalSubtitleCues !== null) && (
              <>
                <Pressable
                  onPress={() => { setShowMoreOptions(false); setShowSubtitleStyleModal(true); }}
                  className="flex-row items-center py-3 border-b border-white/10"
                >
                  <Ionicons name="color-palette-outline" size={20} color="#fff" />
                  <Text className="text-white ml-3">Subtitle Style</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setShowMoreOptions(false); setShowSubtitleOffset(!showSubtitleOffset); }}
                  className="flex-row items-center py-3 border-b border-white/10"
                >
                  <Ionicons name="time-outline" size={20} color={subtitleOffset !== 0 ? accentColor : '#fff'} />
                  <Text className="text-white ml-3">
                    {subtitleOffset !== 0 ? `Sync: ${subtitleOffset > 0 ? '+' : ''}${(subtitleOffset / 1000).toFixed(1)}s` : 'Subtitle Sync'}
                  </Text>
                </Pressable>
              </>
              )}

              <Pressable
                onPress={() => { setShowMoreOptions(false); router.push('/settings/player-controls' as any); }}
                className="flex-row items-center py-3 border-b border-white/10"
              >
                <Ionicons name="options-outline" size={20} color="#fff" />
                <Text className="text-white ml-3">Customize Controls</Text>
              </Pressable>
            </ScrollView>

            <Pressable
              onPress={() => setShowMoreOptions(false)}
              className="mt-4 py-3 rounded-lg bg-white/10 items-center"
            >
              <Text className="text-white font-medium">Close</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      {showQualitySelector && (
        <Pressable
          onPress={() => setShowQualitySelector(false)}
          className="absolute inset-0 bg-black/80 items-center justify-center z-50"
        >
          <View
            className="bg-zinc-900 rounded-2xl p-6 w-80"
            style={{ maxHeight: screenHeight * 0.7 }}
          >
            <Text className="text-white text-lg font-bold mb-4 text-center">Streaming Quality</Text>
            <Text className="text-white/50 text-xs mb-4 text-center">
              Higher quality uses more data and may buffer on slow connections
            </Text>
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ flexGrow: 0 }}
              contentContainerStyle={{ paddingBottom: 4 }}
            >
              {[
                { value: 'auto', label: 'Auto', desc: 'Adapts to connection' },
                { value: 'original', label: 'Original', desc: 'Direct stream • No transcoding' },
                { value: '1080p', label: '1080p', desc: '~8 Mbps • High quality' },
                { value: '720p', label: '720p', desc: '~4 Mbps • Good quality' },
                { value: '480p', label: '480p', desc: '~2 Mbps • Data saver' },
              ].map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => {
                    setStreamingQuality(option.value as typeof streamingQuality);
                    setShowQualitySelector(false);
                  }}
                  className="flex-row items-center py-3 border-b border-white/10"
                  style={{ backgroundColor: streamingQuality === option.value ? accentColor + '20' : 'transparent' }}
                >
                  <View className="flex-1">
                    <Text className="text-white">{option.label}</Text>
                    <Text className="text-white/50 text-xs">{option.desc}</Text>
                  </View>
                  {streamingQuality === option.value && (
                    <Ionicons name="checkmark" size={20} color={accentColor} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setShowQualitySelector(false)}
              className="mt-4 py-3 rounded-lg bg-white/10 items-center"
            >
              <Text className="text-white font-medium">Close</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <ChapterList
        visible={showChapterList}
        onClose={() => setShowChapterList(false)}
        chapters={(item?.Chapters as ChapterInfo[]) || []}
        currentPositionMs={progress.position}
        onSelectChapter={handleSeek}
        itemId={item?.Id}
      />

      {isEpisode && (
        <EpisodeList
          visible={showEpisodeList}
          onClose={() => {
            setShowEpisodeList(false);
            setEpisodeListSeasonId(null);
          }}
          episodes={
            episodeListSeasonId && episodeListSeasonId !== seasonId
              ? episodeListEpisodes?.Items || []
              : seasonEpisodes?.Items || []
          }
          seasons={allSeasons?.Items}
          currentEpisodeId={itemId}
          currentSeasonId={episodeListSeasonId || seasonId}
          onSelectEpisode={handleSelectEpisode}
          onSelectSeason={(newSeasonId) => setEpisodeListSeasonId(newSeasonId)}
          isLoading={episodeListLoading}
          seriesName={item?.SeriesName}
        />
      )}

      <CastRemoteControl
        visible={showCastRemote}
        castState={chromecast.castState}
        mediaInfo={castMediaInfo}
        itemId={item?.Id}
        onDisconnect={handleCastDisconnect}
        onClose={handleCastRemoteClose}
      />

      {showOpenSubtitlesSearch && (
        <OpenSubtitlesSearch
          onClose={() => setShowOpenSubtitlesSearch(false)}
          onSelectSubtitle={handleExternalSubtitleSelect}
          initialQuery={item?.Name || ''}
          initialYear={item?.ProductionYear}
          type={item?.Type === 'Episode' ? 'episode' : 'movie'}
          seasonNumber={item?.ParentIndexNumber}
          episodeNumber={item?.IndexNumber}
          tmdbId={item?.ProviderIds?.Tmdb ? parseInt(item.ProviderIds.Tmdb, 10) : undefined}
          imdbId={item?.ProviderIds?.Imdb}
        />
      )}

      {isChromecastSupported && CastButton && (
        <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>
          <CastButton style={{ width: 1, height: 1 }} />
        </View>
      )}
    </View>
  );
}
