import { memo } from 'react';
import { PosterCard } from '@/components/shared/media';
import type { BaseItem } from '@/types/jellyfin';

interface Props {
  item: BaseItem;
  onPress: () => void;
  variant?: 'poster' | 'square' | 'backdrop';
  showProgress?: boolean;
  showTitle?: boolean;
  size?: 'small' | 'medium' | 'large';
  customWidth?: number;
  customHeight?: number;
}

export const MobilePosterCard = memo(function MobilePosterCard({
  item,
  onPress,
  variant = 'poster',
  showProgress = true,
  showTitle = true,
  size = 'medium',
  customWidth,
  customHeight,
}: Props) {
  return (
    <PosterCard
      item={item}
      onPress={onPress}
      variant={variant}
      showProgress={showProgress}
      showTitle={showTitle}
      size={size}
      customWidth={customWidth}
      customHeight={customHeight}
    />
  );
});
