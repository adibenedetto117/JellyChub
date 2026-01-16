/**
 * Core video player hook - shared logic for mobile and TV video players
 * Handles all state, queries, effects, and callbacks
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { useQuery } from '@tanstack/react-query';
import {
  useSharedValue,
  withTiming,
  withSpring,
  withSequence,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import * as ScreenOrientation from 'expo-screen-orientation';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useVideoPlayer, VideoView } from 'expo-video';
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
import { encryptionService } from '@/services';
import {
  formatPlayerTime,
  ticksToMs,
  msToTicks,
  getSubtitleStreams,
  getAudioStreams,
  openInExternalPlayer,
  hasExternalPlayerSupport,
  getDisplayName,
  goBack,
  subtitleCache,
  isTextBasedSubtitle,
  findSubtitleCue,
  parseSubtitles,
} from '@/utils';
import { selectAudioTrack } from '@/constants/audioLanguages';
import { useVideoPlayerModals } from './useVideoPlayerModals';
import { useChromecast, useCastButton } from '@/hooks/useChromecast';
import type { MediaSource } from '@/types/jellyfin';
import type { VideoSleepTimer } from '@/types/player';
import { isChromecastSupported, type CastMediaInfo } from '@/utils/casting';
import type { UseVideoPlayerCoreOptions } from './types';

export type { UseVideoPlayerCoreOptions };

const safeHaptics = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
};

export function useVideoPlayerCore({ itemId, from }: UseVideoPlayerCoreOptions) {
  // ============ STORE SELECTORS ============
  const currentUser = useAuthStore((state) => state.currentUser);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const subtitleSettings = useSettingsStore((s) => s.player);
  const externalPlayerEnabled = useSettingsStore((s) => s.player.externalPlayerEnabled ?? true);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const openSubtitlesApiKey = useSettingsStore((s) => s.openSubtitlesApiKey);
  const controlsConfig = useSettingsStore((s) => s.player.controlsConfig);
  const controlsOrder = useSettingsStore((s) => s.player.controlsOrder);
  const autoPlayEnabled = useSettingsStore((s) => s.player.autoPlay ?? true);
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);
  const downloadStoreHydrated = useDownloadStore(selectDownloadHasHydrated);
  const userId = currentUser?.Id ?? '';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Download handling
  const allDownloads = useDownloadStore((s) => s.downloads);
  const downloadedItem = downloadStoreHydrated ? getDownloadedItem(itemId) : undefined;
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);
  const [localPathResolved, setLocalPathResolved] = useState(false);

  // Player store selectors
  const playerState = usePlayerStore((s) => s.playerState);
  const progress = usePlayerStore((s) => s.progress);
  const setPlayerState = usePlayerStore((s) => s.setPlayerState);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const setCurrentItem = usePlayerStore((s) => s.setCurrentItem);
  const clearCurrentItem = usePlayerStore((s) => s.clearCurrentItem);

  // Subtitle offset
  const savedSubtitleOffset = useVideoPreferencesStore((s) => s.getSubtitleOffset(itemId));
  const saveSubtitleOffset = useVideoPreferencesStore((s) => s.setSubtitleOffset);
  const subtitleOffsetFromStore = usePlayerStore((s) => s.video.subtitleOffset);
  const setSubtitleOffsetInStore = usePlayerStore((s) => s.setSubtitleOffset);
  const subtitleOffset = savedSubtitleOffset || subtitleOffsetFromStore;

  const setSubtitleOffset = useCallback((offset: number) => {
    setSubtitleOffsetInStore(offset);
    saveSubtitleOffset(itemId, offset);
  }, [itemId, setSubtitleOffsetInStore, saveSubtitleOffset]);

  // Playback settings
  const videoPlaybackSpeed = usePlayerStore((s) => s.video.playbackSpeed);
  const setVideoPlaybackSpeed = usePlayerStore((s) => s.setVideoPlaybackSpeed);
  const sleepTimer = usePlayerStore((s) => s.video.sleepTimer);
  const setVideoSleepTimer = usePlayerStore((s) => s.setVideoSleepTimer);
  const clearVideoSleepTimer = usePlayerStore((s) => s.clearVideoSleepTimer);

  // ============ UI STATE ============
  const [showControls, setShowControls] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const modals = useVideoPlayerModals();
  const [showSubtitleOffset, setShowSubtitleOffsetState] = useState(false);

  // Media state
  const [playSessionId] = useState(() => generatePlaySessionId());
  const [mediaSource, setMediaSource] = useState<MediaSource | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamingQuality, setStreamingQuality] = useState<'auto' | 'original' | '1080p' | '720p' | '480p'>('auto');

  // Portrait/landscape
  const isActuallyPortrait = screenHeight > screenWidth;
  const isPortrait = isActuallyPortrait;

  // Track selection
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | undefined>(undefined);
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(undefined);
  const [jellyfinSubtitleTracks, setJellyfinSubtitleTracks] = useState<any[]>([]);
  const [jellyfinAudioTracks, setJellyfinAudioTracks] = useState<any[]>([]);
  const [externalSubtitleCues, setExternalSubtitleCues] = useState<Array<{ start: number; end: number; text: string }> | null>(null);

  // Intro/credits skip
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [isIntroPreview, setIsIntroPreview] = useState(false);
  const [introStart, setIntroStart] = useState<number | null>(null);
  const [introEnd, setIntroEnd] = useState<number | null>(null);
  const [showSkipCredits, setShowSkipCredits] = useState(false);
  const [creditsStart, setCreditsStart] = useState<number | null>(null);
  const [creditsEnd, setCreditsEnd] = useState<number | null>(null);
  const [showNextUpCard, setShowNextUpCard] = useState(false);
  const [nextEpisode, setNextEpisode] = useState<any>(null);

  // Subtitles
  const [subtitleCues, setSubtitleCues] = useState<Array<{ start: number; end: number; text: string }>>([]);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>('');
  const [subtitlesLoading, setSubtitlesLoading] = useState(false);
  const [subtitleLoadError, setSubtitleLoadError] = useState<string | null>(null);

  // Episode list
  const [episodeListSeasonId, setEpisodeListSeasonId] = useState<string | null>(null);

  // Other state
  const [abLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [controlsLocked, setControlsLocked] = useState(false);
  const [showFrameControls, setShowFrameControls] = useState(false);
  const [externalPlayerAvailable, setExternalPlayerAvailable] = useState(false);

  // Chromecast
  const chromecast = useChromecast();
  const CastButton = useCastButton();
  const [castMediaInfo, setCastMediaInfo] = useState<CastMediaInfo | null>(null);
  const wasCasting = useRef(false);
  const castResumePosition = useRef<number | null>(null);

  // Gesture state
  const [currentBrightness, setCurrentBrightness] = useState(0.5);
  const [currentVolume, setCurrentVolume] = useState(0.5);
  const gestureStartPosition = useRef(0);

  // ============ REFS ============
  const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoViewRef = useRef<VideoView>(null);
  const hasResumedPosition = useRef(false);
  const resumePositionMs = useRef(0);
  const isFrameStepping = useRef(false);
  const frameStepTimestamp = useRef(0);
  const playerKey = useRef(0);
  const isPlayerValid = useRef(true);
  const isPlayerReady = useRef(false);
  const pendingSubtitleLoad = useRef<{ itemId: string; mediaSourceId: string; index: number } | null>(null);
  const pendingSubtitleSelection = useRef<{ itemId: string; mediaSourceId: string; index: number } | null>(null);
  const currentPositionRef = useRef(0);
  const lastSeekTimeRef = useRef(0);
  const mediaSourceRef = useRef<MediaSource | null>(null);
  const playSessionIdRef = useRef(playSessionId);
  const isNavigatingRef = useRef(false);

  // ============ ANIMATED VALUES ============
  const controlsOpacity = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const skipLeftOpacity = useSharedValue(0);
  const skipRightOpacity = useSharedValue(0);
  const skipLeftScale = useSharedValue(0.5);
  const skipRightScale = useSharedValue(0.5);

  // ============ VIDEO PLAYER ============
  const player = useVideoPlayer(streamUrl ?? '', (p) => {
    p.loop = false;
    p.bufferOptions = {
      preferredForwardBufferDuration: 30,
      minBufferForPlayback: 5,
      waitsToMinimizeStalling: true,
    };
    p.play();
  });

  // Player event listeners
  useEffect(() => {
    if (!player) return;

    const playingSubscription = player.addListener('playingChange', ({ isPlaying }) => {
      setPlayerState(isPlaying ? 'playing' : 'paused');
    });

    const statusSubscription = player.addListener('statusChange', ({ status }) => {
      if (status === 'loading') {
        setPlayerState('loading');
        setIsBuffering(true);
      } else if (status === 'readyToPlay') {
        setIsBuffering(false);
        isPlayerReady.current = true;
        setPlayerState(player.playing ? 'playing' : 'paused');
        if (!hasResumedPosition.current && resumePositionMs.current > 0) {
          hasResumedPosition.current = true;
          player.currentTime = resumePositionMs.current / 1000;
        }
      } else if (status === 'error') {
        setPlayerState('error');
      }
    });

    const progressTracker = setInterval(() => {
      if (player && isPlayerReady.current) {
        const rawCurrentTimeMs = (player.currentTime || 0) * 1000;
        const durationMs = (player.duration || 0) * 1000;
        const bufferedMs = (player.bufferedPosition || 0) * 1000;
        const currentTimeMs = rawCurrentTimeMs > 0 ? rawCurrentTimeMs : currentPositionRef.current;
        if (rawCurrentTimeMs > 0) {
          currentPositionRef.current = rawCurrentTimeMs;
        }
        setProgress(currentTimeMs, durationMs, bufferedMs);

        // Update current subtitle
        const activeCues = externalSubtitleCues || subtitleCues;
        if (activeCues && activeCues.length > 0) {
          const adjustedTime = currentTimeMs + subtitleOffset;
          const cue = findSubtitleCue(activeCues, adjustedTime);
          setCurrentSubtitle(cue?.text || '');
        }

        // Check intro/credits visibility
        if (introStart !== null && introEnd !== null) {
          const inIntro = currentTimeMs >= introStart && currentTimeMs < introEnd;
          const nearIntro = currentTimeMs >= introStart - 5000 && currentTimeMs < introStart;
          setShowSkipIntro(inIntro);
          setIsIntroPreview(nearIntro && !inIntro);
        }
        if (creditsStart !== null) {
          setShowSkipCredits(currentTimeMs >= creditsStart);
        }
        // Show next up card near end
        if (durationMs > 0 && currentTimeMs >= durationMs - 30000) {
          setShowNextUpCard(true);
        } else {
          setShowNextUpCard(false);
        }
      }
    }, 250);

    return () => {
      playingSubscription.remove();
      statusSubscription.remove();
      clearInterval(progressTracker);
    };
  }, [player, setPlayerState, setProgress, externalSubtitleCues, subtitleCues, subtitleOffset, introStart, introEnd, creditsStart]);

  useEffect(() => {
    const currentPlayer = player;
    const currentPlaySessionId = playSessionIdRef.current;
    const currentMediaSourceId = mediaSourceRef.current?.Id;
    const currentPosition = currentPositionRef.current;

    return () => {
      try {
        if (currentPlayer) {
          currentPlayer.muted = true;
          currentPlayer.pause();
          currentPlayer.replace('');
        }
      } catch {}
      if (currentPlaySessionId && currentMediaSourceId) {
        reportPlaybackStopped(
          itemId,
          currentMediaSourceId,
          currentPlaySessionId,
          msToTicks(currentPosition)
        ).catch(() => {});
      }
      setPlayerState('idle');
    };
  }, [itemId, player, setPlayerState]);

  // ============ QUERIES ============
  const isOfflinePlayback = !!downloadedItem?.localPath && !!localFilePath;

  const { data: fetchedItem, isLoading: itemLoading } = useQuery({
    queryKey: ['item', userId, itemId],
    queryFn: () => getItem(userId, itemId),
    enabled: !!userId && !!itemId && !isOfflinePlayback,
  });

  const item = isOfflinePlayback ? downloadedItem?.item : fetchedItem;
  const isEpisode = item?.Type === 'Episode';
  const seriesId = item?.SeriesId;
  const seasonId = item?.SeasonId;

  const { data: playbackInfo, isLoading: playbackLoading } = useQuery({
    queryKey: ['playbackInfo', userId, itemId],
    queryFn: () => getPlaybackInfo(itemId, userId),
    enabled: !!userId && !!itemId && !isOfflinePlayback,
  });

  const { data: seasonEpisodes } = useQuery({
    queryKey: ['episodes', seriesId, seasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, seasonId),
    enabled: !!userId && !!seriesId && !!seasonId && isEpisode,
  });

  const { data: allSeasons } = useQuery({
    queryKey: ['seasons', seriesId, userId],
    queryFn: () => getSeasons(seriesId!, userId),
    enabled: !!userId && !!seriesId && isEpisode,
  });

  const [nextSeasonId, setNextSeasonId] = useState<string | null>(null);

  const { data: nextSeasonEpisodes } = useQuery({
    queryKey: ['nextSeasonEpisodes', seriesId, nextSeasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, nextSeasonId!),
    enabled: !!userId && !!seriesId && !!nextSeasonId,
  });

  const { data: episodeListEpisodes, isLoading: episodeListLoading } = useQuery({
    queryKey: ['episodeListEpisodes', seriesId, episodeListSeasonId, userId],
    queryFn: () => getEpisodes(seriesId!, userId, episodeListSeasonId!),
    enabled: !!userId && !!seriesId && !!episodeListSeasonId && episodeListSeasonId !== seasonId,
  });

  const { data: mediaSegments } = useQuery({
    queryKey: ['mediaSegments', itemId],
    queryFn: () => getMediaSegments(itemId),
    enabled: !!itemId,
  });

  // Trickplay data
  const trickplayData = item?.Trickplay;
  const trickplayInfo = useMemo(() => {
    if (!trickplayData || !mediaSource?.Id) return null;
    const sourceData = trickplayData[mediaSource.Id];
    if (!sourceData) return null;
    const resolutions = Object.keys(sourceData).map(Number).sort((a, b) => b - a);
    if (resolutions.length === 0) return null;
    return sourceData[resolutions[0].toString()];
  }, [trickplayData, mediaSource?.Id]);

  const trickplayResolution = useMemo(() => {
    if (!trickplayData || !mediaSource?.Id) return null;
    const sourceData = trickplayData[mediaSource.Id];
    if (!sourceData) return null;
    const resolutions = Object.keys(sourceData).map(Number).sort((a, b) => b - a);
    return resolutions[0] || null;
  }, [trickplayData, mediaSource?.Id]);

  // ============ DERIVED STATE ============
  const showLoadingIndicator = playerState === 'loading' || isBuffering;

  // ============ COMPUTED VALUES ============
  const getSubtitle = useCallback(() => {
    if (!item) return null;
    if (item.Type === 'Episode') {
      const seriesName = hideMedia ? 'TV Series' : item.SeriesName;
      return `S${item.ParentIndexNumber} E${item.IndexNumber} - ${seriesName}`;
    }
    if (item.ProductionYear) return hideMedia ? '2024' : item.ProductionYear.toString();
    return null;
  }, [item, hideMedia]);

  // ============ EFFECTS ============

  // Resolve local file path for downloads
  useEffect(() => {
    setLocalPathResolved(false);
    const resolveLocalPath = async () => {
      if (!downloadedItem?.localPath) {
        setLocalFilePath(null);
        setLocalPathResolved(true);
        return;
      }
      try {
        const fileInfo = await FileSystem.getInfoAsync(downloadedItem.localPath);
        if (!fileInfo.exists) {
          setLocalFilePath(null);
          setLocalPathResolved(true);
          return;
        }
        if (downloadedItem.localPath.endsWith('.enc')) {
          const decryptedPath = await encryptionService.getDecryptedUri(downloadedItem.localPath);
          const decryptedInfo = await FileSystem.getInfoAsync(decryptedPath);
          if (decryptedInfo.exists) {
            setLocalFilePath(decryptedPath);
          } else {
            setLocalFilePath(null);
          }
          setLocalPathResolved(true);
        } else {
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

  // Player key management
  useEffect(() => {
    playerKey.current += 1;
    isPlayerValid.current = true;
    isPlayerReady.current = false;
    return () => {
      isPlayerValid.current = false;
      isPlayerReady.current = false;
    };
  }, [streamUrl]);

  // Load saved subtitle offset
  useEffect(() => {
    if (savedSubtitleOffset && savedSubtitleOffset !== 0) {
      setSubtitleOffsetInStore(savedSubtitleOffset);
    }
  }, [itemId, savedSubtitleOffset, setSubtitleOffsetInStore]);

  // Check external player availability
  useEffect(() => {
    hasExternalPlayerSupport().then(setExternalPlayerAvailable);
  }, []);

  // Set intro/credits from media segments
  useEffect(() => {
    if (mediaSegments?.Items?.length) {
      const intro = mediaSegments.Items.find((s: any) => s.Type === 'Intro');
      const outro = mediaSegments.Items.find((s: any) => s.Type === 'Outro');

      if (intro && intro.StartTicks !== undefined && intro.EndTicks !== undefined) {
        setIntroStart(ticksToMs(intro.StartTicks));
        setIntroEnd(ticksToMs(intro.EndTicks));
      }
      if (outro && outro.StartTicks !== undefined) {
        setCreditsStart(ticksToMs(outro.StartTicks));
        if (outro.EndTicks) {
          setCreditsEnd(ticksToMs(outro.EndTicks));
        }
      }
    }
  }, [mediaSegments]);

  // Find next episode
  useEffect(() => {
    if (!isEpisode || !seasonEpisodes?.Items || !item) {
      setNextEpisode(null);
      return;
    }

    const currentIdx = seasonEpisodes.Items.findIndex((ep: any) => ep.Id === itemId);
    if (currentIdx >= 0 && currentIdx < seasonEpisodes.Items.length - 1) {
      setNextEpisode(seasonEpisodes.Items[currentIdx + 1]);
      setNextSeasonId(null);
    } else if (currentIdx === seasonEpisodes.Items.length - 1 && allSeasons?.Items) {
      const currentSeasonIdx = allSeasons.Items.findIndex((s: any) => s.Id === seasonId);
      if (currentSeasonIdx >= 0 && currentSeasonIdx < allSeasons.Items.length - 1) {
        setNextSeasonId(allSeasons.Items[currentSeasonIdx + 1].Id);
      } else {
        setNextEpisode(null);
        setNextSeasonId(null);
      }
    } else {
      setNextEpisode(null);
      setNextSeasonId(null);
    }
  }, [isEpisode, seasonEpisodes, item, itemId, allSeasons, seasonId]);

  // Handle next season episodes
  useEffect(() => {
    if (nextSeasonEpisodes?.Items?.length) {
      setNextEpisode(nextSeasonEpisodes.Items[0]);
    }
  }, [nextSeasonEpisodes]);

  // Initialize media source and stream URL
  useEffect(() => {
    if (isOfflinePlayback && localFilePath) {
      const offlineMediaSource: MediaSource = {
        Id: itemId,
        Protocol: 'File',
        Type: 'Default',
        Container: localFilePath.split('.').pop() || 'mp4',
        MediaStreams: downloadedItem?.item?.MediaSources?.[0]?.MediaStreams || [],
        SupportsDirectPlay: true,
        SupportsDirectStream: false,
        SupportsTranscoding: false,
      };
      setMediaSource(offlineMediaSource);
      mediaSourceRef.current = offlineMediaSource;
      setStreamUrl(localFilePath);

      const tracks = downloadedItem?.item?.MediaSources?.[0]?.MediaStreams || [];
      const subtitleTracks = tracks.filter(s => s.Type === 'Subtitle');
      const audioTracks = tracks.filter(s => s.Type === 'Audio');
      setJellyfinSubtitleTracks(subtitleTracks);
      setJellyfinAudioTracks(audioTracks);

      const defaultAudio = audioTracks.find((a) => a.IsDefault) || audioTracks[0];
      if (defaultAudio) setSelectedAudioIndex(defaultAudio.Index);

      return;
    }

    if (!playbackInfo?.MediaSources || !item) return;

    const selected = selectBestMediaSource(playbackInfo.MediaSources);
    if (!selected) return;

    setMediaSource(selected);
    mediaSourceRef.current = selected;

    const subtitleTracks = getSubtitleStreams(selected);
    const audioTracks = getAudioStreams(selected);
    setJellyfinSubtitleTracks(subtitleTracks);
    setJellyfinAudioTracks(audioTracks);

    const preferredAudioLang = useSettingsStore.getState().player.defaultAudioLanguage || 'eng';
    const preferredAudio = audioTracks.find((a) => a.Language?.toLowerCase() === preferredAudioLang.toLowerCase())
      || audioTracks.find((a) => a.IsDefault)
      || audioTracks[0];
    if (preferredAudio) setSelectedAudioIndex(preferredAudio.Index);

    const url = getStreamUrl(itemId, selected.Id);
    setStreamUrl(url);

    if (item.UserData?.PlaybackPositionTicks) {
      resumePositionMs.current = ticksToMs(item.UserData.PlaybackPositionTicks);
    }
  }, [playbackInfo, item, itemId, isOfflinePlayback, localFilePath, downloadedItem]);

  // Set current item in store
  useEffect(() => {
    if (item && mediaSource && streamUrl) {
      setCurrentItem({
        item,
        mediaSource,
        streamUrl,
        playSessionId,
      }, 'video');
    }
  }, [item, mediaSource, streamUrl, playSessionId, setCurrentItem]);

  // ============ CALLBACKS ============

  const loadSubtitleTrack = useCallback(async (
    loadItemId: string,
    loadMediaSourceId: string,
    index: number,
    retryCount = 0
  ): Promise<boolean> => {
    const loadRequest = { itemId: loadItemId, mediaSourceId: loadMediaSourceId, index };
    pendingSubtitleLoad.current = loadRequest;

    setSubtitlesLoading(true);
    setSubtitleLoadError(null);

    const cacheKey = `${loadItemId}-${loadMediaSourceId}-${index}`;
    const cachedCues = subtitleCache.get(cacheKey);
    if (cachedCues && cachedCues.length > 0) {
      if (pendingSubtitleLoad.current === loadRequest) {
        setSubtitleCues(cachedCues);
        setSubtitlesLoading(false);
      }
      return true;
    }

    const tryFetch = async (format: string): Promise<string | null> => {
      try {
        const url = getSubtitleUrl(loadItemId, loadMediaSourceId, index, format);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        if (!res.ok) return null;
        return await res.text();
      } catch {
        return null;
      }
    };

    try {
      let text = await tryFetch('vtt');
      if (!text || text.length < 10) text = await tryFetch('srt');
      if (!text || text.length < 10) text = await tryFetch('ass');
      if (!text || text.length < 10) text = await tryFetch('ssa');

      if (pendingSubtitleLoad.current !== loadRequest) return false;

      if (!text || text.length < 10) {
        if (retryCount < 2) {
          const delay = Math.pow(2, retryCount) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadSubtitleTrack(loadItemId, loadMediaSourceId, index, retryCount + 1);
        }
        if (pendingSubtitleLoad.current === loadRequest) {
          setSubtitleCues([]);
          setSubtitlesLoading(false);
          setSubtitleLoadError('Failed to load subtitles');
        }
        return false;
      }

      if (pendingSubtitleLoad.current !== loadRequest) return false;

      const cues = parseSubtitles(text);
      subtitleCache.set(cacheKey, cues);
      setSubtitleCues(cues);
      setSubtitlesLoading(false);
      return cues.length > 0;
    } catch {
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

    const selectedTrack = jellyfinSubtitleTracks.find((t: any) => t.Index === index);
    if (selectedTrack && !isTextBasedSubtitle(selectedTrack.Codec)) {
      setSubtitleLoadError('Image-based subtitles require transcoding');
      setSubtitleCues([]);
      return;
    }

    await loadSubtitleTrack(item.Id, mediaSource.Id, index);
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
        const track = selectAudioTrack(availableTracks, jellyfinAudioTracks, index);
        if (track) {
          player.audioTrack = track;
        }
      } catch (e) {}
    }
  }, [player, jellyfinAudioTracks]);

  const handlePlayPause = useCallback(() => {
    if (!player) return;
    safeHaptics();
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  }, [player]);

  const handleSeek = useCallback((position: number, keepControlsVisible = false) => {
    if (!player) return;
    lastSeekTimeRef.current = Date.now();
    const clampedPosition = Math.max(0, Math.min(position, progress.duration));
    player.currentTime = clampedPosition / 1000;
    setProgress(clampedPosition, progress.duration, progress.buffered);
  }, [player, progress, setProgress]);

  const handleSkipIntro = useCallback(() => {
    if (!player || !introEnd) return;
    safeHaptics();
    handleSeek(introEnd);
    setShowSkipIntro(false);
  }, [player, introEnd, handleSeek]);

  const handleSkipCredits = useCallback(() => {
    safeHaptics();
    setShowSkipCredits(false);
  }, []);

  const handlePlayNextEpisode = useCallback(() => {
    if (!nextEpisode || !mediaSource) return;
    safeHaptics();
    isNavigatingRef.current = true;
    reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {});
    clearCurrentItem();
    // Navigation will be handled by the component
  }, [nextEpisode, mediaSource, itemId, playSessionId, progress.position, clearCurrentItem]);

  const handleSelectEpisode = useCallback((episodeId: string) => {
    if (!mediaSource || episodeId === itemId) return;
    safeHaptics();
    isNavigatingRef.current = true;
    reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {});
    clearCurrentItem();
    // Navigation will be handled by the component
  }, [mediaSource, itemId, playSessionId, progress.position, clearCurrentItem]);

  const handleClose = useCallback(() => {
    try {
      if (player) {
        player.muted = true;
        player.pause();
        player.replace('');
      }
    } catch {}
    if (mediaSource) {
      reportPlaybackStopped(itemId, mediaSource.Id, playSessionId, msToTicks(progress.position)).catch(() => {});
    }
    clearCurrentItem();
    goBack(from);
  }, [player, mediaSource, itemId, playSessionId, progress.position, clearCurrentItem, from]);

  const handleSpeedChange = useCallback((speed: number) => {
    if (player) {
      player.playbackRate = speed;
    }
    setVideoPlaybackSpeed(speed);
    modals.closeModal('speedSelector');
  }, [player, setVideoPlaybackSpeed, modals]);

  const handleSleepTimerSelect = useCallback((timer: VideoSleepTimer | undefined) => {
    if (timer) {
      setVideoSleepTimer(timer);
    } else {
      clearVideoSleepTimer();
    }
  }, [setVideoSleepTimer, clearVideoSleepTimer]);

  const handleFrameStep = useCallback((direction: 'prev' | 'next') => {
    if (!player) return;

    isFrameStepping.current = true;
    frameStepTimestamp.current = Date.now();

    const frameDuration = 1000 / 24;
    const currentPos = player.currentTime * 1000;
    const newPos = direction === 'next'
      ? currentPos + frameDuration
      : Math.max(0, currentPos - frameDuration);

    player.currentTime = newPos / 1000;
    player.pause();

    setTimeout(() => {
      isFrameStepping.current = false;
    }, 500);
  }, [player]);

  const handleEnterPiP = useCallback(() => {
    videoViewRef.current?.startPictureInPicture();
  }, []);

  const handleOpenExternalPlayer = useCallback(async () => {
    if (!streamUrl || !item) return;
    safeHaptics();
    const success = await openInExternalPlayer(streamUrl, {
      title: item.Name || 'Video',
      position: progress.position,
    });
    if (success && player) {
      player.pause();
    }
  }, [streamUrl, item, player, progress.position]);

  const toggleControlsLock = useCallback(() => {
    safeHaptics();
    setControlsLocked(prev => !prev);
  }, []);

  const showControlsNow = useCallback(() => {
    if (controlsTimeout.current) {
      clearTimeout(controlsTimeout.current);
    }
    setShowControls(true);
    controlsOpacity.value = withTiming(1, { duration: 200 });

    if (!controlsLocked && playerState === 'playing') {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        controlsOpacity.value = withTiming(0, { duration: 200 });
      }, 5000);
    }
  }, [controlsLocked, playerState, controlsOpacity]);

  const handleDoubleTapSeek = useCallback((direction: 'left' | 'right') => {
    const skipAmount = 10000;
    const newPosition = direction === 'left'
      ? Math.max(0, progress.position - skipAmount)
      : Math.min(progress.duration, progress.position + skipAmount);
    handleSeek(newPosition, true);
  }, [progress, handleSeek]);

  const handleCastDisconnect = useCallback(async (position: number) => {
    castResumePosition.current = position;
    await chromecast.stop();
  }, [chromecast]);

  const handleCastRemoteClose = useCallback(() => {
    modals.closeModal('castRemote');
    if (castResumePosition.current !== null && player) {
      player.currentTime = castResumePosition.current / 1000;
      castResumePosition.current = null;
      player.play();
    }
  }, [modals, player]);

  // ============ RETURN ============
  return {
    // IDs
    itemId,
    from,
    userId,
    playSessionId,

    // Item data
    item,
    isEpisode,
    seriesId,
    seasonId,
    mediaSource,
    streamUrl,
    isOfflinePlayback,

    // Player
    player,
    videoViewRef,
    playerState,
    progress,
    showLoadingIndicator,

    // UI State
    showControls,
    setShowControls,
    showControlsNow,
    isSeeking,
    setIsSeeking,
    isBuffering,
    seekPosition,
    setSeekPosition,
    isPortrait,
    screenWidth,
    screenHeight,
    controlsLocked,
    toggleControlsLock,
    showFrameControls,

    // Modals
    modals,
    showSubtitleOffset,
    setShowSubtitleOffset: setShowSubtitleOffsetState,

    // Settings
    accentColor,
    subtitleSettings,
    hideMedia,
    openSubtitlesApiKey,
    controlsConfig,
    controlsOrder,
    externalPlayerEnabled,
    externalPlayerAvailable,
    streamingQuality,
    setStreamingQuality,

    // Playback
    videoPlaybackSpeed,
    handleSpeedChange,
    sleepTimer,
    handleSleepTimerSelect,
    subtitleOffset,
    setSubtitleOffset,

    // Tracks
    selectedSubtitleIndex,
    selectedAudioIndex,
    jellyfinSubtitleTracks,
    jellyfinAudioTracks,
    externalSubtitleCues,
    handleSelectSubtitle,
    handleSelectAudio,
    handleExternalSubtitleSelect,

    // Subtitles
    subtitleCues,
    currentSubtitle,
    subtitlesLoading,
    subtitleLoadError,

    // Intro/Credits
    showSkipIntro,
    isIntroPreview,
    introStart,
    introEnd,
    showSkipCredits,
    creditsStart,
    handleSkipIntro,
    handleSkipCredits,

    // Next episode
    showNextUpCard,
    nextEpisode,
    handlePlayNextEpisode,

    // Episodes
    seasonEpisodes,
    allSeasons,
    episodeListSeasonId,
    setEpisodeListSeasonId,
    episodeListEpisodes,
    episodeListLoading,
    handleSelectEpisode,

    // Trickplay
    trickplayInfo,
    trickplayResolution,

    // Chapters
    chapters: item?.Chapters,

    // AB Loop
    abLoop,

    // Chromecast
    chromecast,
    CastButton,
    castMediaInfo,
    handleCastDisconnect,
    handleCastRemoteClose,

    // Gestures
    currentBrightness,
    setCurrentBrightness,
    currentVolume,
    setCurrentVolume,

    // Animated values
    controlsOpacity,
    playButtonScale,
    skipLeftOpacity,
    skipRightOpacity,
    skipLeftScale,
    skipRightScale,

    // Handlers
    handlePlayPause,
    handleSeek,
    handleDoubleTapSeek,
    handleFrameStep,
    handleEnterPiP,
    handleOpenExternalPlayer,
    handleClose,

    // Utilities
    getDisplayName: (i: any) => getDisplayName(i, hideMedia),
    getSubtitle,
    formatPlayerTime,
  };
}

export type VideoPlayerCore = ReturnType<typeof useVideoPlayerCore>;
