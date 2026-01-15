import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface RatingsSectionProps {
  criticsScore?: number;
  criticsRating?: string;
  audienceScore?: number;
  audienceRating?: string;
  voteAverage: number;
  voteCount?: number;
  delay?: number;
}

export const RatingsSection = memo(function RatingsSection({
  criticsScore,
  criticsRating,
  audienceScore,
  audienceRating,
  voteAverage,
  voteCount,
  delay = 225,
}: RatingsSectionProps) {
  if (criticsScore === undefined && audienceScore === undefined && voteAverage <= 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>Ratings</Text>
      <View style={styles.row}>
        {criticsScore !== undefined && (
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: criticsRating === 'Rotten' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)' }]}>
              <Ionicons name="newspaper" size={20} color={criticsRating === 'Rotten' ? '#ef4444' : '#22c55e'} />
            </View>
            <Text style={styles.value}>{criticsScore}%</Text>
            <Text style={styles.label}>Critics</Text>
            {criticsRating && (
              <Text style={[styles.subLabel, { color: criticsRating === 'Rotten' ? '#ef4444' : '#22c55e' }]}>
                {criticsRating}
              </Text>
            )}
          </View>
        )}
        {audienceScore !== undefined && (
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: audienceRating === 'Spilled' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(251, 191, 36, 0.15)' }]}>
              <Ionicons name="people" size={20} color={audienceRating === 'Spilled' ? '#ef4444' : '#fbbf24'} />
            </View>
            <Text style={styles.value}>{audienceScore}%</Text>
            <Text style={styles.label}>Audience</Text>
            {audienceRating && (
              <Text style={[styles.subLabel, { color: audienceRating === 'Spilled' ? '#ef4444' : '#22c55e' }]}>
                {audienceRating}
              </Text>
            )}
          </View>
        )}
        {voteAverage > 0 && (
          <View style={styles.card}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="film" size={20} color="#6366f1" />
            </View>
            <Text style={styles.value}>{voteAverage.toFixed(1)}</Text>
            <Text style={styles.label}>TMDB</Text>
            {voteCount !== undefined && (
              <Text style={styles.subLabel}>{voteCount.toLocaleString()} votes</Text>
            )}
          </View>
        )}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  value: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  label: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  subLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 2,
  },
});
