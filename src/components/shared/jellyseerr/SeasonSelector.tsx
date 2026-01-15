import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { memo, useState, useCallback, useMemo, useEffect } from 'react';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import type { JellyseerrSeason, JellyseerrMedia, RequestStatus } from '@/types/jellyseerr';
import { REQUEST_STATUS } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

type SeasonStatusType = 'available' | 'requested' | 'processing' | 'not_requested' | 'declined';

interface SeasonWithStatus extends JellyseerrSeason {
  status: SeasonStatusType;
  requestStatus?: RequestStatus;
}

const statusConfig: Record<SeasonStatusType, { label: string; color: string; bgColor: string; icon: string }> = {
  available: {
    label: 'Available',
    color: '#22c55e',
    bgColor: 'rgba(34, 197, 94, 0.15)',
    icon: 'checkmark-circle',
  },
  requested: {
    label: 'Pending',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    icon: 'time',
  },
  processing: {
    label: 'Processing',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    icon: 'sync',
  },
  not_requested: {
    label: 'Not Requested',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.15)',
    icon: 'add-circle-outline',
  },
  declined: {
    label: 'Declined',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    icon: 'close-circle',
  },
};

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (seasonNumbers: number[]) => void;
  seasons: JellyseerrSeason[];
  mediaInfo?: JellyseerrMedia;
  isLoading?: boolean;
}

function SeasonItem({
  season,
  isSelected,
  onToggle,
  delay,
  isSelectable,
}: {
  season: SeasonWithStatus;
  isSelected: boolean;
  onToggle: () => void;
  delay: number;
  isSelectable: boolean;
}) {
  const config = statusConfig[season.status];
  const canSelect = isSelectable && (season.status === 'not_requested' || season.status === 'declined');

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(200)}>
      <Pressable
        onPress={canSelect ? onToggle : undefined}
        style={[
          styles.seasonItem,
          !canSelect && styles.seasonItemDisabled,
          isSelected && styles.seasonItemSelected,
        ]}
      >
        <View style={styles.seasonInfo}>
          <View style={styles.seasonNameRow}>
            <Text style={[styles.seasonName, !canSelect && styles.seasonNameDisabled]}>
              {season.name}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
              <Ionicons name={config.icon as any} size={10} color={config.color} />
              <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
            </View>
          </View>
          <View style={styles.seasonMeta}>
            <Ionicons name="play-circle-outline" size={12} color={colors.text.tertiary} />
            <Text style={styles.seasonEpisodes}>{season.episodeCount} episodes</Text>
          </View>
        </View>

        {canSelect && (
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
        )}
      </Pressable>
    </Animated.View>
  );
}

