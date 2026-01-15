import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from '@/providers';
import type { SonarrSeries, SonarrEpisode } from '@/api/external/sonarr';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';

const SONARR_BLUE = '#35c5f4';

export interface SeriesDetailModalProps {
  visible: boolean;
  series: SonarrSeries | null;
  episodes: SonarrEpisode[];
  onClose: () => void;
  onToggleMonitored: (series: SonarrSeries) => void;
  onDelete: (series: SonarrSeries) => void;
  onRefresh: (series: SonarrSeries) => void;
  onSearchSeries: (series: SonarrSeries) => void;
  onSearchSeason: (series: SonarrSeries, seasonNumber: number) => void;
  onSearchEpisode: (episodeId: number) => void;
  onManualSearch: (series: SonarrSeries, seasonNumber?: number) => void;
  onToggleSeasonMonitored: (series: SonarrSeries, seasonNumber: number, monitored: boolean) => void;
  isLoading: boolean;
}

export function SeriesDetailModal({
  visible,
  series,
  episodes,
  onClose,
  onToggleMonitored,
  onDelete,
  onRefresh,
  onSearchSeries,
  onSearchSeason,
  onSearchEpisode,
  onManualSearch,
  onToggleSeasonMonitored,
  isLoading,
}: SeriesDetailModalProps) {
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set());

  const toggleSeasonExpanded = (seasonNumber: number) => {
    setExpandedSeasons(prev => {
      const next = new Set(prev);
      if (next.has(seasonNumber)) {
        next.delete(seasonNumber);
      } else {
        next.add(seasonNumber);
      }
      return next;
    });
  };

  const getSeasonEpisodes = (seasonNumber: number) => {
    return episodes
      .filter(ep => ep.seasonNumber === seasonNumber)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);
  };

  if (!series) return null;

  const poster = series.images.find((i) => i.coverType === 'poster');
  const fanart = series.images.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;

  const percentComplete = series.statistics?.percentOfEpisodes ?? 0;

  const getSeasonStatus = (season: typeof series.seasons[0]) => {
    const stats = season.statistics;
    if (!stats) return { color: colors.text.tertiary, text: 'Unknown' };
    const percent = stats.percentOfEpisodes ?? 0;
    if (percent >= 100) return { color: colors.status.success, text: 'Complete' };
    if (percent > 0) return { color: SONARR_BLUE, text: `${Math.round(percent)}%` };
    return { color: colors.status.warning, text: 'Missing' };
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.detailModalOverlay}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.detailModalContent}
        >
          {fanartUrl && (
            <Image
              source={{ uri: fanartUrl }}
              style={styles.detailBackdrop}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(10,10,10,0.95)', colors.background.primary]}
            style={styles.detailGradient}
          />

          <SafeAreaView style={styles.detailSafeArea} edges={['top']}>
            <View style={styles.detailHeader}>
              <Pressable onPress={onClose} style={styles.detailCloseButton}>
                <BlurView intensity={30} style={styles.blurButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </BlurView>
              </Pressable>
              <View style={styles.detailActions}>
                <Pressable
                  onPress={() => onRefresh(series)}
                  style={styles.detailActionButton}
                  disabled={isLoading}
                >
                  <BlurView intensity={30} style={styles.blurButton}>
                    {isLoading ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Ionicons name="refresh" size={20} color="#fff" />
                    )}
                  </BlurView>
                </Pressable>
              </View>
            </View>

            <ScrollView
              style={styles.detailScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.detailScrollContent}
            >
              <View style={styles.detailTop}>
                {posterUrl && (
                  <View style={styles.detailPosterContainer}>
                    <Image
                      source={{ uri: posterUrl }}
                      style={styles.detailPoster}
                      contentFit="cover"
                    />
                    <View style={styles.detailPosterShadow} />
                  </View>
                )}
                <View style={styles.detailTitleSection}>
                  <Text style={styles.detailTitle}>{series.title}</Text>
                  <View style={styles.detailMetaRow}>
                    <Text style={styles.detailYear}>{series.year}</Text>
                    {series.network && (
                      <>
                        <View style={styles.detailDot} />
                        <Text style={styles.detailNetwork}>{series.network}</Text>
                      </>
                    )}
                  </View>
                  {series.genres.length > 0 && (
                    <Text style={styles.detailGenres}>
                      {series.genres.slice(0, 3).join(' • ')}
                    </Text>
                  )}

                  <View style={styles.detailProgressSection}>
                    <View style={styles.detailProgressBar}>
                      <View
                        style={[
                          styles.detailProgressFill,
                          {
                            width: `${percentComplete}%`,
                            backgroundColor: percentComplete >= 100
                              ? colors.status.success
                              : SONARR_BLUE
                          }
                        ]}
                      />
                    </View>
                    <Text style={styles.detailProgressText}>
                      {series.statistics?.episodeFileCount ?? 0} / {series.statistics?.episodeCount ?? 0} Episodes
                    </Text>
                  </View>
                </View>
              </View>

              {series.overview && (
                <View style={styles.overviewSection}>
                  <Text style={styles.sectionTitle}>Overview</Text>
                  <Text style={styles.overviewText}>{series.overview}</Text>
                </View>
              )}

              <View style={styles.actionBar}>
                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    series.monitored && styles.actionButtonActive,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onToggleMonitored(series)}
                >
                  <Ionicons
                    name={series.monitored ? 'eye' : 'eye-off'}
                    size={22}
                    color={series.monitored ? SONARR_BLUE : colors.text.tertiary}
                  />
                  <Text style={[styles.actionLabel, series.monitored && styles.actionLabelActive]}>
                    {series.monitored ? 'Monitored' : 'Unmonitored'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onSearchSeries(series)}
                >
                  <Ionicons name="flash" size={22} color={SONARR_BLUE} />
                  <Text style={[styles.actionLabel, { color: SONARR_BLUE }]}>Auto Search</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onManualSearch(series)}
                >
                  <Ionicons name="albums-outline" size={22} color={colors.text.secondary} />
                  <Text style={styles.actionLabel}>Browse Releases</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onRefresh(series)}
                >
                  <Ionicons name="sync-outline" size={22} color={colors.text.secondary} />
                  <Text style={styles.actionLabel}>Refresh Metadata</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => {
                    Alert.alert(
                      'Delete Series',
                      `Delete "${series.title}" from Sonarr?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => onDelete(series) }
                      ]
                    );
                  }}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.status.error} />
                  <Text style={[styles.actionLabel, { color: colors.status.error }]}>Delete</Text>
                </Pressable>
              </View>

              <View style={styles.seasonsSection}>
                <Text style={styles.sectionTitle}>Seasons</Text>
                {series.seasons
                  .filter(s => s.seasonNumber > 0)
                  .sort((a, b) => b.seasonNumber - a.seasonNumber)
                  .map((season) => {
                    const status = getSeasonStatus(season);
                    const stats = season.statistics;
                    const seasonPercent = stats?.percentOfEpisodes ?? 0;
                    const isExpanded = expandedSeasons.has(season.seasonNumber);
                    const seasonEpisodes = getSeasonEpisodes(season.seasonNumber);

                    return (
                      <View key={season.seasonNumber} style={styles.seasonCard}>
                        <Pressable
                          style={styles.seasonHeader}
                          onPress={() => toggleSeasonExpanded(season.seasonNumber)}
                        >
                          <View style={styles.seasonTitleRow}>
                            <Ionicons
                              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                              size={16}
                              color={colors.text.tertiary}
                            />
                            <Text style={styles.seasonTitle}>
                              Season {season.seasonNumber}
                            </Text>
                            <View style={[styles.seasonStatusPill, { backgroundColor: `${status.color}20` }]}>
                              <Text style={[styles.seasonStatusText, { color: status.color }]}>
                                {status.text}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.seasonActions}>
                            <Pressable
                              style={({ pressed }) => [
                                styles.seasonActionButton,
                                { opacity: pressed ? 0.7 : 1 }
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                onToggleSeasonMonitored(series, season.seasonNumber, !season.monitored);
                              }}
                            >
                              <Ionicons
                                name={season.monitored ? 'eye' : 'eye-off'}
                                size={18}
                                color={season.monitored ? SONARR_BLUE : colors.text.tertiary}
                              />
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [
                                styles.seasonActionButton,
                                { opacity: pressed ? 0.7 : 1 }
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                onSearchSeason(series, season.seasonNumber);
                              }}
                            >
                              <Ionicons name="flash" size={18} color={SONARR_BLUE} />
                            </Pressable>
                            <Pressable
                              style={({ pressed }) => [
                                styles.seasonActionButton,
                                { opacity: pressed ? 0.7 : 1 }
                              ]}
                              onPress={(e) => {
                                e.stopPropagation();
                                onManualSearch(series, season.seasonNumber);
                              }}
                            >
                              <Ionicons name="albums-outline" size={18} color={colors.text.secondary} />
                            </Pressable>
                          </View>
                        </Pressable>
                        <View style={styles.seasonProgressRow}>
                          <View style={styles.seasonProgressBar}>
                            <View
                              style={[
                                styles.seasonProgressFill,
                                { width: `${seasonPercent}%`, backgroundColor: status.color }
                              ]}
                            />
                          </View>
                          <Text style={styles.seasonEpisodes}>
                            {stats?.episodeFileCount ?? 0}/{stats?.episodeCount ?? 0}
                          </Text>
                        </View>

                        {isExpanded && seasonEpisodes.length > 0 && (
                          <View style={styles.episodeList}>
                            {seasonEpisodes.map((ep) => (
                              <View key={ep.id} style={styles.episodeRow}>
                                <View style={styles.episodeInfo}>
                                  <View style={styles.episodeNumberBadge}>
                                    <Text style={styles.episodeNumber}>{ep.episodeNumber}</Text>
                                  </View>
                                  <View style={styles.episodeDetails}>
                                    <Text style={styles.detailEpisodeTitle} numberOfLines={1}>
                                      {ep.title || `Episode ${ep.episodeNumber}`}
                                    </Text>
                                    {ep.airDate && (
                                      <Text style={styles.episodeAirDate}>{ep.airDate}</Text>
                                    )}
                                  </View>
                                </View>
                                <View style={styles.episodeActions}>
                                  {ep.hasFile ? (
                                    <Ionicons name="checkmark-circle" size={20} color={colors.status.success} />
                                  ) : ep.monitored ? (
                                    <Pressable
                                      onPress={() => onSearchEpisode(ep.id)}
                                      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                                    >
                                      <Ionicons name="download-outline" size={20} color={SONARR_BLUE} />
                                    </Pressable>
                                  ) : (
                                    <Ionicons name="eye-off-outline" size={18} color={colors.text.muted} />
                                  )}
                                </View>
                              </View>
                            ))}
                          </View>
                        )}

                        {isExpanded && seasonEpisodes.length === 0 && (
                          <View style={styles.noEpisodes}>
                            <Text style={styles.noEpisodesText}>No episode data</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}

                {series.seasons.find(s => s.seasonNumber === 0) && (
                  <View style={[styles.seasonCard, styles.specialsSeason]}>
                    <View style={styles.seasonHeader}>
                      <Text style={styles.seasonTitle}>Specials</Text>
                      <Pressable
                        style={({ pressed }) => [
                          styles.seasonActionButton,
                          { opacity: pressed ? 0.7 : 1 }
                        ]}
                        onPress={() => {
                          const specials = series.seasons.find(s => s.seasonNumber === 0);
                          if (specials) {
                            onToggleSeasonMonitored(series, 0, !specials.monitored);
                          }
                        }}
                      >
                        <Ionicons
                          name={series.seasons.find(s => s.seasonNumber === 0)?.monitored ? 'eye' : 'eye-off'}
                          size={18}
                          color={series.seasons.find(s => s.seasonNumber === 0)?.monitored ? SONARR_BLUE : colors.text.tertiary}
                        />
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.detailInfoSection}>
                <Text style={styles.sectionTitle}>Information</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Status</Text>
                    <Text style={styles.infoValue}>
                      {series.ended ? 'Ended' : 'Continuing'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Type</Text>
                    <Text style={styles.infoValue}>
                      {series.seriesType.charAt(0).toUpperCase() + series.seriesType.slice(1)}
                    </Text>
                  </View>
                  {series.ratings?.value > 0 && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Rating</Text>
                      <View style={styles.infoRating}>
                        <Ionicons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.infoValue}>{series.ratings.value.toFixed(1)}</Text>
                      </View>
                    </View>
                  )}
                  {series.statistics?.sizeOnDisk > 0 && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Size on Disk</Text>
                      <Text style={styles.infoValue}>
                        {formatBytes(series.statistics.sizeOnDisk)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  detailModalOverlay: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  detailModalContent: {
    flex: 1,
  },
  detailBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  detailGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 350,
  },
  detailSafeArea: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  detailCloseButton: {
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
  detailActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  detailActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    paddingBottom: spacing[20],
  },
  detailTop: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[4],
  },
  detailPosterContainer: {
    position: 'relative',
  },
  detailPoster: {
    width: 130,
    height: 195,
    borderRadius: borderRadius.xl,
  },
  detailPosterShadow: {
    position: 'absolute',
    bottom: -10,
    left: 10,
    right: 10,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 100,
  },
  detailTitleSection: {
    flex: 1,
    paddingTop: spacing[2],
  },
  detailTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  detailYear: {
    color: colors.text.secondary,
    fontSize: 15,
  },
  detailDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[2],
  },
  detailNetwork: {
    color: colors.text.secondary,
    fontSize: 15,
  },
  detailGenres: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: spacing[2],
  },
  detailProgressSection: {
    marginTop: spacing[4],
  },
  detailProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  detailProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  detailProgressText: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[2],
  },
  overviewSection: {
    padding: spacing[4],
    paddingTop: spacing[6],
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing[3],
  },
  overviewText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 22,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.default,
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    minWidth: 54,
  },
  actionButtonActive: {
    backgroundColor: `${SONARR_BLUE}15`,
    borderRadius: borderRadius.lg,
  },
  actionLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '500',
    marginTop: spacing[1],
  },
  actionLabelActive: {
    color: SONARR_BLUE,
  },
  seasonsSection: {
    padding: spacing[4],
    paddingTop: spacing[6],
  },
  seasonCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  specialsSeason: {
    opacity: 0.7,
  },
  seasonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seasonTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  seasonTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  seasonStatusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  seasonStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  seasonActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  seasonActionButton: {
    padding: spacing[2],
  },
  seasonProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  seasonProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seasonProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  seasonEpisodes: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '500',
  },
  episodeList: {
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing[2],
  },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  episodeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[3],
  },
  episodeNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  episodeNumber: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  episodeDetails: {
    flex: 1,
  },
  detailEpisodeTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  episodeAirDate: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  episodeActions: {
    paddingLeft: spacing[2],
  },
  noEpisodes: {
    padding: spacing[4],
    alignItems: 'center',
  },
  noEpisodesText: {
    color: colors.text.muted,
    fontSize: 12,
  },
  detailInfoSection: {
    padding: spacing[4],
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
  },
  infoItem: {
    width: '45%',
  },
  infoLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginBottom: spacing[1],
  },
  infoValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  infoRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
});
