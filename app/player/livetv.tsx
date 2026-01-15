import { useLiveTvPlayerCore } from '@/hooks';
import { MobileLiveTvPlayer } from '@/components/mobile/player';
import { TVLiveTvPlayer } from '@/components/tv/player';
import { DesktopLiveTvPlayer } from '@/components/desktop/player';
import { isTV, isDesktop } from '@/utils/platform';

export default function LiveTvPlayerScreen() {
  const core = useLiveTvPlayerCore();

  if (isTV) {
    return <TVLiveTvPlayer core={core} />;
  }

  if (isDesktop) {
    return <DesktopLiveTvPlayer core={core} />;
  }

  return <MobileLiveTvPlayer core={core} />;
}
