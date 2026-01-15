import { useLocalSearchParams } from 'expo-router';
import { useComicReaderCore } from '@/hooks';
import { MobileComicReader } from '@/components/mobile/reader';
import { TVComicReader } from '@/components/tv/reader';
import { DesktopComicReader } from '@/components/desktop/reader';
import { isTV, isDesktop } from '@/utils/platform';

export default function ComicReaderScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const core = useComicReaderCore({ itemId });

  if (isTV) {
    return <TVComicReader core={core} />;
  }

  if (isDesktop) {
    return <DesktopComicReader core={core} />;
  }

  return <MobileComicReader core={core} />;
}
