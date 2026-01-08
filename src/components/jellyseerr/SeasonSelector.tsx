import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { memo, useState, useCallback } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import type { JellyseerrSeason } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (seasonNumbers: number[]) => void;
  seasons: JellyseerrSeason[];
  isLoading?: boolean;
}

function SeasonItem({
  season,
  isSelected,
  onToggle,
  delay,
}: {
  season: JellyseerrSeason;
  isSelected: boolean;
  onToggle: () => void;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(200)}>
      <Pressable onPress={onToggle} style={styles.seasonItem}>
        <View style={styles.seasonInfo}>
          <Text style={styles.seasonName}>{season.name}</Text>
          <View style={styles.seasonMeta}>
            <Ionicons name="play-circle-outline" size={12} color={colors.text.tertiary} />
            <Text style={styles.seasonEpisodes}>{season.episodeCount} episodes</Text>
          </View>
        </View>

        <Pressable onPress={onToggle}>
          {isSelected ? (
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.checkbox}
            >
              <Ionicons name="checkmark" size={14} color="#fff" />
            </LinearGradient>
          ) : (
            <View style={styles.checkboxEmpty} />
          )}
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

export const SeasonSelector = memo(function SeasonSelector({
  visible,
  onClose,
  onConfirm,
  seasons,
  isLoading = false,
}: Props) {
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const insets = useSafeAreaInsets();

  const validSeasons = seasons.filter((s) => s.seasonNumber > 0);

  const toggleSeason = useCallback((seasonNumber: number) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonNumber)
        ? prev.filter((n) => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSeasons(validSeasons.map((s) => s.seasonNumber));
  }, [validSeasons]);

  const clearAll = useCallback(() => {
    setSelectedSeasons([]);
  }, []);

  const handleConfirm = () => {
    onConfirm(selectedSeasons);
    setSelectedSeasons([]);
  };

  const handleClose = () => {
    setSelectedSeasons([]);
    onClose();
  };

  const allSelected = selectedSeasons.length === validSeasons.length;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <View style={styles.backdropOverlay} />
      </Pressable>

      <View style={[styles.modalContainer, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        <Animated.View entering={FadeIn.duration(300)} style={styles.modal}>
          <LinearGradient
            colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
            style={styles.modalGradient}
          />

          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerIcon}>
                <LinearGradient
                  colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                  style={styles.headerIconGradient}
                >
                  <Ionicons name="layers" size={18} color="#fff" />
                </LinearGradient>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>Select Seasons</Text>
                <Text style={styles.headerSubtitle}>Choose which seasons to request</Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text.tertiary} />
              </Pressable>
            </View>

            <View style={styles.quickActions}>
              <Pressable
                onPress={allSelected ? clearAll : selectAll}
                style={[styles.quickActionButton, allSelected && styles.quickActionButtonActive]}
              >
                <Ionicons
                  name={allSelected ? 'checkbox' : 'checkbox-outline'}
                  size={16}
                  color={allSelected ? JELLYSEERR_PURPLE : colors.text.secondary}
                />
                <Text
                  style={[styles.quickActionText, allSelected && styles.quickActionTextActive]}
                >
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Text>
              </Pressable>

              {selectedSeasons.length > 0 && !allSelected && (
                <View style={styles.selectedCount}>
                  <Text style={styles.selectedCountText}>
                    {selectedSeasons.length} selected
                  </Text>
                </View>
              )}
            </View>
          </View>

          <ScrollView
            style={styles.seasonsList}
            contentContainerStyle={styles.seasonsContent}
            showsVerticalScrollIndicator={false}
          >
            {validSeasons.map((season, index) => (
              <SeasonItem
                key={season.id}
                season={season}
                isSelected={selectedSeasons.includes(season.seasonNumber)}
                onToggle={() => toggleSeason(season.seasonNumber)}
                delay={index * 30}
              />
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable onPress={handleClose} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={selectedSeasons.length === 0 || isLoading}
              style={{ flex: 1 }}
            >
              <LinearGradient
                colors={
                  selectedSeasons.length === 0
                    ? ['#4b5563', '#374151']
                    : [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]
                }
                style={[
                  styles.confirmButton,
                  selectedSeasons.length === 0 && styles.confirmButtonDisabled,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {isLoading ? (
                  <Text style={styles.confirmButtonText}>Requesting...</Text>
                ) : (
                  <>
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>
                      Request{selectedSeasons.length > 0 ? ` (${selectedSeasons.length})` : ''}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  modal: {
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 14,
  },
  headerIconGradient: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 12,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface.default,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  quickActionButtonActive: {
    backgroundColor: `${JELLYSEERR_PURPLE}15`,
    borderColor: `${JELLYSEERR_PURPLE}30`,
  },
  quickActionText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickActionTextActive: {
    color: JELLYSEERR_PURPLE,
  },
  selectedCount: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  selectedCountText: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  seasonsList: {
    maxHeight: 320,
  },
  seasonsContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  seasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface.default,
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  seasonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  seasonEpisodes: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  cancelButton: {
    flex: 0.4,
    backgroundColor: colors.surface.elevated,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
