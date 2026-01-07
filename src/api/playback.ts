import { jellyfinClient } from './client';
import type { PlaybackInfo, PlaybackProgressInfo, MediaSource } from '@/types/jellyfin';

export interface PlaybackStartInfo {
  ItemId: string;
  MediaSourceId: string;
  AudioStreamIndex?: number;
  SubtitleStreamIndex?: number;
  MaxStreamingBitrate?: number;
  StartTimeTicks?: number;
  PlayMethod: 'DirectPlay' | 'DirectStream' | 'Transcode';
  PlaySessionId: string;
}

const deviceProfile = {
  MaxStreamingBitrate: 120000000,
  MaxStaticBitrate: 100000000,
  MusicStreamingTranscodingBitrate: 384000,
  DirectPlayProfiles: [
    {
      Container: 'mp4,m4v,mkv,webm',
      Type: 'Video',
      VideoCodec: 'h264,hevc,vp8,vp9,av1',
      AudioCodec: 'aac,mp3,opus,flac,vorbis,ac3,eac3',
    },
    {
      Container: 'mp3,aac,m4a,flac,webm,wav,ogg,opus',
      Type: 'Audio',
    },
  ],
  TranscodingProfiles: [
    {
      Container: 'ts',
      Type: 'Video',
      AudioCodec: 'aac,mp3,ac3,eac3',
      VideoCodec: 'h264',
      Context: 'Streaming',
      Protocol: 'hls',
      MaxAudioChannels: '6',
      MinSegments: 1,
      BreakOnNonKeyFrames: true,
    },
  ],
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
};

export async function getPlaybackInfo(
  itemId: string,
  userId: string
): Promise<PlaybackInfo> {
  const response = await jellyfinClient.api.post<PlaybackInfo>(
    `/Items/${itemId}/PlaybackInfo`,
    {
      UserId: userId,
      MaxStreamingBitrate: 120000000,
      AutoOpenLiveStream: true,
      DeviceProfile: deviceProfile,
    }
  );
  return response.data;
}

export async function reportPlaybackStart(info: PlaybackStartInfo): Promise<void> {
  await jellyfinClient.api.post('/Sessions/Playing', {
    ItemId: info.ItemId,
    MediaSourceId: info.MediaSourceId,
    AudioStreamIndex: info.AudioStreamIndex,
    SubtitleStreamIndex: info.SubtitleStreamIndex,
    MaxStreamingBitrate: info.MaxStreamingBitrate,
    StartTimeTicks: info.StartTimeTicks,
    PlayMethod: info.PlayMethod,
    PlaySessionId: info.PlaySessionId,
    CanSeek: true,
  });
}

export async function reportPlaybackProgress(
  progress: PlaybackProgressInfo
): Promise<void> {
  await jellyfinClient.api.post('/Sessions/Playing/Progress', {
    ItemId: progress.ItemId,
    MediaSourceId: progress.MediaSourceId,
    PositionTicks: progress.PositionTicks,
    IsPaused: progress.IsPaused,
    IsMuted: progress.IsMuted,
    PlaySessionId: progress.PlaySessionId,
    AudioStreamIndex: progress.AudioStreamIndex,
    SubtitleStreamIndex: progress.SubtitleStreamIndex,
    CanSeek: true,
  });
}

export async function reportPlaybackStopped(
  itemId: string,
  mediaSourceId: string,
  playSessionId: string,
  positionTicks: number
): Promise<void> {
  await jellyfinClient.api.post('/Sessions/Playing/Stopped', {
    ItemId: itemId,
    MediaSourceId: mediaSourceId,
    PlaySessionId: playSessionId,
    PositionTicks: positionTicks,
  });
}

export function selectBestMediaSource(sources: MediaSource[]): MediaSource | null {
  if (!sources.length) return null;

  const directPlay = sources.find((s) => s.SupportsDirectPlay);
  if (directPlay) return directPlay;

  const directStream = sources.find((s) => s.SupportsDirectStream);
  if (directStream) return directStream;

  const transcode = sources.find((s) => s.SupportsTranscoding);
  if (transcode) return transcode;

  return sources[0];
}

