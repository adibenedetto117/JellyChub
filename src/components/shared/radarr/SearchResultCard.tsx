import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { RadarrLookupResult, RadarrMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';

const RADARR_ORANGE = '#ffc230';

interface SearchResultCardProps {
  result: RadarrLookupResult;
  onAdd: () => void;
  existingMovie?: RadarrMovie;
}

export const SearchResultCard = memo(function SearchResultCard({
  result,
  onAdd,
  existingMovie,
}: SearchResultCardProps) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;
  const rating = result.ratings?.tmdb?.value || result.ratings?.imdb?.value || 0;

  return (
    <View style={styles.searchCard}>
      <View style={styles.searchPosterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.searchPoster} contentFit="cover" />
        ) : (
          <View style={[styles.searchPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={24} color={colors.text.muted} />
          </View>
        )}
      </View>
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{result.title}</Text>
        <View style={styles.searchMeta}>
          <Text style={styles.searchYear}>{result.year}</Text>
          {result.runtime > 0 && <Text style={styles.searchRuntime}>{result.runtime} min</Text>}
          {rating > 0 && (
            <View style={styles.searchRating}>
              <Ionicons name="star" size={10} color={RADARR_ORANGE} />
              <Text style={styles.searchRatingText}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        {result.overview && (
          <Text style={styles.searchOverview} numberOfLines={2}>{result.overview}</Text>
        )}
        {result.genres.length > 0 && (
          <View style={styles.genreRow}>
            {result.genres.slice(0, 2).map((g) => (
              <View key={g} style={styles.genreChip}>
                <Text style={styles.genreText}>{g}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {existingMovie ? (
        <View style={styles.inLibraryIcon}>
          <Ionicons name="checkmark-circle" size={28} color={colors.status.success} />
        </View>
      ) : (
        <Pressable style={styles.addButton} onPress={onAdd}>
          <Ionicons name="add" size={24} color="#000" />
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  searchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    gap: spacing[3],
  },
  searchPosterContainer: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  searchPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.md,
  },
  noPoster: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  searchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  searchYear: {
    fontSize: 13,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  searchRuntime: {
    fontSize: 12,
    color: colors.text.muted,
  },
  searchRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  searchRatingText: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  searchOverview: {
    fontSize: 11,
    color: colors.text.secondary,
    lineHeight: 16,
    marginTop: spacing[1.5],
  },
  genreRow: {
    flexDirection: 'row',
    gap: spacing[1],
    marginTop: spacing[1.5],
  },
  genreChip: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[1.5],
    paddingVertical: 2,
    borderRadius: 4,
  },
  genreText: {
    fontSize: 9,
    color: colors.text.muted,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: RADARR_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  inLibraryIcon: {
    alignSelf: 'center',
  },
});
