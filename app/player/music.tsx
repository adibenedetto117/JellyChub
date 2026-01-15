import { useMusicPlayerCore } from '@/hooks';
import { MobileMusicPlayer } from '@/components/mobile/player';
import { TVMusicPlayer } from '@/components/tv/player';
import { DesktopMusicPlayer } from '@/components/desktop/player';
import { isTV, isDesktop } from '@/utils/platform';

export default function MusicPlayerScreen() {
  const core = useMusicPlayerCore();

  if (isTV) {
    return <TVMusicPlayer core={core} />;
  }

  if (isDesktop) {
    return <DesktopMusicPlayer core={core} />;
  }

  return <MobileMusicPlayer core={core} />;
}
