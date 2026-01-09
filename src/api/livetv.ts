import { jellyfinClient, getImageUrl } from './client';
import type {
  LiveTvChannel,
  LiveTvProgram,
  ChannelsResponse,
  ProgramsResponse,
  LiveTvInfo,
  GuideInfo,
  RecordingInfo,
  TimerInfo,
} from '@/types/livetv';

export async function getLiveTvInfo(): Promise<LiveTvInfo> {
  const response = await jellyfinClient.api.get('/LiveTv/Info');
  return response.data;
}

export async function getGuideInfo(): Promise<GuideInfo> {
  const response = await jellyfinClient.api.get('/LiveTv/GuideInfo');
  return response.data;
}

export async function getChannels(
  userId: string,
  options: {
    startIndex?: number;
    limit?: number;
    isFavorite?: boolean;
    sortBy?: string;
    sortOrder?: 'Ascending' | 'Descending';
    enableImages?: boolean;
    imageTypeLimit?: number;
    enableUserData?: boolean;
    addCurrentProgram?: boolean;
  } = {}
): Promise<ChannelsResponse> {
  const {
    startIndex = 0,
    limit = 500,
    isFavorite,
    sortBy = 'SortName',
    sortOrder = 'Ascending',
    enableImages = true,
    imageTypeLimit = 1,
    enableUserData = true,
    addCurrentProgram = true,
  } = options;

  const params = new URLSearchParams();
  params.set('userId', userId);
  params.set('startIndex', startIndex.toString());
  params.set('limit', limit.toString());
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  params.set('enableImages', enableImages.toString());
  params.set('imageTypeLimit', imageTypeLimit.toString());
  params.set('enableUserData', enableUserData.toString());
  params.set('addCurrentProgram', addCurrentProgram.toString());

  if (isFavorite !== undefined) {
    params.set('isFavorite', isFavorite.toString());
  }

  const response = await jellyfinClient.api.get(`/LiveTv/Channels?${params.toString()}`);
  return response.data;
}

export async function getChannel(channelId: string, userId: string): Promise<LiveTvChannel> {
  const params = new URLSearchParams();
  params.set('userId', userId);

  const response = await jellyfinClient.api.get(`/LiveTv/Channels/${channelId}?${params.toString()}`);
  return response.data;
}

export async function getPrograms(
  userId: string,
  options: {
    channelIds?: string[];
    minStartDate?: string;
    maxStartDate?: string;
    minEndDate?: string;
    maxEndDate?: string;
    hasAired?: boolean;
    isAiring?: boolean;
    isSeries?: boolean;
    isMovie?: boolean;
    isNews?: boolean;
    isSports?: boolean;
    isKids?: boolean;
    startIndex?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'Ascending' | 'Descending';
    enableImages?: boolean;
    imageTypeLimit?: number;
    enableUserData?: boolean;
    genres?: string[];
  } = {}
): Promise<ProgramsResponse> {
  const {
    channelIds,
    minStartDate,
    maxStartDate,
    minEndDate,
    maxEndDate,
    hasAired,
    isAiring,
    isSeries,
    isMovie,
    isNews,
    isSports,
    isKids,
    startIndex = 0,
    limit = 500,
    sortBy = 'StartDate',
    sortOrder = 'Ascending',
    enableImages = true,
    imageTypeLimit = 1,
    enableUserData = true,
    genres,
  } = options;

  const params = new URLSearchParams();
  params.set('userId', userId);
  params.set('startIndex', startIndex.toString());
  params.set('limit', limit.toString());
  params.set('sortBy', sortBy);
  params.set('sortOrder', sortOrder);
  params.set('enableImages', enableImages.toString());
  params.set('imageTypeLimit', imageTypeLimit.toString());
  params.set('enableUserData', enableUserData.toString());

  if (channelIds?.length) {
    params.set('channelIds', channelIds.join(','));
  }
  if (minStartDate) params.set('minStartDate', minStartDate);
  if (maxStartDate) params.set('maxStartDate', maxStartDate);
  if (minEndDate) params.set('minEndDate', minEndDate);
  if (maxEndDate) params.set('maxEndDate', maxEndDate);
  if (hasAired !== undefined) params.set('hasAired', hasAired.toString());
  if (isAiring !== undefined) params.set('isAiring', isAiring.toString());
  if (isSeries !== undefined) params.set('isSeries', isSeries.toString());
  if (isMovie !== undefined) params.set('isMovie', isMovie.toString());
  if (isNews !== undefined) params.set('isNews', isNews.toString());
  if (isSports !== undefined) params.set('isSports', isSports.toString());
  if (isKids !== undefined) params.set('isKids', isKids.toString());
  if (genres?.length) params.set('genres', genres.join(','));

  const response = await jellyfinClient.api.get(`/LiveTv/Programs?${params.toString()}`);
  return response.data;
}

