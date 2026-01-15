import { isTV, isDesktop } from '@/utils/platform';
import { MobileDetailScreen } from '@/components/mobile/details';
import { TVDetailScreen } from '@/components/tv/details';
import { DesktopDetailScreen } from '@/components/desktop/details';

export default function DetailScreen() {
  if (isTV) {
    return <TVDetailScreen />;
  }

  if (isDesktop) {
    return <DesktopDetailScreen />;
  }

  return <MobileDetailScreen />;
}
