import { useLocalSearchParams } from 'expo-router';
import { usePdfReaderCore } from '@/hooks';
import { MobilePdfReader } from '@/components/mobile/reader';
import { TVPdfReader } from '@/components/tv/reader';
import { DesktopPdfReader } from '@/components/desktop/reader';
import { isTV, isDesktop } from '@/utils/platform';

export default function PdfReaderScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const core = usePdfReaderCore({ itemId });

  if (isTV) {
    return <TVPdfReader core={core} />;
  }

  if (isDesktop) {
    return <DesktopPdfReader core={core} />;
  }

  return <MobilePdfReader core={core} />;
}