export async function getRecommendedPrograms(
  userId: string,
  options: {
    limit?: number;
    isAiring?: boolean;
    hasAired?: boolean;
    isSeries?: boolean;
    isMovie?: boolean;
    isNews?: boolean;
    isSports?: boolean;
    isKids?: boolean;
    enableImages?: boolean;
    imageTypeLimit?: number;
  } = {}
): Promise<ProgramsResponse> {
  const {
    limit = 24,
    isAiring = true,
    hasAired,
    isSeries,
    isMovie,
    isNews,
    isSports,
    isKids,
    enableImages = true,
    imageTypeLimit = 1,
  } = options;

  const params = new URLSearchParams();
  params.set('userId', userId);
  params.set('limit', limit.toString());
  params.set('isAiring', isAiring.toString());
  params.set('enableImages', enableImages.toString());
  params.set('imageTypeLimit', imageTypeLimit.toString());

  if (hasAired !== undefined) params.set('hasAired', hasAired.toString());
  if (isSeries !== undefined) params.set('isSeries', isSeries.toString());
  if (isMovie !== undefined) params.set('isMovie', isMovie.toString());
  if (isNews !== undefined) params.set('isNews', isNews.toString());
  if (isSports !== undefined) params.set('isSports', isSports.toString());
  if (isKids !== undefined) params.set('isKids', isKids.toString());

  const response = await jellyfinClient.api.get(`/LiveTv/Programs/Recommended?${params.toString()}`);
  return response.data;
}

export async function getProgram(programId: string, userId: string): Promise<LiveTvProgram> {
  const params = new URLSearchParams();
  params.set('userId', userId);

  const response = await jellyfinClient.api.get(`/LiveTv/Programs/${programId}?${params.toString()}`);
  return response.data;
}

export async function getRecordings(
  userId: string,
  options: {
    channelId?: string;
    status?: string;
    isInProgress?: boolean;
    seriesTimerId?: string;
    enableImages?: boolean;
    imageTypeLimit?: number;
    startIndex?: number;
    limit?: number;
  } = {}
): Promise<{ Items: RecordingInfo[]; TotalRecordCount: number }> {
  const {
    channelId,
    status,
    isInProgress,
    seriesTimerId,
    enableImages = true,
    imageTypeLimit = 1,
    startIndex = 0,
    limit = 100,
  } = options;

  const params = new URLSearchParams();
  params.set('userId', userId);
  params.set('enableImages', enableImages.toString());
  params.set('imageTypeLimit', imageTypeLimit.toString());
  params.set('startIndex', startIndex.toString());
  params.set('limit', limit.toString());

  if (channelId) params.set('channelId', channelId);
  if (status) params.set('status', status);
  if (isInProgress !== undefined) params.set('isInProgress', isInProgress.toString());
  if (seriesTimerId) params.set('seriesTimerId', seriesTimerId);

  const response = await jellyfinClient.api.get(`/LiveTv/Recordings?${params.toString()}`);
  return response.data;
}

