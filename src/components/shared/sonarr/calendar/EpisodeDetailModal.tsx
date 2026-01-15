import { View, Text, Pressable, ScrollView, Modal, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import type { SonarrCalendarEpisode } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { SONARR_BLUE, SONARR_GRADIENT } from './constants';
import { getStatusColor, getStatusText } from './utils';

interface EpisodeDetailModalProps {
  visible: boolean;
  episode: SonarrCalendarEpisode | null;
  onClose: () => void;
  onSearch: () => void;
  isSearching: boolean;
}

export function EpisodeDetailModal({
  visible,
  episode,
  onClose,
  onSearch,
  isSearching,
}: EpisodeDetailModalProps) {
  if (!episode) return null;

  const poster = episode.series?.images?.find((i) => i.coverType === 'poster');
  const fanart = episode.series?.images?.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;
  const statusColor = getStatusColor(episode);
  const statusText = getStatusText(episode);

  const airDate = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const airTime = episode.airDateUtc
    ? new Date(episode.airDateUtc).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
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
                <Text style={styles.modalSeriesTitle}>{episode.series?.title}</Text>
                <View style={styles.modalEpisodeBadge}>
                  <Text style={styles.modalEpisodeBadgeText}>
                    S{String(episode.seasonNumber).padStart(2, '0')}E
                    {String(episode.episodeNumber).padStart(2, '0')}
                  </Text>
                </View>
                <Text style={styles.modalEpisodeTitle}>{episode.title}</Text>

                <View style={styles.modalAirInfo}>
                  <Ionicons name="calendar-outline" size={14} color={colors.text.tertiary} />
                  <Text style={styles.modalAirText}>{airDate}</Text>
                </View>
                {airTime && (
                  <View style={styles.modalAirInfo}>
                    <Ionicons name="time-outline" size={14} color={colors.text.tertiary} />
                    <Text style={styles.modalAirText}>{airTime}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={[styles.statusCard, { backgroundColor: `${statusColor}15` }]}>
              <View style={[styles.statusCardDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusCardText, { color: statusColor }]}>
                {statusText}
              </Text>
            </View>

            {episode.overview && (
              <View style={styles.overviewSection}>
                <Text style={styles.sectionTitle}>Overview</Text>
                <Text style={styles.overviewText}>{episode.overview}</Text>
              </View>
            )}

            {episode.series?.network && (
              <View style={styles.networkInfo}>
                <Ionicons name="tv-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.networkText}>{episode.series.network}</Text>
              </View>
            )}

            {!episode.hasFile && episode.monitored && (
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={onSearch}
                disabled={isSearching}
              >
                <LinearGradient colors={SONARR_GRADIENT} style={styles.searchButtonGradient}>
                  {isSearching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="search" size={20} color="#fff" />
                      <Text style={styles.searchButtonText}>Search Episode</Text>
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
  modalSeriesTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalEpisodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: spacing[2],
  },
  modalEpisodeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalEpisodeTitle: {
    color: colors.text.secondary,
    fontSize: 15,
    marginTop: spacing[2],
  },
  modalAirInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  modalAirText: {
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
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  networkText: {
    color: colors.text.tertiary,
    fontSize: 14,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
