import { memo } from 'react';
import { ContinueWatching } from '@/components/shared/media';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onPlayPress?: (item: BaseItem) => void;
}

export const MobileContinueWatchingRow = memo(function MobileContinueWatchingRow({
  items,
  onItemPress,
  onPlayPress,
}: Props) {
  return (
    <ContinueWatching
      items={items}
      onItemPress={onItemPress}
      onPlayPress={onPlayPress}
    />
  );
});
