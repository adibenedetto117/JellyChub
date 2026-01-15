import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

const RADARR_ORANGE = '#ffc230';

interface StarRatingProps {
  rating: number;
  size?: number;
}

export function StarRating({ rating, size = 12 }: StarRatingProps) {
  const stars = Math.round(rating / 2);
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= stars ? 'star' : 'star-outline'}
          size={size}
          color={star <= stars ? RADARR_ORANGE : colors.text.muted}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: colors.text.secondary,
    marginLeft: spacing[1],
  },
});
