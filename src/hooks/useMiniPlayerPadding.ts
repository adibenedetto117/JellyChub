import { usePlayerStore } from '@/stores';

const MINI_PLAYER_HEIGHT = 56;

export function useMiniPlayerPadding(): number {
  const currentItem = usePlayerStore((state) => state.currentItem);
  const mediaType = usePlayerStore((state) => state.mediaType);

  const isMiniPlayerVisible = currentItem && (mediaType === 'audio' || mediaType === 'audiobook');

  return isMiniPlayerVisible ? MINI_PLAYER_HEIGHT + 8 : 0;
}
