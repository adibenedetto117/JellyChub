import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import type { RadarrMovie } from '@/api/external/radarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';
import { StarRating } from './StarRating';

const RADARR_ORANGE = '#ffc230';

interface MovieDetailModalProps {
  visible: boolean;
  movie: RadarrMovie | null;
  onClose: () => void;
  onToggleMonitored: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onSearch: () => void;
  onManualSearch: () => void;
}

export function MovieDetailModal({
  visible,
  movie,
  onClose,
  onToggleMonitored,
  onDelete,
  onRefresh,
  onSearch,
  onManualSearch,
}: MovieDetailModalProps) {
  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const fanart = movie.images.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const getStatusInfo = () => {
    if (movie.hasFile) return { color: colors.status.success, label: 'Downloaded', icon: 'checkmark-circle' };
    if (movie.monitored) return { color: colors.status.warning, label: 'Missing', icon: 'time' };
    return { color: colors.text.muted, label: 'Unmonitored', icon: 'eye-off' };
  };

  const status = getStatusInfo();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View entering={FadeInUp.springify()} style={styles.detailModal}>
          <View style={styles.detailHeader}>
            {fanartUrl && (
              <Image source={{ uri: fanartUrl }} style={styles.detailFanart} contentFit="cover" />
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.85)', colors.background.secondary]}
              style={styles.detailGradient}
            />
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <BlurView intensity={60} style={styles.closeBtnBlur}>
                <Ionicons name="close" size={22} color="#fff" />
              </BlurView>
            </Pressable>
            <View style={styles.detailHeaderContent}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.detailPoster} contentFit="cover" />
              ) : (
                <View style={[styles.detailPoster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={32} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.detailHeaderInfo}>
                <Text style={styles.detailTitle} numberOfLines={2}>{movie.title}</Text>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailYear}>{movie.year}</Text>
                  {movie.runtime > 0 && <Text style={styles.detailRuntime}>{movie.runtime} min</Text>}
                </View>
                {rating > 0 && <StarRating rating={rating} size={12} />}
                <View style={[styles.detailStatus, { backgroundColor: `${status.color}20` }]}>
                  <Ionicons name={status.icon as any} size={12} color={status.color} />
                  <Text style={[styles.detailStatusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {movie.overview && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overview}>{movie.overview}</Text>
              </View>
            )}

            {movie.genres.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Genres</Text>
                <View style={styles.genreContainer}>
                  {movie.genres.map((g) => (
                    <View key={g} style={styles.genreChipLg}>
                      <Text style={styles.genreTextLg}>{g}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {movie.hasFile && movie.sizeOnDisk > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>File</Text>
                <View style={styles.fileInfoCard}>
                  <Ionicons name="folder" size={16} color={RADARR_ORANGE} />
                  <Text style={styles.fileSize}>{formatBytes(movie.sizeOnDisk)}</Text>
                </View>
              </View>
            )}

            <View style={styles.actionGrid}>
              <Pressable style={[styles.actionBtn, movie.monitored && styles.actionBtnActive]} onPress={onToggleMonitored}>
                <Ionicons name={movie.monitored ? 'eye' : 'eye-off'} size={18} color={movie.monitored ? RADARR_ORANGE : colors.text.tertiary} />
                <Text style={[styles.actionBtnText, movie.monitored && { color: RADARR_ORANGE }]}>{movie.monitored ? 'Monitored' : 'Unmonitored'}</Text>
              </Pressable>
              {!movie.hasFile && movie.monitored && (
                <Pressable style={styles.actionBtn} onPress={onSearch}>
                  <Ionicons name="flash" size={18} color={RADARR_ORANGE} />
                  <Text style={[styles.actionBtnText, { color: RADARR_ORANGE }]}>Auto Search</Text>
                </Pressable>
              )}
              <Pressable style={styles.actionBtn} onPress={onManualSearch}>
                <Ionicons name="albums-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Browse Releases</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={onRefresh}>
                <Ionicons name="sync-outline" size={18} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Refresh Metadata</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
                <Ionicons name="trash" size={18} color={colors.status.error} />
                <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
  },
  detailHeader: {
    height: 240,
    overflow: 'hidden',
  },
  detailFanart: {
    ...StyleSheet.absoluteFillObject,
  },
  detailGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  closeBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    zIndex: 10,
  },
  closeBtnBlur: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailHeaderContent: {
    position: 'absolute',
    bottom: spacing[4],
    left: spacing[4],
    right: spacing[4],
    flexDirection: 'row',
    gap: spacing[3],
  },
  detailPoster: {
    width: 85,
    height: 127,
    borderRadius: borderRadius.md,
  },
  noPoster: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailHeaderInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  detailYear: {
    fontSize: 14,
    fontWeight: '600',
    color: RADARR_ORANGE,
  },
  detailRuntime: {
    fontSize: 13,
    color: colors.text.tertiary,
  },
  detailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[2],
  },
  detailStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailContent: {
    padding: spacing[4],
  },
  section: {
    marginBottom: spacing[4],
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted,
    textTransform: 'uppercase',
    marginBottom: spacing[2],
  },
  overview: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  genreChipLg: {
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  genreTextLg: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  fileInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface.default,
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  fileSize: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[8],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2.5],
    borderRadius: borderRadius.md,
  },
  actionBtnActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  deleteBtn: {
    backgroundColor: `${colors.status.error}15`,
  },
});