export async function getTimers(
  options: {
    channelId?: string;
    seriesTimerId?: string;
    isActive?: boolean;
    isScheduled?: boolean;
  } = {}
): Promise<{ Items: TimerInfo[]; TotalRecordCount: number }> {
  const { channelId, seriesTimerId, isActive, isScheduled } = options;

  const params = new URLSearchParams();
  if (channelId) params.set('channelId', channelId);
  if (seriesTimerId) params.set('seriesTimerId', seriesTimerId);
  if (isActive !== undefined) params.set('isActive', isActive.toString());
  if (isScheduled !== undefined) params.set('isScheduled', isScheduled.toString());

  const response = await jellyfinClient.api.get(`/LiveTv/Timers?${params.toString()}`);
  return response.data;
}

export async function createTimer(programId: string): Promise<void> {
  await jellyfinClient.api.post(`/LiveTv/Timers/Defaults?programId=${programId}`);
}

export async function deleteTimer(timerId: string): Promise<void> {
  await jellyfinClient.api.delete(`/LiveTv/Timers/${timerId}`);
}

export async function setChannelFavorite(
  channelId: string,
  userId: string,
  isFavorite: boolean
): Promise<void> {
  if (isFavorite) {
    await jellyfinClient.api.post(`/Users/${userId}/FavoriteItems/${channelId}`);
  } else {
    await jellyfinClient.api.delete(`/Users/${userId}/FavoriteItems/${channelId}`);
  }
}

export function getChannelImageUrl(
  channelId: string,
  options: { maxWidth?: number; maxHeight?: number; tag?: string } = {}
): string | null {
  return getImageUrl(channelId, 'Primary', options);
}

export function getProgramImageUrl(
  programId: string,
  options: { maxWidth?: number; maxHeight?: number; tag?: string } = {}
): string | null {
  return getImageUrl(programId, 'Primary', options);
}

export function getLiveStreamUrl(channelId: string): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const { useAuthStore } = require('@/stores/authStore');
  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;

  const params = new URLSearchParams();
  if (userId) params.set('userId', userId);
  if (server?.accessToken) params.set('api_key', server.accessToken);
  params.set('container', 'ts,mp4,mkv');
  params.set('videoCodec', 'h264,hevc,mpeg2video');
  params.set('audioCodec', 'aac,mp3,ac3');

  return `${jellyfinClient.url}/LiveTv/Channels/${channelId}/stream?${params.toString()}`;
}

export function getLiveHlsStreamUrl(channelId: string): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const { useAuthStore } = require('@/stores/authStore');
  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;
  const deviceId = server?.deviceId || 'jellychub-mobile';

  const params = new URLSearchParams();
  if (userId) params.set('UserId', userId);
  if (server?.accessToken) params.set('api_key', server.accessToken);
  params.set('DeviceId', deviceId);
  params.set('PlaySessionId', `livetv-${channelId}-${Date.now()}`);
  params.set('Container', 'ts');
  params.set('VideoCodec', 'h264');
  params.set('AudioCodec', 'aac,mp3,ac3');
  params.set('TranscodingProtocol', 'hls');
  params.set('TranscodingContainer', 'ts');
  params.set('SegmentContainer', 'ts');
  // MinSegments=1 allows playback to start after just one segment is ready (faster initial playback)
  params.set('MinSegments', '1');
  params.set('BreakOnNonKeyFrames', 'True');
  params.set('MaxStreamingBitrate', '20000000');
  // Segment length of 3 seconds is standard for HLS - balances latency vs HTTP overhead
  params.set('SegmentLength', '3');

  return `${jellyfinClient.url}/LiveTv/Channels/${channelId}/stream.m3u8?${params.toString()}`;
}

// Alternative direct stream URL for Live TV (MP4/TS container)
export function getLiveDirectStreamUrl(channelId: string): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const { useAuthStore } = require('@/stores/authStore');
  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;
  const deviceId = server?.deviceId || 'jellychub-mobile';

  const params = new URLSearchParams();
  if (userId) params.set('UserId', userId);
  if (server?.accessToken) params.set('api_key', server.accessToken);
  params.set('DeviceId', deviceId);
  params.set('PlaySessionId', `livetv-${channelId}-${Date.now()}`);
  params.set('Container', 'ts,mp4');
  params.set('VideoCodec', 'h264,mpeg2video');
  params.set('AudioCodec', 'aac,mp3,ac3');

  return `${jellyfinClient.url}/LiveTv/Channels/${channelId}/stream?${params.toString()}`;
}

