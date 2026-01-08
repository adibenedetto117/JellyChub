import { Platform, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';

export interface ExternalPlayerOptions {
  title?: string;
  position?: number;
  mimeType?: string;
}

export interface ExternalPlayerResult {
  success: boolean;
  error?: string;
}

export const KNOWN_PLAYERS = {
  android: [
    { name: 'VLC', package: 'org.videolan.vlc' },
    { name: 'MX Player', package: 'com.mxtech.videoplayer.ad' },
    { name: 'MX Player Pro', package: 'com.mxtech.videoplayer.pro' },
    { name: 'Just Player', package: 'com.brouken.player' },
    { name: 'mpv', package: 'is.xyz.mpv' },
    { name: 'Nova Player', package: 'org.courville.nova' },
  ],
  ios: [
    { name: 'VLC', scheme: 'vlc-x-callback' },
    { name: 'Infuse', scheme: 'infuse' },
    { name: 'nPlayer', scheme: 'nplayer-' },
  ],
} as const;

export async function openInExternalPlayer(
  videoUrl: string,
  options?: ExternalPlayerOptions
): Promise<boolean> {
  const { title, position, mimeType = 'video/*' } = options ?? {};

  try {
    if (Platform.OS === 'android') {
      return await openInExternalPlayerAndroid(videoUrl, { title, position, mimeType });
    } else if (Platform.OS === 'ios') {
      return await openInExternalPlayerIOS(videoUrl, { title, position });
    } else {
      Alert.alert('Not Supported', 'External player is not supported on this platform.');
      return false;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Alert.alert('Error', `Failed to open external player: ${message}`);
    return false;
  }
}

async function openInExternalPlayerAndroid(
  videoUrl: string,
  options: { title?: string; position?: number; mimeType: string }
): Promise<boolean> {
  const { title, position, mimeType } = options;

  try {
    const extra: Record<string, any> = {};

    if (title) {
      extra.title = title;
      extra.from_start = false;
    }

    if (position !== undefined && position > 0) {
      extra.position = position;
    }

    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: videoUrl,
      type: mimeType,
      flags: 0x10000000,
      extra,
    });

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.toLowerCase().includes('no activity found') || message.toLowerCase().includes('no app')) {
      Alert.alert(
        'No Video Player Found',
        'No external video player app was found. Please install VLC, MX Player, or another video player app.',
        [{ text: 'OK' }]
      );
    } else {
      throw error;
    }
    return false;
  }
}

async function openInExternalPlayerIOS(
  videoUrl: string,
  options: { title?: string; position?: number }
): Promise<boolean> {
  const { title, position } = options;

  const vlcUrl = buildVLCUrl(videoUrl, { title, position });
  const canOpenVLC = await Linking.canOpenURL('vlc-x-callback://');

  if (canOpenVLC) {
    await Linking.openURL(vlcUrl);
    return true;
  }

  const canOpenInfuse = await Linking.canOpenURL('infuse://');
  if (canOpenInfuse) {
    const infuseUrl = `infuse://x-callback-url/play?url=${encodeURIComponent(videoUrl)}`;
    await Linking.openURL(infuseUrl);
    return true;
  }

  const scheme = videoUrl.startsWith('https') ? 'nplayer-https://' : 'nplayer-http://';
  const canOpenNPlayer = await Linking.canOpenURL(scheme);
  if (canOpenNPlayer) {
    const nPlayerUrl = videoUrl.replace(/^https?:\/\//, scheme);
    await Linking.openURL(nPlayerUrl);
    return true;
  }

  Alert.alert(
    'No External Player Found',
    'No compatible video player app was found. Please install VLC for iOS from the App Store.',
    [{ text: 'OK' }]
  );

  return false;
}

function buildVLCUrl(
  videoUrl: string,
  options: { title?: string; position?: number }
): string {
  const { title, position } = options;
  const params = new URLSearchParams();
  params.set('url', videoUrl);

  if (title) {
    params.set('title', title);
  }

  if (position !== undefined && position > 0) {
    params.set('position', Math.floor(position / 1000).toString());
  }

  return `vlc-x-callback://x-callback-url/stream?${params.toString()}`;
}

export async function getAvailableExternalPlayers(): Promise<string[]> {
  const availablePlayers: string[] = [];

  if (Platform.OS === 'ios') {
    const canOpenVLC = await Linking.canOpenURL('vlc-x-callback://');
    if (canOpenVLC) {
      availablePlayers.push('VLC');
    }

    const canOpenInfuse = await Linking.canOpenURL('infuse://');
    if (canOpenInfuse) {
      availablePlayers.push('Infuse');
    }

    const canOpenNPlayer = await Linking.canOpenURL('nplayer-http://');
    if (canOpenNPlayer) {
      availablePlayers.push('nPlayer');
    }
  } else if (Platform.OS === 'android') {
    availablePlayers.push('External Apps');
  }

  return availablePlayers;
}

export async function hasExternalPlayerSupport(): Promise<boolean> {
  if (Platform.OS === 'android') {
    return true;
  }

  if (Platform.OS === 'ios') {
    const canOpenVLC = await Linking.canOpenURL('vlc-x-callback://');
    if (canOpenVLC) return true;

    const canOpenInfuse = await Linking.canOpenURL('infuse://');
    if (canOpenInfuse) return true;

    const canOpenNPlayer = await Linking.canOpenURL('nplayer-http://');
    if (canOpenNPlayer) return true;

    return false;
  }

  return false;
}
