import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { SonarrLookupResult, SonarrSeries } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';

const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'] as const;

export interface SearchResultCardProps {
  result: SonarrLookupResult;
  onAdd: (result: SonarrLookupResult) => void;
  existingSeries?: SonarrSeries;
  index: number;
}

export function SearchResultCard({ result, onAdd, existingSeries, index }: SearchResultCardProps) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={styles.searchCard}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.searchPoster} contentFit="cover" />
        ) : (
          <View style={[styles.searchPoster, styles.noPoster]}>
            <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
          </View>
        )}
        <View style={styles.searchInfo}>
          <Text style={styles.searchTitle} numberOfLines={2}>{result.title}</Text>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchSubtitle}>{result.year}</Text>
            {result.seasons && (
              <>
                <View style={styles.metaDot} />
                <Text style={styles.searchSubtitle}>{result.seasons.length} Seasons</Text>
              </>
            )}
          </View>
          {result.network && (
            <View style={styles.networkBadge}>
              <Text style={styles.networkBadgeText}>{result.network}</Text>
            </View>
          )}
          {result.overview && (
            <Text style={styles.searchOverview} numberOfLines={2}>{result.overview}</Text>
          )}
          {result.ratings?.value > 0 && (
            <View style={styles.searchRating}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.searchRatingText}>{result.ratings.value.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {existingSeries ? (
          <View style={styles.addedBadge}>
            <LinearGradient colors={[colors.status.success, '#15803d']} style={styles.addedGradient}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </LinearGradient>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => onAdd(result)}
          >
            <LinearGradient colors={SONARR_GRADIENT} style={styles.addButtonGradient}>
              <Ionicons name="add" size={24} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchCard: {
    flexDirection: 'row',
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  searchPoster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.elevated,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  searchInfo: {
    flex: 1,
  },
  searchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  searchMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  searchSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[2],
  },
  networkBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  networkBadgeText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  searchOverview: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: spacing[2],
    lineHeight: 18,
  },
  searchRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  searchRatingText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '600',
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addedBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  addedGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
