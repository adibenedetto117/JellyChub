import { isTV, isDesktop } from '@/utils/platform';
import { MobileHomeScreen } from '@/components/mobile/home';
import { TVHomeScreen } from '@/components/tv/home';
import { DesktopHomeScreen } from '@/components/desktop/home';

export default function HomeScreen() {
  if (isTV) {
    return <TVHomeScreen />;
  }

  if (isDesktop) {
    return <DesktopHomeScreen />;
  }

  return <MobileHomeScreen />;
}
