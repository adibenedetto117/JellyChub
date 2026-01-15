import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { RadarrCalendarMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { MovieCard } from './MovieCard';

interface DayMoviesModalProps {
  visible: boolean;
  date: Date | null;
  movies: RadarrCalendarMovie[];
  onClose: () => void;
  onMoviePress: (movie: RadarrCalendarMovie) => void;
}

export function DayMoviesModal({
  visible,
  date,
  movies,
  onClose,
  onMoviePress,
}: DayMoviesModalProps) {
  if (!date) return null;

  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.dayModalOverlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.dayModalContent}
        >
          <View style={styles.dayModalHeader}>
            <Text style={styles.dayModalTitle}>{formattedDate}</Text>
            <Pressable onPress={onClose} style={styles.dayModalClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </Pressable>
          </View>
          <ScrollView
            style={styles.dayModalScroll}
            showsVerticalScrollIndicator={false}
          >
            {movies.length === 0 ? (
              <View style={styles.noMovies}>
                <Ionicons name="film-outline" size={48} color={colors.text.muted} />
                <Text style={styles.noMoviesText}>No movies</Text>
              </View>
            ) : (
              movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onMoviePress(movie), 300);
                  }}
                />
              ))
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dayModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  dayModalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '70%',
  },
  dayModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  dayModalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dayModalClose: {
    padding: spacing[2],
  },
  dayModalScroll: {
    padding: spacing[4],
  },
  noMovies: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    gap: spacing[3],
  },
  noMoviesText: {
    color: colors.text.muted,
    fontSize: 14,
  },
});
