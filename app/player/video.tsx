import { useLocalSearchParams } from 'expo-router';
import { useVideoPlayerCore } from '@/hooks';
import { MobileVideoPlayer } from '@/components/mobile/player';
import { TVVideoPlayer } from '@/components/tv/player';
import { DesktopVideoPlayer } from '@/components/desktop/player';
import { isTV, isDesktop } from '@/utils/platform';

export default function VideoPlayerScreen() {
  const { itemId, from } = useLocalSearchParams<{ itemId: string; from?: string }>();
  const core = useVideoPlayerCore({ itemId, from });

  if (isTV) {
    return <TVVideoPlayer core={core} />;
  }

  if (isDesktop) {
    return <DesktopVideoPlayer core={core} />;
  }

  return <MobileVideoPlayer core={core} />;
}
