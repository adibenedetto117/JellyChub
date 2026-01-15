import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { JellyseerrPosterCard } from '@/components/shared/jellyseerr';
import { Skeleton } from '@/components/shared/ui/Skeleton';
import type { JellyseerrDiscoverItem } from '@/types/jellyseerr';

interface MediaRowProps {
  title: string;
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  isLoading?: boolean;
  delay?: number;
}

export function MediaRow({ title, items, onItemPress, isLoading, delay = 0 }: MediaRowProps) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ marginRight: 12 }}>
              <Skeleton width={130} height={195} borderRadius={12} />
            </View>
          ))
        ) : (
          items.slice(0, 15).map((item) => (
            <JellyseerrPosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={() => onItemPress(item)}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
});
