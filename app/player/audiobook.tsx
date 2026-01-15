import { useAudiobookPlayerCore } from '@/hooks';
import { MobileAudiobookPlayer } from '@/components/mobile/player';
import { TVAudiobookPlayer } from '@/components/tv/player';
import { DesktopAudiobookPlayer } from '@/components/desktop/player';
import { isTV, isDesktop } from '@/utils/platform';

export default function AudiobookPlayerScreen() {
  const core = useAudiobookPlayerCore();

  if (isTV) {
    return <TVAudiobookPlayer core={core} />;
  }

  if (isDesktop) {
    return <DesktopAudiobookPlayer core={core} />;
  }

  return <MobileAudiobookPlayer core={core} />;
}
