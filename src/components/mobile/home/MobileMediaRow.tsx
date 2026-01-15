import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { MediaRow } from '@/components/shared/media';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  title: string;
  items: BaseItem[];
  onItemPress: (item: BaseItem) => void;
  onSeeAllPress?: () => void;
  variant?: 'poster' | 'square' | 'backdrop';
  showProgress?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export const MobileMediaRow = memo(function MobileMediaRow({
  title,
  items,
  onItemPress,
  onSeeAllPress,
  variant = 'poster',
  showProgress = true,
  icon,
}: Props) {
  return (
    <MediaRow
      title={title}
      items={items}
      onItemPress={onItemPress}
      onSeeAllPress={onSeeAllPress}
      variant={variant}
      showProgress={showProgress}
      icon={icon}
    />
  );
});
