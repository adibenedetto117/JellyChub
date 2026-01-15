import { Platform } from 'react-native';

export interface CastMediaInfo {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  streamUrl: string;
  contentType?: string;
  duration?: number;
  startPosition?: number;
}

export type CastConnectionState = 'disconnected' | 'connecting' | 'connected';

export interface CastSessionState {
  connectionState: CastConnectionState;
  deviceName?: string;
  isPlaying?: boolean;
  currentPosition?: number;
  duration?: number;
}

export const isChromecastSupported = Platform.OS === 'android';
export const isAirPlaySupported = Platform.OS === 'ios';

interface CastDevice {
  friendlyName: string;
  deviceId: string;
}

interface CastSession {
  getCastDevice(): Promise<CastDevice | null>;
}

interface MediaStatus {
  playerState: number;
  streamPosition: number;
}

interface SessionManager {
  getCurrentCastSession(): Promise<CastSession | null>;
  endCurrentSession(stopCasting: boolean): Promise<void>;
  onSessionStarted(callback: () => void): { remove: () => void };
  onSessionEnded(callback: () => void): { remove: () => void };
  onSessionStarting(callback: () => void): { remove: () => void };
  onSessionResumed(callback: () => void): { remove: () => void };
}

interface RemoteMediaClient {
  loadMedia(options: {
    mediaInfo: {
      contentUrl: string;
      contentType: string;
      metadata: {
        type: string;
        title: string;
        subtitle?: string;
        images?: { url: string }[];
      };
      streamDuration?: number;
    };
    startTime: number;
    autoplay: boolean;
  }): Promise<void>;
  getMediaStatus(): Promise<MediaStatus | null>;
  seek(options: { position: number }): Promise<void>;
  pause(): Promise<void>;
  play(): Promise<void>;
  stop(): Promise<void>;
}

interface CastContext {
  getPlayServicesState(): Promise<number>;
  getSessionManager(): SessionManager;
  showCastDialog(): Promise<boolean>;
}

interface GoogleCastModule {
  CastContext: CastContext;
  PlayServicesState: {
    SUCCESS: number;
  };
  MediaPlayerState: {
    PLAYING: number;
    PAUSED: number;
    BUFFERING: number;
    IDLE: number;
  };
  useRemoteMediaClient(): RemoteMediaClient | null;
  useCastSession(): CastSession | null;
  useDevices(): CastDevice[];
  CastButton: React.ComponentType<{ style?: any; tintColor?: string }>;
}

let GoogleCast: GoogleCastModule | null = null;
let castModule: GoogleCastModule | null = null;

// Mock hook for non-Android platforms to maintain consistent hook call order
const mockUseRemoteMediaClient = () => null;

function getGoogleCast(): GoogleCastModule | null {
  if (!isChromecastSupported) return null;
  if (castModule) return castModule;

  try {
    castModule = require('react-native-google-cast');
    GoogleCast = castModule;
    return castModule;
  } catch {
    return null;
  }
}

export function getCastModule(): GoogleCastModule | null {
  return getGoogleCast();
}

// Returns the useRemoteMediaClient hook (or a mock on non-Android platforms)
export function getUseRemoteMediaClient(): () => RemoteMediaClient | null {
  if (!isChromecastSupported) return mockUseRemoteMediaClient;
  const cast = getGoogleCast();
  return cast?.useRemoteMediaClient ?? mockUseRemoteMediaClient;
}

export async function initializeChromecast(): Promise<boolean> {
  if (!isChromecastSupported) return false;

  try {
    const cast = getGoogleCast();
    if (!cast) return false;

    const state = await cast.CastContext.getPlayServicesState();
    return state === cast.PlayServicesState.SUCCESS;
  } catch {
    return false;
  }
}

export async function getCastSessionState(): Promise<CastSessionState> {
  if (!isChromecastSupported) {
    return { connectionState: 'disconnected' };
  }

  try {
    const cast = getGoogleCast();
    if (!cast) return { connectionState: 'disconnected' };

    const sessionManager = cast.CastContext.getSessionManager();
    const session = await sessionManager.getCurrentCastSession();

    if (session) {
      const device = await session.getCastDevice();
      return {
        connectionState: 'connected',
        deviceName: device?.friendlyName,
      };
    }

    return { connectionState: 'disconnected' };
  } catch {
    return { connectionState: 'disconnected' };
  }
}

export function subscribeToCastState(
  callback: (state: CastSessionState) => void
): () => void {
  if (!isChromecastSupported) {
    return () => {};
  }

  const cast = getGoogleCast();
  if (!cast) {
    return () => {};
  }

  let unsubscribed = false;

  const sessionManager = cast.CastContext.getSessionManager();

  const onSessionStarting = () => {
    if (unsubscribed) return;
    callback({ connectionState: 'connecting' });
  };

  const onSessionStarted = () => {
    if (unsubscribed) return;
    getCastSessionState().then(callback);
  };

  const onSessionResumed = () => {
    if (unsubscribed) return;
    getCastSessionState().then(callback);
  };

  const onSessionEnded = () => {
    if (unsubscribed) return;
    callback({ connectionState: 'disconnected' });
  };

  const startingSub = sessionManager.onSessionStarting(onSessionStarting);
  const startedSub = sessionManager.onSessionStarted(onSessionStarted);
  const resumedSub = sessionManager.onSessionResumed(onSessionResumed);
  const endedSub = sessionManager.onSessionEnded(onSessionEnded);

  getCastSessionState().then((state) => {
    if (!unsubscribed) callback(state);
  });

  return () => {
    unsubscribed = true;
    try {
      startingSub?.remove();
      startedSub?.remove();
      resumedSub?.remove();
      endedSub?.remove();
    } catch {
    }
  };
}

export async function stopCasting(): Promise<number | null> {
  if (!isChromecastSupported) return null;

  try {
    const cast = getGoogleCast();
    if (!cast) return null;

    const sessionManager = cast.CastContext.getSessionManager();
    await sessionManager.endCurrentSession(true);
    return null;
  } catch {
    return null;
  }
}

export async function hasActiveCastSession(): Promise<boolean> {
  if (!isChromecastSupported) return false;

  try {
    const cast = getGoogleCast();
    if (!cast) return false;

    const sessionManager = cast.CastContext.getSessionManager();
    const session = await sessionManager.getCurrentCastSession();
    return session !== null;
  } catch {
    return false;
  }
}

export async function showCastDialog(): Promise<boolean> {
  if (!isChromecastSupported) return false;

  try {
    const cast = getGoogleCast();
    if (!cast) return false;

    return await cast.CastContext.showCastDialog();
  } catch {
    return false;
  }
}
