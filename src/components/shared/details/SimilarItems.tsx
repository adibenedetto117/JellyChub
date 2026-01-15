import { View } from 'react-native';
import { MediaRow } from '@/components/shared/media';
import type { BaseItem } from '@/types/jellyfin';

interface SimilarItemsProps {
  items: { Items: BaseItem[] } | undefined;
  onItemPress: (item: BaseItem) => void;
  t: (key: string) => string;
}

export function SimilarItems({ items, onItemPress, t }: SimilarItemsProps) {
  if (!items || items.Items.length === 0) {
    return null;
  }

  return (
    <View className="mt-6">
      <MediaRow
        title={t('details.similar')}
        items={items.Items}
        onItemPress={onItemPress}
      />
    </View>
  );
}
