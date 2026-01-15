import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { RADARR_ORANGE, RADARR_GRADIENT } from './constants';
import { getStatusColor, getStatusText, getReleaseType } from './utils';

interface MovieDetailModalProps {
  visible: boolean;
  movie: RadarrCalendarMovie | null;
  onClose: () => void;
  onSearch: () => void;
  isSearching: boolean;
}

export function MovieDetailModal({
  visible,
  movie,
  onClose,
  onSearch,
  isSearching,
}: MovieDetailModalProps) {
  if (!movie) return null;

  const poster = movie.images?.find((i) => i.coverType === 'poster');
  const fanart = movie.images?.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const statusColor = getStatusColor(movie);
  const statusText = getStatusText(movie);
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const releaseDate = movie.digitalRelease || movie.physicalRelease || movie.inCinemas;
  const formattedReleaseDate = releaseDate
    ? new Date(releaseDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.modalContent}
        >
          {fanartUrl && (
            <Image
              source={{ uri: fanartUrl }}
              style={styles.modalBackdrop}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.95)', colors.background.secondary]}
            style={styles.modalGradient}
          />

          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <BlurView intensity={30} style={styles.blurButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </BlurView>
            </Pressable>
          </View>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            <View style={styles.modalTop}>
              {posterUrl && (
                <View style={styles.modalPosterContainer}>
                  <Image
                    source={{ uri: posterUrl }}
                    style={styles.modalPoster}
                    contentFit="cover"
                  />
                </View>
              )}
              <View style={styles.modalTitleSection}>
                <Text style={styles.modalMovieTitle}>{movie.title}</Text>
                <View style={styles.modalYearBadge}>
                  <Text style={styles.modalYearBadgeText}>{movie.year}</Text>
                </View>
                {movie.runtime > 0 && (
                  <Text style={styles.modalRuntime}>{movie.runtime} min</Text>
                )}
                {rating > 0 && (
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={14} color={RADARR_ORANGE} />
                    <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
                  </View>
                )}

                <View style={styles.modalReleaseInfo}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                  <Text style={styles.modalReleaseText}>
                    {getReleaseType(movie)}: {formattedReleaseDate}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusCardDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusCardText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {movie.overview && (
              <View style={styles.overviewSection}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overviewText}>{movie.overview}</Text>
              </View>
            )}

            {movie.genres.length > 0 && (
              <View style={styles.genresSection}>
                <Text style={styles.sectionTitle}>Genres</Text>
                <View style={styles.genresList}>
                  {movie.genres.map((genre) => (
                    <View key={genre} style={styles.genreChip}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!movie.hasFile && movie.monitored && (
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={onSearch}
                disabled={isSearching}
              >
                <LinearGradient colors={RADARR_GRADIENT} style={styles.searchButtonGradient}>
                  {isSearching ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#000" />
                      <Text style={styles.searchButtonText}>Search Movie</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 250,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: spacing[4],
  },
  closeButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing[4],
    paddingTop: 0,
    paddingBottom: spacing[8],
  },
  modalTop: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  modalPosterContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  modalPoster: {
    width: 100,
    height: 150,
  },
  modalTitleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  modalMovieTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalYearBadge: {
    backgroundColor: RADARR_ORANGE,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  modalYearBadgeText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '700',
  },
  modalRuntime: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: spacing[2],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
  },
  ratingText: {
    color: RADARR_ORANGE,
    fontSize: 14,
    fontWeight: '600',
  },
  modalReleaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  modalReleaseText: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  statusCardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusCardText: {
    fontSize: 15,
    fontWeight: '600',
  },
  overviewSection: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  overviewText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 22,
  },
  genresSection: {
    marginBottom: spacing[4],
  },
  genresList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  genreChip: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
  },
  genreText: {
    color: colors.text.secondary,
    fontSize: 12,
  },
  searchButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginTop: spacing[2],
  },
  searchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[4],
  },
  searchButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
