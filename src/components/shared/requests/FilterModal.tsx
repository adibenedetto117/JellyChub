import { View, Text, ScrollView, Pressable, Modal, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/theme';
import { JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK } from './constants';
import { COMMON_GENRES } from '@/types/jellyseerr';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  hideAvailable: boolean;
  setHideAvailable: (value: boolean) => void;
  hideProcessing: boolean;
  setHideProcessing: (value: boolean) => void;
  hidePartial: boolean;
  setHidePartial: (value: boolean) => void;
  genreFilter: number[];
  toggleGenre: (id: number) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  ratingSource: 'tmdb' | 'imdb' | 'any';
  setRatingSource: (value: 'tmdb' | 'imdb' | 'any') => void;
  yearFilter: number | null;
  setYearFilter: (value: number | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterModal({
  visible,
  onClose,
  hideAvailable,
  setHideAvailable,
  hideProcessing,
  setHideProcessing,
  hidePartial,
  setHidePartial,
  genreFilter,
  toggleGenre,
  minRating,
  setMinRating,
  ratingSource,
  setRatingSource,
  yearFilter,
  setYearFilter,
  clearFilters,
  hasActiveFilters,
}: FilterModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.filterModalContent}>
          <View style={styles.filterModalHeader}>
            <Text style={styles.filterModalTitle}>Filters</Text>
            <View style={styles.filterModalActions}>
              {hasActiveFilters && (
                <Pressable onPress={clearFilters} style={styles.clearAllButton}>
                  <Text style={styles.clearAllText}>Clear All</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.closeModalButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.filterModalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.filterModalSection}>
              <Text style={styles.filterModalLabel}>Genres</Text>
              <View style={styles.filterModalChipGrid}>
                {COMMON_GENRES.map((genre) => {
                  const isActive = genreFilter.includes(genre.id);
                  return (
                    <Pressable
                      key={genre.id}
                      onPress={() => toggleGenre(genre.id)}
                      style={[styles.filterModalChip, isActive && styles.filterModalChipActive]}
                    >
                      <Ionicons
                        name={genre.icon as any}
                        size={16}
                        color={isActive ? '#fff' : colors.text.muted}
                      />
                      <Text style={[styles.filterModalChipText, isActive && styles.filterModalChipTextActive]}>
                        {genre.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterModalSection}>
              <View style={styles.filterModalLabelRow}>
                <Text style={styles.filterModalLabel}>Minimum Rating</Text>
                <Text style={styles.ratingValue}>
                  {minRating === 0 ? 'Any' : `${minRating.toFixed(1)}+`}
                </Text>
              </View>

              <View style={styles.ratingSourceRow}>
                {(['tmdb', 'imdb', 'any'] as const).map((source) => (
                  <Pressable
                    key={source}
                    onPress={() => setRatingSource(source)}
                    style={[styles.ratingSourceChip, ratingSource === source && styles.ratingSourceChipActive]}
                  >
                    <Text style={[styles.ratingSourceText, ratingSource === source && styles.ratingSourceTextActive]}>
                      {source === 'tmdb' ? 'TMDB' : source === 'imdb' ? 'IMDb' : 'Any'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>0</Text>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={9}
                  step={0.5}
                  value={minRating}
                  onValueChange={setMinRating}
                  minimumTrackTintColor={JELLYSEERR_PURPLE}
                  maximumTrackTintColor={colors.surface.elevated}
                  thumbTintColor={JELLYSEERR_PURPLE}
                />
                <Text style={styles.sliderLabel}>9</Text>
              </View>
            </View>

            <View style={styles.filterModalSection}>
              <Text style={styles.filterModalLabel}>Release Year</Text>
              <View style={styles.yearGrid}>
                <Pressable
                  onPress={() => setYearFilter(null)}
                  style={[styles.yearGridChip, yearFilter === null && styles.yearGridChipActive]}
                >
                  <Text style={[styles.yearGridText, yearFilter === null && styles.yearGridTextActive]}>Any</Text>
                </Pressable>
                {[2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018].map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => setYearFilter(year)}
                    style={[styles.yearGridChip, yearFilter === year && styles.yearGridChipActive]}
                  >
                    <Text style={[styles.yearGridText, yearFilter === year && styles.yearGridTextActive]}>{year}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.filterModalSection}>
              <Text style={styles.filterModalLabel}>Hide by Status</Text>
              <View style={styles.statusGrid}>
                <Pressable
                  onPress={() => setHideAvailable(!hideAvailable)}
                  style={[styles.statusGridChip, hideAvailable && styles.statusGridChipActive]}
                >
                  <Ionicons name="checkmark-circle" size={18} color={hideAvailable ? '#fff' : '#22c55e'} />
                  <Text style={[styles.statusGridText, hideAvailable && styles.statusGridTextActive]}>Available</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHidePartial(!hidePartial)}
                  style={[styles.statusGridChip, hidePartial && styles.statusGridChipActive]}
                >
                  <Ionicons name="pie-chart" size={18} color={hidePartial ? '#fff' : '#f59e0b'} />
                  <Text style={[styles.statusGridText, hidePartial && styles.statusGridTextActive]}>Partial</Text>
                </Pressable>
                <Pressable
                  onPress={() => setHideProcessing(!hideProcessing)}
                  style={[styles.statusGridChip, hideProcessing && styles.statusGridChipActive]}
                >
                  <Ionicons name="hourglass" size={18} color={hideProcessing ? '#fff' : '#3b82f6'} />
                  <Text style={[styles.statusGridText, hideProcessing && styles.statusGridTextActive]}>Processing</Text>
                </Pressable>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>

          <Pressable onPress={onClose} style={styles.applyFiltersButton}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.applyFiltersGradient}
            >
              <Text style={styles.applyFiltersText}>Apply Filters</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  filterModalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  filterModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  filterModalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: `${JELLYSEERR_PURPLE}20`,
  },
  clearAllText: {
    color: JELLYSEERR_PURPLE,
    fontSize: 13,
    fontWeight: '600',
  },
  closeModalButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterModalScroll: {
    paddingHorizontal: 20,
  },
  filterModalSection: {
    marginTop: 20,
  },
  filterModalLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterModalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ratingValue: {
    color: JELLYSEERR_PURPLE,
    fontSize: 15,
    fontWeight: '700',
  },
  filterModalChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterModalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterModalChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  filterModalChipText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterModalChipTextActive: {
    color: '#fff',
  },
  ratingSourceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  ratingSourceChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  ratingSourceChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  ratingSourceText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  ratingSourceTextActive: {
    color: '#fff',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    width: 20,
    textAlign: 'center',
  },
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearGridChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  yearGridChipActive: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  yearGridText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  yearGridTextActive: {
    color: '#fff',
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statusGridChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statusGridChipActive: {
    backgroundColor: colors.text.tertiary,
    borderColor: colors.text.tertiary,
  },
  statusGridText: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  statusGridTextActive: {
    color: '#fff',
  },
  applyFiltersButton: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  applyFiltersGradient: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
