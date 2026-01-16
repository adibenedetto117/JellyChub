import { jellyfinClient } from './client';
import type { UserPolicy, BaseItem } from '@/types/jellyfin';

export type { UserPolicy };

export type RemoteSearchType = 'Movie' | 'Series' | 'Episode' | 'MusicAlbum' | 'MusicArtist' | 'Person' | 'Book';

export interface RemoteSearchInfo {
  SearchInfo: {
    Name?: string;
    Year?: number;
    ProviderIds?: Record<string, string>;
  };
  ItemId?: string;
  IncludeDisabledProviders?: boolean;
}

export interface RemoteSearchResult {
  Name: string;
  ProductionYear?: number;
  ProviderIds?: Record<string, string>;
  ImageUrl?: string;
  SearchProviderName?: string;
  Overview?: string;
}

export interface RefreshItemOptions {
  metadataRefreshMode?: 'None' | 'ValidationOnly' | 'Default' | 'FullRefresh';
  imageRefreshMode?: 'None' | 'ValidationOnly' | 'Default' | 'FullRefresh';
  replaceAllMetadata?: boolean;
  replaceAllImages?: boolean;
  recursive?: boolean;
}

export interface ApplyRemoteSearchOptions {
  replaceAllMetadata?: boolean;
  replaceAllImages?: boolean;
}

// Types for admin API responses
export interface SystemInfo {
  ServerName: string;
  Version: string;
  ProductName: string;
  OperatingSystem: string;
  OperatingSystemDisplayName: string;
  Id: string;
  StartupWizardCompleted: boolean;
  HasUpdateAvailable: boolean;
  HasPendingRestart: boolean;
  IsShuttingDown: boolean;
  LocalAddress?: string;
  WanAddress?: string;
  TranscodingTempPath?: string;
  LogPath?: string;
  InternalMetadataPath?: string;
  CachePath?: string;
}

export interface SessionInfo {
  Id: string;
  UserId: string;
  UserName: string;
  Client: string;
  DeviceName: string;
  DeviceId: string;
  ApplicationVersion: string;
  LastActivityDate: string;
  LastPlaybackCheckIn: string;
  NowPlayingItem?: NowPlayingItem;
  PlayState?: PlayState;
  TranscodingInfo?: TranscodingInfo;
  IsActive: boolean;
  SupportsMediaControl: boolean;
  SupportsRemoteControl: boolean;
  RemoteEndPoint?: string;
}

export interface NowPlayingItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  SeasonName?: string;
  IndexNumber?: number;
  ParentIndexNumber?: number;
  RunTimeTicks?: number;
  ProductionYear?: number;
  ImageTags?: Record<string, string>;
}

export interface PlayState {
  PositionTicks?: number;
  CanSeek: boolean;
  IsPaused: boolean;
  IsMuted: boolean;
  VolumeLevel?: number;
  AudioStreamIndex?: number;
  SubtitleStreamIndex?: number;
  MediaSourceId?: string;
  PlayMethod?: 'DirectPlay' | 'DirectStream' | 'Transcode';
  RepeatMode?: string;
}

export interface TranscodingInfo {
  AudioCodec?: string;
  VideoCodec?: string;
  Container?: string;
  IsVideoDirect: boolean;
  IsAudioDirect: boolean;
  Bitrate?: number;
  Framerate?: number;
  CompletionPercentage?: number;
  Width?: number;
  Height?: number;
  AudioChannels?: number;
  TranscodeReasons?: string[];
}

export interface ItemCounts {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
  ArtistCount: number;
  ProgramCount: number;
  TrailerCount: number;
  SongCount: number;
  AlbumCount: number;
  MusicVideoCount: number;
  BoxSetCount: number;
  BookCount: number;
  ItemCount: number;
}

export interface ActivityLogEntry {
  Id: number;
  Name: string;
  Overview?: string;
  ShortOverview?: string;
  Type: string;
  ItemId?: string;
  Date: string;
  UserId?: string;
  UserPrimaryImageTag?: string;
  Severity: 'Info' | 'Debug' | 'Warn' | 'Error' | 'Fatal';
}

export interface ActivityLogResponse {
  Items: ActivityLogEntry[];
  TotalRecordCount: number;
  StartIndex: number;
}

/**
 * Get server system information (requires admin privileges)
 */
export async function getSystemInfo(): Promise<SystemInfo> {
  const response = await jellyfinClient.api.get<SystemInfo>('/System/Info');
  return response.data;
}

/**
 * Get all active sessions on the server
 */
export async function getSessions(): Promise<SessionInfo[]> {
  const response = await jellyfinClient.api.get<SessionInfo[]>('/Sessions');
  return response.data;
}

/**
 * Get library item counts
 */
