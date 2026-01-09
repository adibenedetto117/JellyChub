import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useConnectionStore } from '@/stores/connectionStore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { APP_STORAGE } from '@/stores/storage';

const APP_NAME = 'JellyChub';
const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

function getDeviceName(): string {
  return Platform.select({
    ios: 'iOS Device',
    android: 'Android Device',
    default: 'Unknown Device',
  });
}

// Device ID key within consolidated app storage
const DEVICE_ID_KEY = 'jellychub_device_id';

function getDeviceId(): string {
  let deviceId = APP_STORAGE.getString(DEVICE_ID_KEY);
  if (!deviceId) {
    // Create a stable device ID that persists across app restarts
    deviceId = `jellychub_${Platform.OS}_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    APP_STORAGE.set(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

function buildAuthHeader(token?: string): string {
  const parts = [
    `MediaBrowser Client="${APP_NAME}"`,
    `Device="${getDeviceName()}"`,
    `DeviceId="${getDeviceId()}"`,
    `Version="${APP_VERSION}"`,
  ];

  if (token) {
    parts.push(`Token="${token}"`);
  }

  return parts.join(', ');
}

class JellyfinClient {
  private instance: AxiosInstance | null = null;
  private baseUrl: string | null = null;
  private pendingCustomHeaders: Record<string, string> | null = null;

  initialize(serverUrl: string, customHeaders?: Record<string, string>): void {
    this.baseUrl = serverUrl.replace(/\/$/, '');
    // Store custom headers for use before server is saved to store
    this.pendingCustomHeaders = customHeaders ?? null;

    this.instance = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const state = useAuthStore.getState();
        const server = state.getActiveServer();
        const token = server?.accessToken;

        config.headers['X-Emby-Authorization'] = buildAuthHeader(token);

        // Add custom headers for reverse proxy authentication
        // First check server config, then fall back to pending headers (for initial connection)
        const headers = server?.customHeaders ?? this.pendingCustomHeaders;
        if (headers) {
          Object.entries(headers).forEach(([name, value]) => {
            if (name && value) {
              config.headers[name] = value;
            }
          });
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.instance.interceptors.response.use(
      (response) => {
        // Report successful connection - this immediately clears any disconnected state
        useConnectionStore.getState().reportSuccess();
        return response;
      },
      (error: AxiosError) => {
        // Only report network-level failures (server unreachable)
        // Don't report on HTTP errors (4xx, 5xx) - those mean the server IS reachable
        const isNetworkError =
          !error.response && // No response means server couldn't be reached
          (error.code === 'ECONNABORTED' || // Connection aborted (timeout)
            error.code === 'ERR_NETWORK' || // Network error
            error.code === 'ECONNREFUSED' || // Connection refused
            error.code === 'ENOTFOUND' || // DNS lookup failed
            error.code === 'ETIMEDOUT' || // Connection timed out
            error.message === 'Network Error' ||
            error.message?.includes('timeout'));

        if (isNetworkError) {
          useConnectionStore.getState().reportFailure();
        }
        return Promise.reject(error);
      }
    );
  }

  clearPendingHeaders(): void {
    this.pendingCustomHeaders = null;
  }

  get api(): AxiosInstance {
    if (!this.instance) {
      throw new Error('JellyfinClient not initialized. Call initialize() first.');
    }
    return this.instance;
  }

  get url(): string {
    if (!this.baseUrl) {
      throw new Error('JellyfinClient not initialized. Call initialize() first.');
    }
    return this.baseUrl;
  }

  isInitialized(): boolean {
    return this.instance !== null;
  }
}

export const jellyfinClient = new JellyfinClient();

export function getImageUrl(
  itemId: string,
  imageType: string = 'Primary',
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    tag?: string;
  } = {}
): string | null {
  if (!jellyfinClient.isInitialized() || !itemId) return null;

  const { buildImageParams } = require('./urlParams');
  const params = buildImageParams(options);

  return `${jellyfinClient.url}/Items/${itemId}/Images/${imageType}?${params.toString()}`;
}

export function getStreamUrl(
  itemId: string,
  mediaSourceId: string,
  options: {
    audioStreamIndex?: number;
    subtitleStreamIndex?: number;
    startTimeTicks?: number;
    maxStreamingBitrate?: number;
    useHls?: boolean;
    transcode?: boolean;
  } = {}
): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;
  const params = new URLSearchParams();

  params.set('mediaSourceId', mediaSourceId);
  params.set('deviceId', getDeviceId());

  if (userId) {
    params.set('userId', userId);
  }

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  if (options.audioStreamIndex !== undefined) {
    params.set('audioStreamIndex', options.audioStreamIndex.toString());
  }

  if (options.startTimeTicks) {
    params.set('startTimeTicks', options.startTimeTicks.toString());
  }

  if (options.useHls) {
    params.set('videoCodec', 'h264,hevc,vp9');
    params.set('audioCodec', 'aac,mp3,ac3,eac3');
    params.set('maxStreamingBitrate', (options.maxStreamingBitrate ?? 20000000).toString());
    params.set('segmentContainer', 'ts');
    params.set('minSegments', '1');
    params.set('context', 'Streaming');
    params.set('playSessionId', `ps_${Date.now()}`);
    params.set('transcodeAudioChannels', '2');
    params.set('transcodingMaxAudioChannels', '6');
    params.set('breakOnNonKeyFrames', 'true');
    return `${jellyfinClient.url}/Videos/${itemId}/master.m3u8?${params.toString()}`;
  }

  // For transcoded downloads (non-HLS), use the stream endpoint with transcoding params
  if (options.transcode && options.maxStreamingBitrate) {
    params.set('videoCodec', 'h264');
    params.set('audioCodec', 'aac');
    params.set('maxStreamingBitrate', options.maxStreamingBitrate.toString());
    params.set('container', 'mp4');
    params.set('context', 'Static');
    params.set('transcodingContainer', 'mp4');
    params.set('transcodingProtocol', 'http');
    return `${jellyfinClient.url}/Videos/${itemId}/stream.mp4?${params.toString()}`;
  }

  params.set('static', 'true');

  if (options.maxStreamingBitrate) {
    params.set('maxStreamingBitrate', options.maxStreamingBitrate.toString());
  }

  return `${jellyfinClient.url}/Videos/${itemId}/stream?${params.toString()}`;
}

export function getAudioStreamUrl(
  itemId: string,
  options: {
    container?: string;
    maxStreamingBitrate?: number;
    directStream?: boolean;
  } = {}
): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;
  const { maxStreamingBitrate = 320000, directStream = false } = options;
  const params = new URLSearchParams();

  if (userId) {
    params.set('userId', userId);
  }

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  // Use direct stream for better seeking support (especially for M4B/M4A audiobooks)
  if (directStream) {
    params.set('static', 'true');
    return `${jellyfinClient.url}/Audio/${itemId}/stream?${params.toString()}`;
  }

  params.set('maxStreamingBitrate', maxStreamingBitrate.toString());
  params.set('container', 'mp3,aac,m4a,flac,wav,ogg');
  params.set('transcodingContainer', 'mp3');
  params.set('transcodingProtocol', 'http');
  params.set('audioCodec', 'mp3');

  return `${jellyfinClient.url}/Audio/${itemId}/universal?${params.toString()}`;
}

export function getBookDownloadUrl(itemId: string): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const params = new URLSearchParams();

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  return `${jellyfinClient.url}/Items/${itemId}/Download?${params.toString()}`;
}

export function getSubtitleUrl(
  itemId: string,
  mediaSourceId: string,
  subtitleIndex: number,
  format: string = 'vtt'
): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const params = new URLSearchParams();

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  params.set('startPositionTicks', '0');

  return `${jellyfinClient.url}/Videos/${itemId}/${mediaSourceId}/Subtitles/${subtitleIndex}/0/Stream.${format}?${params.toString()}`;
}

export interface TrickplayInfo {
  Width: number;
  Height: number;
  TileWidth: number;
  TileHeight: number;
  ThumbnailCount: number;
  Interval: number;
  Bandwidth: number;
}

export interface TrickplayData {
  [mediaSourceId: string]: {
    [resolution: string]: TrickplayInfo;
  };
}

export function getTrickplayTileUrl(
  itemId: string,
  mediaSourceId: string,
  resolution: number,
  tileIndex: number
): string {
  if (!jellyfinClient.isInitialized()) {
    return '';
  }

  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const params = new URLSearchParams();

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  params.set('MediaSourceId', mediaSourceId);

  return `${jellyfinClient.url}/Videos/${itemId}/Trickplay/${resolution}/${tileIndex}.jpg?${params.toString()}`;
}