// Get recording folders
export async function getRecordingFolders(): Promise<{ Items: RecordingInfo[]; TotalRecordCount: number }> {
  const response = await jellyfinClient.api.get('/LiveTv/Recordings/Folders');
  return response.data;
}

// Get series timers (recurring recordings)
export async function getSeriesTimers(): Promise<{ Items: SeriesTimerInfo[]; TotalRecordCount: number }> {
  const response = await jellyfinClient.api.get('/LiveTv/SeriesTimers');
  return response.data;
}

// Create series timer
export async function createSeriesTimer(programId: string): Promise<void> {
  const defaults = await jellyfinClient.api.get(`/LiveTv/SeriesTimers/Defaults?programId=${programId}`);
  await jellyfinClient.api.post('/LiveTv/SeriesTimers', defaults.data);
}

// Cancel series timer
export async function cancelSeriesTimer(timerId: string): Promise<void> {
  await jellyfinClient.api.delete(`/LiveTv/SeriesTimers/${timerId}`);
}

// Delete recording
export async function deleteRecording(recordingId: string): Promise<void> {
  await jellyfinClient.api.delete(`/LiveTv/Recordings/${recordingId}`);
}

// Get Live TV playback info (similar to regular video)
export async function getLiveTvPlaybackInfo(channelId: string, userId: string): Promise<any> {
  const { useAuthStore } = require('@/stores/authStore');
  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const deviceId = server?.deviceId || 'jellychub-mobile';

  const response = await jellyfinClient.api.post(`/Items/${channelId}/PlaybackInfo`, {
    UserId: userId,
    DeviceId: deviceId,
    MaxStreamingBitrate: 20000000,
    AutoOpenLiveStream: true,
    EnableDirectStream: true,
    EnableDirectPlay: true,
    DeviceProfile: {
      MaxStreamingBitrate: 20000000,
      DirectPlayProfiles: [
        { Container: 'ts', Type: 'Video', VideoCodec: 'h264,hevc,mpeg2video', AudioCodec: 'aac,mp3,ac3' },
        { Container: 'mp4', Type: 'Video', VideoCodec: 'h264,hevc', AudioCodec: 'aac,mp3,ac3' },
      ],
      TranscodingProfiles: [
        {
          Container: 'ts',
          Type: 'Video',
          VideoCodec: 'h264',
          AudioCodec: 'aac,mp3,ac3',
          Protocol: 'hls',
          Context: 'Streaming',
          MaxAudioChannels: '6',
          // MinSegments=1 allows faster initial playback
          MinSegments: 1,
          BreakOnNonKeyFrames: true,
          // Standard HLS segment length for good latency/overhead balance
          SegmentLength: 3,
        },
      ],
      ContainerProfiles: [],
      CodecProfiles: [],
      SubtitleProfiles: [
        { Format: 'srt', Method: 'Encode' },
        { Format: 'ass', Method: 'Encode' },
        { Format: 'ssa', Method: 'Encode' },
        { Format: 'vtt', Method: 'Encode' },
        { Format: 'sub', Method: 'Encode' },
        { Format: 'smi', Method: 'Encode' },
        { Format: 'pgs', Method: 'Encode' },
        { Format: 'dvdsub', Method: 'Encode' },
        { Format: 'dvbsub', Method: 'Encode' },
      ],
    },
  });
  return response.data;
}

export interface SeriesTimerInfo {
  Id: string;
  Name: string;
  ChannelId: string;
  ChannelName?: string;
  ProgramId?: string;
  RecordNewOnly: boolean;
  Days: string[];
  DayPattern?: string;
  StartDate?: string;
  EndDate?: string;
  PrePaddingSeconds: number;
  PostPaddingSeconds: number;
  Priority: number;
  Overview?: string;
  ImageTags?: Record<string, string>;
}
