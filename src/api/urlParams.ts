import { useAuthStore } from '@/stores/authStore';

/**
 * Common stream/media URL parameters builder
 * Centralizes URL param construction to avoid duplication
 */

export interface BaseStreamParams {
  userId?: string;
  apiKey?: string;
  maxStreamingBitrate?: number;
  startTimeTicks?: number;
}

export interface VideoStreamParams extends BaseStreamParams {
  mediaSourceId: string;
  deviceId: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface AudioStreamParams extends BaseStreamParams {
  container?: string;
  directStream?: boolean;
}

export interface HlsStreamParams extends VideoStreamParams {
  videoCodec?: string;
  audioCodec?: string;
  segmentContainer?: string;
  playSessionId?: string;
}

/**
 * Get common auth params (userId and api_key) from current auth state
 */
export function getAuthParams(): URLSearchParams {
  const params = new URLSearchParams();
  const state = useAuthStore.getState();
  const server = state.getActiveServer();
  const userId = state.currentUser?.Id;

  if (userId) {
    params.set('userId', userId);
  }

  if (server?.accessToken) {
    params.set('api_key', server.accessToken);
  }

  return params;
}

/**
 * Build base video stream params
 */
export function buildVideoStreamParams(options: VideoStreamParams): URLSearchParams {
  const params = getAuthParams();

  params.set('mediaSourceId', options.mediaSourceId);
  params.set('deviceId', options.deviceId);

  if (options.audioStreamIndex !== undefined) {
    params.set('audioStreamIndex', options.audioStreamIndex.toString());
  }

  if (options.subtitleStreamIndex !== undefined) {
    params.set('subtitleStreamIndex', options.subtitleStreamIndex.toString());
  }

  if (options.startTimeTicks) {
    params.set('startTimeTicks', options.startTimeTicks.toString());
  }

  if (options.maxStreamingBitrate) {
    params.set('maxStreamingBitrate', options.maxStreamingBitrate.toString());
  }

  return params;
}

/**
 * Build HLS streaming params
 */
export function buildHlsStreamParams(options: HlsStreamParams): URLSearchParams {
  const params = buildVideoStreamParams(options);

  params.set('videoCodec', options.videoCodec ?? 'h264,hevc,vp9');
  params.set('audioCodec', options.audioCodec ?? 'aac,mp3,ac3,eac3');
  params.set('segmentContainer', options.segmentContainer ?? 'ts');
  params.set('minSegments', '1');
  params.set('context', 'Streaming');
  params.set('playSessionId', options.playSessionId ?? `ps_${Date.now()}`);
  params.set('transcodeAudioChannels', '2');
  params.set('transcodingMaxAudioChannels', '6');
  params.set('breakOnNonKeyFrames', 'true');

  return params;
}

/**
 * Build transcoded download params
 */
export function buildTranscodeParams(options: VideoStreamParams): URLSearchParams {
  const params = buildVideoStreamParams(options);

  params.set('videoCodec', 'h264');
  params.set('audioCodec', 'aac');
  params.set('container', 'mp4');
  params.set('context', 'Static');
  params.set('transcodingContainer', 'mp4');
  params.set('transcodingProtocol', 'http');

  return params;
}

/**
 * Build audio stream params
 */
export function buildAudioStreamParams(options: AudioStreamParams = {}): URLSearchParams {
  const params = getAuthParams();
  const { maxStreamingBitrate = 320000, directStream = false } = options;

  if (directStream) {
    params.set('static', 'true');
    return params;
  }

  params.set('maxStreamingBitrate', maxStreamingBitrate.toString());
  params.set('container', 'mp3,aac,m4a,flac,wav,ogg');
  params.set('transcodingContainer', 'mp3');
  params.set('transcodingProtocol', 'http');
  params.set('audioCodec', 'mp3');

  return params;
}

/**
 * Build image params
 * Includes api_key for authenticated access to images
 */
export function buildImageParams(options: {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  tag?: string;
}): URLSearchParams {
  const params = getAuthParams();
  const { maxWidth, maxHeight, quality = 90, tag } = options;

  if (maxWidth) params.set('maxWidth', maxWidth.toString());
  if (maxHeight) params.set('maxHeight', maxHeight.toString());
  params.set('quality', quality.toString());
  if (tag) params.set('tag', tag);

  return params;
}