export function determinePlayMethod(
  source: MediaSource,
  subtitleIndex?: number
): 'DirectPlay' | 'DirectStream' | 'Transcode' {
  if (subtitleIndex !== undefined) return 'Transcode';
  if (source.SupportsDirectPlay) return 'DirectPlay';
  if (source.SupportsDirectStream) return 'DirectStream';
  return 'Transcode';
}

export function generatePlaySessionId(): string {
  return `ps_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

// Media Segments API for intro/credits detection
export interface MediaSegment {
  Id?: string;
  ItemId?: string;
  Type?: 'Intro' | 'Outro' | 'Preview' | 'Recap' | 'Commercial';
  StartTicks?: number;
  EndTicks?: number;
}

// Intro Skipper plugin response format
export interface IntroSkipperResponse {
  EpisodeId?: string;
  Valid?: boolean;
  IntroStart?: number;  // seconds
  IntroEnd?: number;    // seconds
  ShowSkipPromptAt?: number;
  HideSkipPromptAt?: number;
}

// Intro Skipper may return an object with Introduction and Credits keys
export interface IntroSkipperSegments {
  Introduction?: IntroSkipperResponse;
  Credits?: IntroSkipperResponse;
}

export interface MediaSegmentsResponse {
  Items: MediaSegment[];
}

export async function getMediaSegments(itemId: string): Promise<MediaSegmentsResponse> {
  const items: MediaSegment[] = [];

  console.log('[IntroSkipper] Fetching segments for:', itemId);

  // Try the Intro Skipper plugin endpoint first (most common)
  // Endpoint: /Episode/{itemId}/IntroTimestamps
  try {
    const response = await jellyfinClient.api.get<IntroSkipperResponse | IntroSkipperSegments>(
      `/Episode/${itemId}/IntroTimestamps`
    );

    console.log('[IntroSkipper] Raw response:', JSON.stringify(response.data));

    if (response.data) {
      // Check if it's the segmented format (Introduction/Credits keys)
      const data = response.data as any;

      if (data.Introduction && data.Introduction.IntroEnd > 0) {
        items.push({
          Type: 'Intro',
          StartTicks: (data.Introduction.IntroStart || 0) * 10000000,
          EndTicks: (data.Introduction.IntroEnd || 0) * 10000000,
        });
      }

      if (data.Credits && data.Credits.IntroEnd > 0) {
        items.push({
          Type: 'Outro',
          StartTicks: (data.Credits.IntroStart || 0) * 10000000,
          EndTicks: (data.Credits.IntroEnd || 0) * 10000000,
        });
      }

      // Check if it's the simple format (direct IntroStart/IntroEnd)
      if (data.IntroEnd > 0 && !data.Introduction) {
        items.push({
          Type: 'Intro',
          StartTicks: (data.IntroStart || 0) * 10000000,
          EndTicks: (data.IntroEnd || 0) * 10000000,
        });
      }

      if (items.length > 0) {
        console.log('[IntroSkipper] Parsed segments:', items);
        return { Items: items };
      }
    }
  } catch (e: any) {
    console.log('[IntroSkipper] Error or not available:', e?.message || e);
  }

  // Try the standard Media Segments API (Jellyfin 10.9+)
  try {
    console.log('[MediaSegments] Trying MediaSegments API...');
    const response = await jellyfinClient.api.get<MediaSegmentsResponse>(
      `/MediaSegments/${itemId}?IncludeSegmentTypes=Intro,Outro`
    );
    console.log('[MediaSegments] Raw response:', JSON.stringify(response.data));
    if (response.data?.Items?.length) {
      console.log('[MediaSegments] Found segments:', response.data.Items);
      return response.data;
    }
  } catch (e: any) {
    console.log('[MediaSegments] Error or not available:', e?.message || e);
  }

  console.log('[IntroSkipper] No segments found for:', itemId);
  return { Items: [] };
}