export async function getItemCounts(userId: string): Promise<ItemCounts> {
  const response = await jellyfinClient.api.get<ItemCounts>(
    `/Items/Counts?UserId=${userId}`
  );
  return response.data;
}

/**
 * Get activity log entries
 */
export async function getActivityLog(
  startIndex: number = 0,
  limit: number = 25
): Promise<ActivityLogResponse> {
  const params = new URLSearchParams();
  params.set('startIndex', startIndex.toString());
  params.set('limit', limit.toString());

  const response = await jellyfinClient.api.get<ActivityLogResponse>(
    `/System/ActivityLog/Entries?${params.toString()}`
  );
  return response.data;
}

/**
 * Trigger a library scan/refresh
 */
export async function refreshLibrary(): Promise<void> {
  await jellyfinClient.api.post('/Library/Refresh');
}

/**
 * Restart the Jellyfin server (requires admin privileges)
 */
export async function restartServer(): Promise<void> {
  await jellyfinClient.api.post('/System/Restart');
}

/**
 * Shutdown the Jellyfin server (requires admin privileges)
 */
export async function shutdownServer(): Promise<void> {
  await jellyfinClient.api.post('/System/Shutdown');
}

/**
 * Stop an active session by removing its device
 * This requires the deviceId from the session, not the sessionId
 */
export async function stopSession(deviceId: string): Promise<void> {
  await jellyfinClient.api.delete(`/Devices`, { params: { id: deviceId } });
}

/**
 * Send a message to a session
 */
export async function sendSessionMessage(
  sessionId: string,
  header: string,
  text: string,
  timeoutMs: number = 5000
): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Message`, {
    Header: header,
    Text: text,
    TimeoutMs: timeoutMs,
  });
}

/**
 * Send a message to all active sessions
 */
export async function broadcastMessage(
  header: string,
  text: string,
  timeoutMs: number = 5000
): Promise<void> {
  const sessions = await getSessions();
  await Promise.all(
    sessions.map((session) =>
      sendSessionMessage(session.Id, header, text, timeoutMs).catch(() => {})
    )
  );
}

/**
 * Remote control commands for sessions
 */
export async function sendPlayCommand(sessionId: string): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/Unpause`);
}

export async function sendPauseCommand(sessionId: string): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/Pause`);
}

export async function sendStopCommand(sessionId: string): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/Stop`);
}

export async function sendSeekCommand(sessionId: string, positionTicks: number): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/Seek?SeekPositionTicks=${positionTicks}`);
}

export async function sendNextTrackCommand(sessionId: string): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/NextTrack`);
}

export async function sendPreviousTrackCommand(sessionId: string): Promise<void> {
  await jellyfinClient.api.post(`/Sessions/${sessionId}/Playing/PreviousTrack`);
}

/**
 * Get scheduled tasks
 */
export interface ScheduledTask {
  Id: string;
  Name: string;
  Description: string;
  State: 'Idle' | 'Running' | 'Cancelling';
  CurrentProgressPercentage?: number;
  LastExecutionResult?: {
    StartTimeUtc: string;
    EndTimeUtc: string;
    Status: 'Completed' | 'Failed' | 'Cancelled' | 'Aborted';
    Name: string;
    Key: string;
  };
  Triggers: Array<{
    Type: string;
    TimeOfDayTicks?: number;
    IntervalTicks?: number;
    DayOfWeek?: string;
    MaxRuntimeTicks?: number;
  }>;
  Category: string;
  IsHidden: boolean;
  Key: string;
}

export async function getScheduledTasks(): Promise<ScheduledTask[]> {
  const response = await jellyfinClient.api.get<ScheduledTask[]>('/ScheduledTasks');
  return response.data;
}

export async function runScheduledTask(taskId: string): Promise<void> {
  await jellyfinClient.api.post(`/ScheduledTasks/Running/${taskId}`);
}

export async function stopScheduledTask(taskId: string): Promise<void> {
  await jellyfinClient.api.delete(`/ScheduledTasks/Running/${taskId}`);
}

/**
 * Get server logs
 */
export interface LogFile {
  DateCreated: string;
  DateModified: string;
  Name: string;
  Size: number;
}

export async function getLogFiles(): Promise<LogFile[]> {
  const response = await jellyfinClient.api.get<LogFile[]>('/System/Logs');
  return response.data;
}

/**
 * Get users list (admin only)
 */
export interface UserInfo {
  Id: string;
  Name: string;
  ServerId: string;
  HasPassword: boolean;
  HasConfiguredPassword: boolean;
  HasConfiguredEasyPassword: boolean;
  EnableAutoLogin: boolean;
  LastLoginDate?: string;
  LastActivityDate?: string;
  Policy: UserPolicy;
  PrimaryImageTag?: string;
}