export const SeasonSelector = memo(function SeasonSelector({
  visible,
  onClose,
  onConfirm,
  seasons,
  mediaInfo,
  isLoading = false,
}: Props) {
  const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
  const insets = useSafeAreaInsets();

  const seasonsWithStatus = useMemo(() => {
    const validSeasons = seasons.filter((s) => s.seasonNumber > 0);
    const requests = mediaInfo?.requests || [];

    const requestedSeasons = new Map<number, { status: RequestStatus }>();

    requests.forEach((request) => {
      if (request.seasons) {
        request.seasons.forEach((seasonReq) => {
          const existing = requestedSeasons.get(seasonReq.seasonNumber);
          if (!existing || seasonReq.status > existing.status) {
            requestedSeasons.set(seasonReq.seasonNumber, { status: seasonReq.status });
          }
        });
      }
    });

    return validSeasons.map((season): SeasonWithStatus => {
      const requestInfo = requestedSeasons.get(season.seasonNumber);

      if (!requestInfo) {
        return {
          ...season,
          status: 'not_requested',
        };
      }

      let status: SeasonStatusType = 'not_requested';
      if (requestInfo.status === REQUEST_STATUS.AVAILABLE) {
        status = 'available';
      } else if (requestInfo.status === REQUEST_STATUS.APPROVED) {
        status = 'processing';
      } else if (requestInfo.status === REQUEST_STATUS.PENDING) {
        status = 'requested';
      } else if (requestInfo.status === REQUEST_STATUS.PARTIALLY_AVAILABLE) {
        status = 'processing';
      } else if (requestInfo.status === REQUEST_STATUS.DECLINED) {
        status = 'declined';
      }

      return {
        ...season,
        status,
        requestStatus: requestInfo.status,
      };
    });
  }, [seasons, mediaInfo]);

  const selectableSeasons = useMemo(() => {
    return seasonsWithStatus.filter(
      (s) => s.status === 'not_requested' || s.status === 'declined'
    );
  }, [seasonsWithStatus]);

  useEffect(() => {
    if (!visible) {
      setSelectedSeasons([]);
    }
  }, [visible]);

  const toggleSeason = useCallback((seasonNumber: number) => {
    setSelectedSeasons((prev) =>
      prev.includes(seasonNumber)
        ? prev.filter((n) => n !== seasonNumber)
        : [...prev, seasonNumber]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedSeasons(selectableSeasons.map((s) => s.seasonNumber));
  }, [selectableSeasons]);

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

  const allSelectableSelected =
    selectableSeasons.length > 0 &&
    selectedSeasons.length === selectableSeasons.length;

  const summary = useMemo(() => {
    const available = seasonsWithStatus.filter((s) => s.status === 'available').length;
    const processing = seasonsWithStatus.filter((s) => s.status === 'processing').length;
    const requested = seasonsWithStatus.filter((s) => s.status === 'requested').length;
    const notRequested = seasonsWithStatus.filter((s) => s.status === 'not_requested').length;
    const declined = seasonsWithStatus.filter((s) => s.status === 'declined').length;
    return { available, processing, requested, notRequested, declined };
  }, [seasonsWithStatus]);

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
                <Text style={styles.headerSubtitle}>
                  {selectableSeasons.length > 0
                    ? `${selectableSeasons.length} season${selectableSeasons.length !== 1 ? 's' : ''} available to request`
                    : 'All seasons already requested'}
                </Text>
              </View>
              <Pressable onPress={handleClose} style={styles.closeButton} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.text.tertiary} />
              </Pressable>
            </View>

            <View style={styles.summaryRow}>
              {summary.available > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: statusConfig.available.bgColor }]}>
                  <Text style={[styles.summaryChipText, { color: statusConfig.available.color }]}>
                    {summary.available} Available
                  </Text>
                </View>
              )}
              {summary.processing > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: statusConfig.processing.bgColor }]}>
                  <Text style={[styles.summaryChipText, { color: statusConfig.processing.color }]}>
                    {summary.processing} Processing
                  </Text>
                </View>
              )}
              {summary.requested > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: statusConfig.requested.bgColor }]}>
                  <Text style={[styles.summaryChipText, { color: statusConfig.requested.color }]}>
                    {summary.requested} Pending
                  </Text>
                </View>
              )}
              {summary.notRequested > 0 && (
                <View style={[styles.summaryChip, { backgroundColor: statusConfig.not_requested.bgColor }]}>
                  <Text style={[styles.summaryChipText, { color: statusConfig.not_requested.color }]}>
                    {summary.notRequested} Not Requested
                  </Text>
                </View>
              )}
            </View>

            {selectableSeasons.length > 0 && (
              <View style={styles.quickActions}>
                <Pressable
                  onPress={allSelectableSelected ? clearAll : selectAll}
                  style={[styles.quickActionButton, allSelectableSelected && styles.quickActionButtonActive]}
                >
                  <Ionicons
                    name={allSelectableSelected ? 'checkbox' : 'checkbox-outline'}
                    size={16}
                    color={allSelectableSelected ? JELLYSEERR_PURPLE : colors.text.secondary}
                  />
                  <Text
                    style={[styles.quickActionText, allSelectableSelected && styles.quickActionTextActive]}
                  >
                    {allSelectableSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </Pressable>

                {selectedSeasons.length > 0 && !allSelectableSelected && (
                  <View style={styles.selectedCount}>
                    <Text style={styles.selectedCountText}>
                      {selectedSeasons.length} selected
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <ScrollView
            style={styles.seasonsList}
            contentContainerStyle={styles.seasonsContent}
            showsVerticalScrollIndicator={false}
          >
            {seasonsWithStatus.map((season, index) => (
              <SeasonItem
                key={season.id}
                season={season}
                isSelected={selectedSeasons.includes(season.seasonNumber)}
                onToggle={() => toggleSeason(season.seasonNumber)}
                delay={index * 30}
                isSelectable={selectableSeasons.some((s) => s.seasonNumber === season.seasonNumber)}
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
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  summaryChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  summaryChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
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
  seasonItemDisabled: {
    opacity: 0.6,
  },
  seasonItemSelected: {
    borderColor: JELLYSEERR_PURPLE,
    backgroundColor: `${JELLYSEERR_PURPLE}10`,
  },
  seasonInfo: {
    flex: 1,
  },
  seasonNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seasonName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  seasonNameDisabled: {
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 9,
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
