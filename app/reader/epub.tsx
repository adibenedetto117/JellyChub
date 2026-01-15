import { useLocalSearchParams } from 'expo-router';
import { useEpubReaderCore } from '@/hooks';
import { MobileEpubReader } from '@/components/mobile/reader';
import { TVEpubReader } from '@/components/tv/reader';
import { DesktopEpubReader } from '@/components/desktop/reader';
import { isTV, isDesktop } from '@/utils/platform';

export default function EpubReaderScreen() {
  const { itemId, cfi } = useLocalSearchParams<{ itemId: string; cfi?: string }>();
  const core = useEpubReaderCore({ itemId, startCfi: cfi });

  if (isTV) {
    return <TVEpubReader core={core} />;
  }

  if (isDesktop) {
    return <DesktopEpubReader core={core} />;
  }

  return <MobileEpubReader core={core} />;
}