export interface MediaFolder {
  Id: string;
  Name: string;
  CollectionType?: string;
  LibraryOptions?: {
    EnablePhotos?: boolean;
    EnableRealtimeMonitor?: boolean;
    EnableChapterImageExtraction?: boolean;
  };
}

export async function getUsers(): Promise<UserInfo[]> {
  const response = await jellyfinClient.api.get<UserInfo[]>('/Users');
  return response.data;
}

export async function disableUser(userId: string): Promise<void> {
  await jellyfinClient.api.post(`/Users/${userId}/Policy`, {
    IsDisabled: true,
  });
}

export async function enableUser(userId: string): Promise<void> {
  await jellyfinClient.api.post(`/Users/${userId}/Policy`, {
    IsDisabled: false,
  });
}

export async function resetUserPassword(userId: string, newPassword: string): Promise<void> {
  await jellyfinClient.api.post(`/Users/${userId}/Password`, {
    NewPw: newPassword,
    ResetPassword: false,
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await jellyfinClient.api.delete(`/Users/${userId}`);
}

/**
 * Get full user details including complete policy
 */
export async function getUserById(userId: string): Promise<UserInfo> {
  const response = await jellyfinClient.api.get<UserInfo>(`/Users/${userId}`);
  return response.data;
}

/**
 * Get all media libraries/folders
 */
export async function getMediaFolders(): Promise<MediaFolder[]> {
  const response = await jellyfinClient.api.get<{ Items: MediaFolder[] }>('/Library/MediaFolders');
  return response.data.Items;
}

/**
 * Update full user policy
 */
export async function updateUserPolicy(userId: string, policy: Partial<UserPolicy>): Promise<void> {
  await jellyfinClient.api.post(`/Users/${userId}/Policy`, policy);
}

/**
 * Update user's name
 */
export async function updateUserName(userId: string, newName: string): Promise<void> {
  const user = await getUserById(userId);
  await jellyfinClient.api.post(`/Users/${userId}`, {
    ...user,
    Name: newName,
  });
}

/**
 * Create a new user
 */
export async function createUser(name: string, password?: string): Promise<UserInfo> {
  const response = await jellyfinClient.api.post<UserInfo>('/Users/New', {
    Name: name,
    Password: password || '',
  });
  return response.data;
}

/**
 * Update item metadata
 */
export async function updateItem(itemId: string, updates: Partial<BaseItem>): Promise<void> {
  await jellyfinClient.api.post(`/Items/${itemId}`, {
    Id: itemId,
    ...updates,
  });
}

/**
 * Search remote metadata providers for item identification
 */
export async function searchRemoteMetadata(
  type: RemoteSearchType,
  searchInfo: RemoteSearchInfo
): Promise<RemoteSearchResult[]> {
  const response = await jellyfinClient.api.post<RemoteSearchResult[]>(
    `/Items/RemoteSearch/${type}`,
    searchInfo
  );
  return response.data;
}

/**
 * Apply remote search result to an item
 */
export async function applyRemoteSearchResult(
  itemId: string,
  result: RemoteSearchResult,
  options: ApplyRemoteSearchOptions = {}
): Promise<void> {
  const params = new URLSearchParams();
  if (options.replaceAllMetadata !== undefined) {
    params.set('ReplaceAllMetadata', String(options.replaceAllMetadata));
  }
  if (options.replaceAllImages !== undefined) {
    params.set('ReplaceAllImages', String(options.replaceAllImages));
  }

  const queryString = params.toString();
  const url = `/Items/RemoteSearch/Apply/${itemId}${queryString ? `?${queryString}` : ''}`;

  await jellyfinClient.api.post(url, result);
}

/**
 * Refresh item metadata from configured providers
 */
export async function refreshItemMetadata(
  itemId: string,
  options: RefreshItemOptions = {}
): Promise<void> {
  const params = new URLSearchParams();

  if (options.metadataRefreshMode) {
    params.set('MetadataRefreshMode', options.metadataRefreshMode);
  }
  if (options.imageRefreshMode) {
    params.set('ImageRefreshMode', options.imageRefreshMode);
  }
  if (options.replaceAllMetadata !== undefined) {
    params.set('ReplaceAllMetadata', String(options.replaceAllMetadata));
  }
  if (options.replaceAllImages !== undefined) {
    params.set('ReplaceAllImages', String(options.replaceAllImages));
  }
  if (options.recursive !== undefined) {
    params.set('Recursive', String(options.recursive));
  }

  const queryString = params.toString();
  await jellyfinClient.api.post(`/Items/${itemId}/Refresh${queryString ? `?${queryString}` : ''}`);
}
