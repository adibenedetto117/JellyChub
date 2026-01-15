import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  getCastModule,
  getUseRemoteMediaClient,
  subscribeToCastState,
  stopCasting,
  showCastDialog as showCastDialogUtil,
  type CastSessionState,
  type CastMediaInfo,
} from '@/utils/casting';

export interface UseChromecastReturn {
  castState: CastSessionState;
  isConnected: boolean;
  isConnecting: boolean;
  deviceName: string | null;
  loadMedia: (mediaInfo: CastMediaInfo) => Promise<boolean>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  stop: () => Promise<number | null>;
  getPosition: () => Promise<number | null>;
  showCastDialog: () => Promise<boolean>;
  isAvailable: boolean;
  remoteClient: any;
}

export function useChromecast(): UseChromecastReturn {
  const [castState, setCastState] = useState<CastSessionState>({
    connectionState: 'disconnected',
  });
  const isAvailable = Platform.OS === 'android';
  const clientRef = useRef<any>(null);

  // Get the hook (or mock) to maintain consistent hook call order across platforms
  const useRemoteMediaClient = getUseRemoteMediaClient();
  const remoteClient = useRemoteMediaClient();

  useEffect(() => {
    clientRef.current = remoteClient;
  }, [remoteClient]);

  useEffect(() => {
    if (!isAvailable) return;

    const unsubscribe = subscribeToCastState(setCastState);
    return unsubscribe;
  }, [isAvailable]);

  const loadMedia = useCallback(async (mediaInfo: CastMediaInfo): Promise<boolean> => {
    const client = clientRef.current;
    if (!client) return false;

    try {
      await client.loadMedia({
        mediaInfo: {
          contentUrl: mediaInfo.streamUrl,
          contentType: mediaInfo.contentType || 'video/mp4',
          metadata: {
            type: 'movie',
            title: mediaInfo.title,
            subtitle: mediaInfo.subtitle,
            images: mediaInfo.imageUrl ? [{ url: mediaInfo.imageUrl }] : undefined,
          },
          streamDuration: mediaInfo.duration ? mediaInfo.duration / 1000 : undefined,
        },
        startTime: mediaInfo.startPosition ? mediaInfo.startPosition / 1000 : 0,
        autoplay: true,
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const play = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.play();
    } catch {
    }
  }, []);

  const pause = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.pause();
    } catch {
    }
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    const client = clientRef.current;
    if (!client) return;
    try {
      await client.seek({ position: positionMs / 1000 });
    } catch {
    }
  }, []);

  const stop = useCallback(async (): Promise<number | null> => {
    const client = clientRef.current;
    let position: number | null = null;

    if (client) {
      try {
        const status = await client.getMediaStatus();
        if (status) {
          position = status.streamPosition * 1000;
        }
      } catch {
      }
    }

    await stopCasting();
    return position;
  }, []);

  const getPosition = useCallback(async (): Promise<number | null> => {
    const client = clientRef.current;
    if (!client) return null;

    try {
      const status = await client.getMediaStatus();
      if (status) {
        return status.streamPosition * 1000;
      }
    } catch {
    }
    return null;
  }, []);

  const showCastDialog = useCallback(async (): Promise<boolean> => {
    return showCastDialogUtil();
  }, []);

  return {
    castState,
    isConnected: castState.connectionState === 'connected',
    isConnecting: castState.connectionState === 'connecting',
    deviceName: castState.deviceName || null,
    loadMedia,
    play,
    pause,
    seek,
    stop,
    getPosition,
    showCastDialog,
    isAvailable,
    remoteClient,
  };
}

export function useCastButton(): React.ComponentType<{ style?: any; tintColor?: string }> | null {
  const [CastButton, setCastButton] = useState<React.ComponentType<{ style?: any; tintColor?: string }> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const cast = getCastModule();
    if (cast?.CastButton) {
      setCastButton(() => cast.CastButton);
    }
  }, []);

  return CastButton;
}
