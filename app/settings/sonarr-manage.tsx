import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  useWindowDimensions,
  ScrollView,
  Animated as RNAnimated,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from '@/providers';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSettingsStore } from '@/stores/settingsStore';
import { sonarrService } from '@/services';
import type {
  SonarrSeries,
  SonarrLookupResult,
  SonarrQueueItem,
  SonarrRootFolder,
  SonarrQualityProfile,
  SonarrRelease,
  SonarrEpisode,
} from '@/services/sonarrService';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes } from '@/utils';
import { Skeleton } from '@/components/ui';

const SONARR_BLUE = '#35c5f4';
const SONARR_DARK = '#1a3a4a';
const SONARR_GRADIENT = ['#35c5f4', '#1a8fc9', '#0d6ea3'];

type TabType = 'library' | 'queue' | 'search';
type ViewMode = 'list' | 'grid';
type FilterType = 'all' | 'continuing' | 'ended' | 'missing' | 'unmonitored';
type SortType = 'title' | 'dateAdded' | 'year' | 'nextAiring';

interface Stats {
  totalSeries: number;
  episodesDownloaded: number;
  missingEpisodes: number;
  queueCount: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function StatCard({ label, value, icon, color, delay }: { label: string; value: number; icon: string; color: string; delay: number }) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).springify()} style={styles.statCard}>
      <LinearGradient
        colors={[`${color}20`, `${color}05`]}
        style={styles.statGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.statIconContainer, { backgroundColor: `${color}25` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient colors={[`${SONARR_BLUE}30`, `${SONARR_BLUE}05`]} style={styles.emptyIconGradient}>
          <Ionicons name={icon as any} size={48} color={SONARR_BLUE} />
        </LinearGradient>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{message}</Text>
    </View>
  );
}

interface SeriesCardProps {
  series: SonarrSeries;
  viewMode: ViewMode;
  gridItemWidth: number;
  onPress: (series: SonarrSeries) => void;
  index: number;
}

function SeriesCard({ series, viewMode, gridItemWidth, onPress, index }: SeriesCardProps) {
  const poster = series.images.find((i) => i.coverType === 'poster');
  const fanart = series.images.find((i) => i.coverType === 'fanart');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const fanartUrl = fanart?.remoteUrl || fanart?.url;

  const episodeCount = series.statistics?.episodeFileCount ?? 0;
  const totalEpisodes = series.statistics?.episodeCount ?? 0;
  const percentComplete = series.statistics?.percentOfEpisodes ?? 0;

  const getStatusColor = () => {
    if (percentComplete >= 100) return colors.status.success;
    if (series.monitored && percentComplete > 0) return SONARR_BLUE;
    if (series.monitored) return colors.status.warning;
    return colors.text.tertiary;
  };

  const getStatusText = () => {
    if (!series.monitored) return 'Unmonitored';
    if (percentComplete >= 100) return 'Complete';
    if (percentComplete > 0) return 'In Progress';
    return 'Missing';
  };

  const renderRating = () => {
    if (!series.ratings?.value) return null;
    const rating = series.ratings.value;
    const stars = Math.round(rating / 2);
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= stars ? 'star' : 'star-outline'}
            size={10}
            color="#fbbf24"
          />
        ))}
        <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
      </View>
    );
  };

  if (viewMode === 'grid') {
    const posterHeight = gridItemWidth * 1.5;
    return (
      <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
        <Pressable
          onPress={() => onPress(series)}
          style={({ pressed }) => [
            styles.gridCard,
            { width: gridItemWidth, opacity: pressed ? 0.8 : 1 }
          ]}
        >
          <View style={[styles.gridPosterContainer, { height: posterHeight }]}>
            {posterUrl ? (
              <Image source={{ uri: posterUrl }} style={styles.gridPoster} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[SONARR_DARK, colors.surface.default]}
                style={styles.noPosterGrid}
              >
                <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
              </LinearGradient>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.gridOverlay}
            />
            <View style={[styles.gridStatusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.gridStatusText}>{Math.round(percentComplete)}%</Text>
            </View>
            {!series.monitored && (
              <View style={styles.unmonitoredBadge}>
                <Ionicons name="eye-off" size={12} color="#fff" />
              </View>
            )}
            <View style={styles.gridProgressContainer}>
              <View
                style={[
                  styles.gridProgressFill,
                  { width: `${percentComplete}%`, backgroundColor: getStatusColor() }
                ]}
              />
            </View>
          </View>
          <Text style={styles.gridTitle} numberOfLines={2}>{series.title}</Text>
          <View style={styles.gridMeta}>
            <Text style={styles.gridYear}>{series.year}</Text>
            {series.network && (
              <>
                <View style={styles.gridDot} />
                <Text style={styles.gridNetwork} numberOfLines={1}>{series.network}</Text>
              </>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={SlideInRight.delay(index * 30).springify()}>
      <Pressable
        onPress={() => onPress(series)}
        style={({ pressed }) => [styles.listCard, { opacity: pressed ? 0.9 : 1 }]}
      >
        <View style={styles.listCardInner}>
          {fanartUrl && (
            <Image
              source={{ uri: fanartUrl }}
              style={styles.listBackdrop}
              contentFit="cover"
              blurRadius={2}
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)', 'rgba(0,0,0,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.listGradientOverlay}
          />

          <View style={styles.listCardContent}>
            {posterUrl ? (
              <View style={styles.listPosterWrapper}>
                <Image source={{ uri: posterUrl }} style={styles.listPoster} contentFit="cover" />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)']}
                  style={styles.posterShadow}
                />
              </View>
            ) : (
              <View style={[styles.listPoster, styles.noPoster]}>
                <Ionicons name="tv-outline" size={24} color={colors.text.muted} />
              </View>
            )}

            <View style={styles.listInfo}>
              <View style={styles.listTitleRow}>
                <Text style={styles.listTitle} numberOfLines={1}>{series.title}</Text>
                {series.ended && (
                  <View style={styles.endedBadge}>
                    <Text style={styles.endedText}>ENDED</Text>
                  </View>
                )}
              </View>

              <View style={styles.listMetaRow}>
                <Text style={styles.listSubtitle}>{series.year}</Text>
                <View style={styles.metaDot} />
                <Text style={styles.listSubtitle}>{series.statistics?.seasonCount ?? 0} Seasons</Text>
                {series.network && (
                  <>
                    <View style={styles.metaDot} />
                    <Text style={styles.listSubtitle} numberOfLines={1}>{series.network}</Text>
                  </>
                )}
              </View>

              {renderRating()}

              <View style={styles.episodeProgress}>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        { width: `${percentComplete}%`, backgroundColor: getStatusColor() },
                      ]}
                    />
                  </View>
                </View>
                <Text style={styles.episodeCount}>
                  {episodeCount}/{totalEpisodes} Episodes
                </Text>
              </View>

              <View style={styles.statusRow}>
                <View style={[styles.statusPill, { backgroundColor: `${getStatusColor()}20` }]}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                  <Text style={[styles.statusText, { color: getStatusColor() }]}>
                    {getStatusText()}
                  </Text>
                </View>
                {series.statistics?.sizeOnDisk > 0 && (
                  <Text style={styles.sizeText}>{formatBytes(series.statistics.sizeOnDisk)}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

interface SeriesDetailModalProps {
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

function SeriesDetailModal({
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
                  <Ionicons name="search" size={22} color={SONARR_BLUE} />
                  <Text style={styles.actionLabel}>Search</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onManualSearch(series)}
                >
                  <Ionicons name="list" size={22} color={colors.text.secondary} />
                  <Text style={styles.actionLabel}>Manual</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.actionButton,
                    { opacity: pressed ? 0.7 : 1 }
                  ]}
                  onPress={() => onRefresh(series)}
                >
                  <Ionicons name="refresh" size={22} color={colors.text.secondary} />
                  <Text style={styles.actionLabel}>Refresh</Text>
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
                              <Ionicons name="search" size={18} color={SONARR_BLUE} />
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
                              <Ionicons name="list" size={18} color={colors.text.secondary} />
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
                                    <Text style={styles.episodeTitle} numberOfLines={1}>
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

function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '#a855f7';
  if (q.includes('1080')) return '#3b82f6';
  if (q.includes('720')) return '#22c55e';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return colors.text.tertiary;
}

function ManualSearchModal({
  visible,
  series,
  seasonNumber,
  releases,
  isLoading,
  onClose,
  onDownload,
}: {
  visible: boolean;
  series: SonarrSeries | null;
  seasonNumber?: number;
  releases: SonarrRelease[];
  isLoading: boolean;
  onClose: () => void;
  onDownload: (release: SonarrRelease) => void;
}) {
  if (!series) return null;

  const title = seasonNumber !== undefined
    ? `${series.title} - Season ${seasonNumber}`
    : series.title;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.manualSearchOverlay}>
        <Pressable style={styles.manualSearchBackdrop} onPress={onClose} />
        <View style={styles.manualSearchModal}>
          <View style={styles.manualSearchHeader}>
            <View>
              <Text style={styles.manualSearchTitle}>Manual Search</Text>
              <Text style={styles.manualSearchSubtitle} numberOfLines={1}>{title}</Text>
            </View>
            <Pressable style={styles.manualSearchClose} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.manualSearchLoading}>
              <ActivityIndicator size="large" color={SONARR_BLUE} />
              <Text style={styles.manualSearchLoadingText}>Searching indexers...</Text>
            </View>
          ) : releases.length === 0 ? (
            <View style={styles.manualSearchEmpty}>
              <Ionicons name="search-outline" size={48} color={colors.text.muted} />
              <Text style={styles.manualSearchEmptyText}>No releases found</Text>
            </View>
          ) : (
            <FlatList
              data={releases}
              keyExtractor={(item) => item.guid}
              contentContainerStyle={styles.releaseList}
              renderItem={({ item }) => {
                const qualityColor = getQualityBadgeColor(item.quality?.quality?.name || '');
                return (
                  <Pressable
                    style={[styles.releaseCard, item.rejected && styles.releaseCardRejected]}
                    onPress={() => !item.rejected && onDownload(item)}
                    disabled={item.rejected}
                  >
                    <View style={styles.releaseHeader}>
                      <View style={[styles.qualityBadge, { backgroundColor: `${qualityColor}20`, borderColor: qualityColor }]}>
                        <Text style={[styles.qualityText, { color: qualityColor }]}>{item.quality?.quality?.name}</Text>
                      </View>
                      <Text style={styles.releaseSize}>{formatBytes(item.size)}</Text>
                      {item.fullSeason && (
                        <View style={styles.fullSeasonBadge}>
                          <Text style={styles.fullSeasonText}>Full Season</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.releaseTitle} numberOfLines={2}>{item.title}</Text>
                    <View style={styles.releaseMeta}>
                      <Text style={styles.releaseIndexer}>{item.indexer}</Text>
                      {item.seeders !== undefined && (
                        <View style={styles.seedersContainer}>
                          <Ionicons name="arrow-up" size={12} color={colors.status.success} />
                          <Text style={styles.seedersText}>{item.seeders}</Text>
                        </View>
                      )}
                      <Text style={styles.releaseAge}>{item.age}d ago</Text>
                    </View>
                    {item.rejected && item.rejections && (
                      <Text style={styles.rejectionText} numberOfLines={1}>
                        {item.rejections[0]}
                      </Text>
                    )}
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

interface SearchResultCardProps {
  result: SonarrLookupResult;
  onAdd: (result: SonarrLookupResult) => void;
  existingSeries?: SonarrSeries;
  index: number;
}

function SearchResultCard({ result, onAdd, existingSeries, index }: SearchResultCardProps) {
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

interface QueueItemCardProps {
  item: SonarrQueueItem;
  onRemove: (id: number) => void;
  index: number;
}

function QueueItemCard({ item, onRemove, index }: QueueItemCardProps) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;
  const poster = item.series?.images?.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;

  const getStatusColor = () => {
    if (item.trackedDownloadState === 'importPending') return colors.status.success;
    if (item.trackedDownloadState === 'downloading') return SONARR_BLUE;
    if (item.status === 'warning') return colors.status.warning;
    if (item.status === 'failed') return colors.status.error;
    return colors.text.tertiary;
  };

  const getStatusText = () => {
    if (item.trackedDownloadState === 'importPending') return 'Import Pending';
    if (item.trackedDownloadState === 'downloading') return 'Downloading';
    if (item.status === 'warning') return 'Warning';
    if (item.status === 'failed') return 'Failed';
    return item.status;
  };

  const formatTimeLeft = (timeLeft?: string) => {
    if (!timeLeft) return '';
    const parts = timeLeft.split(':');
    if (parts.length !== 3) return timeLeft;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const episodeInfo = item.episode
    ? `S${String(item.episode.seasonNumber).padStart(2, '0')}E${String(item.episode.episodeNumber).padStart(2, '0')}`
    : '';

  return (
    <Animated.View entering={FadeInUp.delay(index * 50).springify()}>
      <View style={styles.queueCard}>
        <View style={styles.queueCardInner}>
          {posterUrl && (
            <Image source={{ uri: posterUrl }} style={styles.queuePoster} contentFit="cover" />
          )}
          <View style={styles.queueContent}>
            <View style={styles.queueHeader}>
              <View style={styles.queueTitleRow}>
                <Text style={styles.queueTitle} numberOfLines={1}>
                  {item.series?.title || item.title}
                </Text>
                {episodeInfo && (
                  <View style={styles.episodeBadge}>
                    <Text style={styles.episodeBadgeText}>{episodeInfo}</Text>
                  </View>
                )}
              </View>
              <Pressable
                onPress={() => onRemove(item.id)}
                style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.5 : 1 }]}
              >
                <Ionicons name="close-circle" size={22} color={colors.text.tertiary} />
              </Pressable>
            </View>

            {item.episode?.title && (
              <Text style={styles.episodeTitle} numberOfLines={1}>{item.episode.title}</Text>
            )}

            <View style={styles.queueMeta}>
              <View style={[styles.queueStatusPill, { backgroundColor: `${getStatusColor()}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.queueStatusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
              {item.timeleft && (
                <Text style={styles.timeLeft}>{formatTimeLeft(item.timeleft)} left</Text>
              )}
            </View>

            <View style={styles.queueProgressContainer}>
              <View style={styles.queueProgressBar}>
                <Animated.View
                  style={[
                    styles.queueProgressFill,
                    { width: `${progress}%`, backgroundColor: getStatusColor() }
                  ]}
                />
              </View>
              <Text style={styles.queueProgressText}>{Math.round(progress)}%</Text>
            </View>

            <View style={styles.queueFooter}>
              <Text style={styles.queueSize}>
                {formatBytes(item.size - item.sizeleft)} / {formatBytes(item.size)}
              </Text>
              {item.quality?.quality?.name && (
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>{item.quality.quality.name}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function SkeletonListCard() {
  return (
    <View style={styles.skeletonListCard}>
      <Skeleton width={70} height={105} borderRadius={12} />
      <View style={styles.skeletonListInfo}>
        <Skeleton width="75%" height={18} borderRadius={4} />
        <Skeleton width="50%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
        <Skeleton width="100%" height={6} borderRadius={3} style={{ marginTop: 12 }} />
        <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

function SkeletonGridCard({ width }: { width: number }) {
  const height = width * 1.5;
  return (
    <View style={[styles.gridCard, { width }]}>
      <Skeleton width={width - 8} height={height} borderRadius={16} />
      <View style={{ marginTop: 10, gap: 6 }}>
        <Skeleton width="85%" height={14} borderRadius={4} />
        <Skeleton width="50%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

function SkeletonQueueCard() {
  return (
    <View style={styles.queueCard}>
      <View style={styles.skeletonQueueInner}>
        <Skeleton width={60} height={90} borderRadius={8} />
        <View style={styles.skeletonQueueContent}>
          <Skeleton width="60%" height={16} borderRadius={4} />
          <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 6 }} />
          <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
          <Skeleton width="35%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
        </View>
      </View>
    </View>
  );
}

interface AddSeriesModalProps {
  visible: boolean;
  series: SonarrLookupResult | null;
  rootFolders: SonarrRootFolder[];
  qualityProfiles: SonarrQualityProfile[];
  onClose: () => void;
  onAdd: (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMissingEpisodes: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
  }) => void;
  isAdding: boolean;
}

function AddSeriesModal({
  visible,
  series,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: AddSeriesModalProps) {
  const [selectedQuality, setSelectedQuality] = useState<number>(qualityProfiles[0]?.id ?? 0);
  const [selectedFolder, setSelectedFolder] = useState<string>(rootFolders[0]?.path ?? '');
  const [searchForMissing, setSearchForMissing] = useState(true);
  const [seriesType, setSeriesType] = useState<'standard' | 'daily' | 'anime'>('standard');

  useEffect(() => {
    if (qualityProfiles.length > 0 && !selectedQuality) {
      setSelectedQuality(qualityProfiles[0].id);
    }
    if (rootFolders.length > 0 && !selectedFolder) {
      setSelectedFolder(rootFolders[0].path);
    }
    if (series) {
      setSeriesType(series.seriesType || 'standard');
    }
  }, [qualityProfiles, rootFolders, series]);

  if (!series) return null;

  const poster = series.images.find((i) => i.coverType === 'poster');
  const posterUrl = series.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={FadeInDown.springify()} style={styles.modalContent}>
          <LinearGradient
            colors={[SONARR_DARK, colors.background.secondary]}
            style={styles.modalGradient}
          />

          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Series</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.seriesPreview}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.previewPoster} contentFit="cover" />
              ) : (
                <View style={[styles.previewPoster, styles.noPoster]}>
                  <Ionicons name="tv-outline" size={32} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle}>{series.title}</Text>
                <Text style={styles.previewYear}>{series.year}</Text>
                {series.network && (
                  <Text style={styles.previewNetwork}>{series.network}</Text>
                )}
              </View>
            </View>

            <Text style={styles.sectionLabel}>Quality Profile</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionScroll}
            >
              {qualityProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  style={({ pressed }) => [
                    styles.optionButton,
                    selectedQuality === profile.id && styles.optionButtonActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSelectedQuality(profile.id)}
                >
                  {selectedQuality === profile.id ? (
                    <LinearGradient colors={SONARR_GRADIENT} style={styles.optionGradient}>
                      <Text style={styles.optionTextActive}>{profile.name}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionText}>{profile.name}</Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Series Type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionScroll}
            >
              {(['standard', 'daily', 'anime'] as const).map((type) => (
                <Pressable
                  key={type}
                  style={({ pressed }) => [
                    styles.optionButton,
                    seriesType === type && styles.optionButtonActive,
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => setSeriesType(type)}
                >
                  {seriesType === type ? (
                    <LinearGradient colors={SONARR_GRADIENT} style={styles.optionGradient}>
                      <Text style={styles.optionTextActive}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <Text style={styles.optionText}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Root Folder</Text>
            {rootFolders.map((folder) => (
              <Pressable
                key={folder.id}
                style={({ pressed }) => [
                  styles.folderOption,
                  selectedFolder === folder.path && styles.folderOptionActive,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => setSelectedFolder(folder.path)}
              >
                <View style={styles.folderInfo}>
                  <Ionicons
                    name={selectedFolder === folder.path ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedFolder === folder.path ? SONARR_BLUE : colors.text.tertiary}
                  />
                  <Text style={styles.folderPath} numberOfLines={1}>{folder.path}</Text>
                </View>
                <Text style={styles.folderSpace}>{formatBytes(folder.freeSpace)} free</Text>
              </Pressable>
            ))}

            <Pressable
              style={({ pressed }) => [styles.searchToggle, pressed && { opacity: 0.8 }]}
              onPress={() => setSearchForMissing(!searchForMissing)}
            >
              <Ionicons
                name={searchForMissing ? 'checkbox' : 'square-outline'}
                size={24}
                color={SONARR_BLUE}
              />
              <Text style={styles.searchToggleText}>Search for missing episodes</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [
              styles.addSeriesButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => onAdd({
              qualityProfileId: selectedQuality,
              rootFolderPath: selectedFolder,
              searchForMissingEpisodes: searchForMissing,
              seriesType,
            })}
            disabled={isAdding}
          >
            <LinearGradient colors={SONARR_GRADIENT} style={styles.addSeriesGradient}>
              {isAdding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={22} color="#fff" />
                  <Text style={styles.addSeriesButtonText}>Add Series</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function SonarrManageScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = sonarrService.isConfigured();

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [seriesList, setSeriesList] = useState<SonarrSeries[]>([]);
  const [searchResults, setSearchResults] = useState<SonarrLookupResult[]>([]);
  const [queue, setQueue] = useState<SonarrQueueItem[]>([]);
  const [rootFolders, setRootFolders] = useState<SonarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<SonarrQualityProfile[]>([]);

  const [selectedSeries, setSelectedSeries] = useState<SonarrLookupResult | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [detailSeries, setDetailSeries] = useState<SonarrSeries | null>(null);
  const [detailEpisodes, setDetailEpisodes] = useState<SonarrEpisode[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualSearchReleases, setManualSearchReleases] = useState<SonarrRelease[]>([]);
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false);
  const [manualSearchSeasonNumber, setManualSearchSeasonNumber] = useState<number | undefined>(undefined);

  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('title');
  const [searchingSeriesId, setSearchingSeriesId] = useState<number | null>(null);

  const numColumns = screenWidth > 600 ? 4 : 3;
  const gridItemWidth = (screenWidth - spacing[4] * 2 - spacing[2] * (numColumns - 1)) / numColumns;
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const stats: Stats = useMemo(() => ({
    totalSeries: seriesList.length,
    episodesDownloaded: seriesList.reduce((acc, s) => acc + (s.statistics?.episodeFileCount ?? 0), 0),
    missingEpisodes: seriesList.reduce((acc, s) => {
      const total = s.statistics?.episodeCount ?? 0;
      const downloaded = s.statistics?.episodeFileCount ?? 0;
      return acc + (s.monitored ? total - downloaded : 0);
    }, 0),
    queueCount: queue.length,
  }), [seriesList, queue]);

  const loadData = useCallback(async (showLoader = true) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);

    try {
      const [seriesData, queueData, foldersData, profilesData] = await Promise.all([
        sonarrService.getSeries(),
        sonarrService.getQueue(1, 50),
        sonarrService.getRootFolders(),
        sonarrService.getQualityProfiles(),
      ]);

      setSeriesList(seriesData);
      setQueue(queueData.records);
      setRootFolders(foldersData);
      setQualityProfiles(profilesData);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isConfigured]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData(false);
  }, [loadData]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await sonarrService.searchSeries(searchQuery.trim());
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleAddSeries = useCallback((result: SonarrLookupResult) => {
    setSelectedSeries(result);
    setShowAddModal(true);
  }, []);

  const handleConfirmAdd = useCallback(async (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMissingEpisodes: boolean;
    seriesType: 'standard' | 'daily' | 'anime';
  }) => {
    if (!selectedSeries) return;

    setIsAdding(true);
    try {
      await sonarrService.addSeries({
        tvdbId: selectedSeries.tvdbId,
        title: selectedSeries.title,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        searchForMissingEpisodes: options.searchForMissingEpisodes,
        seriesType: options.seriesType,
      });
      Alert.alert('Success', `${selectedSeries.title} has been added to Sonarr`);
      setShowAddModal(false);
      setSelectedSeries(null);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add series');
    } finally {
      setIsAdding(false);
    }
  }, [selectedSeries, loadData]);

  const handleRemoveFromQueue = useCallback(async (id: number) => {
    try {
      await sonarrService.removeFromQueue(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove from queue');
    }
  }, []);

  const handleTriggerSeriesSearch = useCallback(async (series: SonarrSeries) => {
    setSearchingSeriesId(series.id);
    try {
      await sonarrService.triggerSeriesSearch(series.id);
      Alert.alert('Search Started', `Searching for missing episodes of ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to trigger search');
    } finally {
      setSearchingSeriesId(null);
    }
  }, []);

  const handleToggleMonitored = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...series, monitored: !series.monitored }),
        }
      );
      if (!response.ok) throw new Error('Failed to update series');

      const updatedSeries = await response.json();
      setSeriesList(prev => prev.map(s => s.id === series.id ? updatedSeries : s));
      setDetailSeries(updatedSeries);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle monitored status');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleDeleteSeries = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}?deleteFiles=false`,
        {
          method: 'DELETE',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
          },
        }
      );
      if (!response.ok) throw new Error('Failed to delete series');

      setSeriesList(prev => prev.filter(s => s.id !== series.id));
      setShowDetailModal(false);
      setDetailSeries(null);
      Alert.alert('Success', `${series.title} has been removed from Sonarr`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to delete series');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleRefreshSeries = useCallback(async (series: SonarrSeries) => {
    setIsDetailLoading(true);
    try {
      await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/command`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'RefreshSeries', seriesId: series.id }),
        }
      );
      Alert.alert('Refresh Started', `Refreshing metadata for ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh series');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleSearchSeason = useCallback(async (series: SonarrSeries, seasonNumber: number) => {
    try {
      await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/command`,
        {
          method: 'POST',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'SeasonSearch',
            seriesId: series.id,
            seasonNumber,
          }),
        }
      );
      Alert.alert('Search Started', `Searching for Season ${seasonNumber} of ${series.title}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search season');
    }
  }, []);

  const handleToggleSeasonMonitored = useCallback(async (
    series: SonarrSeries,
    seasonNumber: number,
    monitored: boolean
  ) => {
    setIsDetailLoading(true);
    try {
      const updatedSeasons = series.seasons.map(s =>
        s.seasonNumber === seasonNumber ? { ...s, monitored } : s
      );

      const response = await fetch(
        `${useSettingsStore.getState().sonarrUrl}/api/v3/series/${series.id}`,
        {
          method: 'PUT',
          headers: {
            'X-Api-Key': useSettingsStore.getState().sonarrApiKey || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...series, seasons: updatedSeasons }),
        }
      );
      if (!response.ok) throw new Error('Failed to update season');

      const updatedSeries = await response.json();
      setSeriesList(prev => prev.map(s => s.id === series.id ? updatedSeries : s));
      setDetailSeries(updatedSeries);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to toggle season monitoring');
    } finally {
      setIsDetailLoading(false);
    }
  }, []);

  const handleManualSearch = useCallback(async (series: SonarrSeries, seasonNumber?: number) => {
    setManualSearchSeasonNumber(seasonNumber);
    setShowManualSearch(true);
    setIsManualSearchLoading(true);
    setManualSearchReleases([]);
    try {
      const releases = seasonNumber !== undefined
        ? await sonarrService.manualSearchSeason(series.id, seasonNumber)
        : await sonarrService.manualSearchSeries(series.id);
      setManualSearchReleases(releases);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search indexers');
      setShowManualSearch(false);
    } finally {
      setIsManualSearchLoading(false);
    }
  }, []);

  const handleDownloadRelease = useCallback(async (release: SonarrRelease) => {
    try {
      await sonarrService.downloadRelease(release.guid, release.indexerId);
      Alert.alert('Success', 'Download started');
      setShowManualSearch(false);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to start download');
    }
  }, [loadData]);

  const handleOpenSeriesDetail = useCallback(async (series: SonarrSeries) => {
    setDetailSeries(series);
    setDetailEpisodes([]);
    setShowDetailModal(true);
    try {
      const episodes = await sonarrService.getEpisodes(series.id);
      setDetailEpisodes(episodes);
    } catch (e) {
      // Silently fail - episodes just won't be shown
    }
  }, []);

  const handleSearchEpisode = useCallback(async (episodeId: number) => {
    try {
      await sonarrService.searchEpisode(episodeId);
      Alert.alert('Success', 'Episode search started');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search episode');
    }
  }, []);

  const filteredAndSortedSeries = useMemo(() => {
    let filtered = seriesList.filter((series) => {
      const percent = series.statistics?.percentOfEpisodes ?? 0;
      if (filter === 'continuing') return !series.ended && series.monitored;
      if (filter === 'ended') return series.ended && series.monitored;
      if (filter === 'missing') return series.monitored && percent < 100;
      if (filter === 'unmonitored') return !series.monitored;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sortBy === 'title') return a.sortTitle.localeCompare(b.sortTitle);
      if (sortBy === 'year') return b.year - a.year;
      if (sortBy === 'dateAdded') return new Date(b.added).getTime() - new Date(a.added).getTime();
      return 0;
    });
  }, [seriesList, filter, sortBy]);

  const renderLibraryItem = useCallback(({ item, index }: { item: SonarrSeries; index: number }) => (
    <SeriesCard
      series={item}
      viewMode={viewMode}
      gridItemWidth={gridItemWidth}
      onPress={handleOpenSeriesDetail}
      index={index}
    />
  ), [viewMode, gridItemWidth, handleOpenSeriesDetail]);

  const renderSearchItem = useCallback(({ item, index }: { item: SonarrLookupResult; index: number }) => (
    <SearchResultCard
      result={item}
      onAdd={handleAddSeries}
      existingSeries={seriesList.find((s) => s.tvdbId === item.tvdbId)}
      index={index}
    />
  ), [handleAddSeries, seriesList]);

  const renderQueueItem = useCallback(({ item, index }: { item: SonarrQueueItem; index: number }) => (
    <QueueItemCard
      item={item}
      onRemove={handleRemoveFromQueue}
      index={index}
    />
  ), [handleRemoveFromQueue]);

  const renderSkeletonList = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonListCard key={i} />
      ))}
    </View>
  );

  const renderSkeletonGrid = () => (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <SkeletonGridCard key={i} width={gridItemWidth} />
      ))}
    </View>
  );

  const renderSkeletonQueue = () => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonQueueCard key={i} />
      ))}
    </View>
  );

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <LinearGradient
          colors={[SONARR_BLUE, SONARR_DARK, colors.background.primary]}
          locations={[0, 0.3, 0.6]}
          style={styles.notConfiguredGradient}
        />
        <Animated.View entering={FadeIn.duration(600)} style={styles.notConfigured}>
          <View style={styles.notConfiguredIcon}>
            <LinearGradient colors={SONARR_GRADIENT} style={styles.notConfiguredIconGradient}>
              <Ionicons name="tv" size={56} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.notConfiguredTitle}>Sonarr Not Configured</Text>
          <Text style={styles.notConfiguredSubtitle}>
            Connect your Sonarr server to manage TV series
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.configureButton,
              { opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => router.push('/settings/sonarr')}
          >
            <LinearGradient colors={SONARR_GRADIENT} style={styles.configureGradient}>
              <Ionicons name="settings" size={20} color="#fff" />
              <Text style={styles.configureButtonText}>Configure Sonarr</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <RNAnimated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient colors={[SONARR_BLUE, '#1a8fc9']} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="tv" size={24} color="#fff" />
              <Text style={styles.headerTitle}>Sonarr</Text>
            </View>
            <Pressable
              style={styles.calendarBtn}
              onPress={() => router.push('/settings/sonarr-calendar')}
            >
              <Ionicons name="calendar" size={22} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>
      </RNAnimated.View>

      <RNAnimated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={SONARR_BLUE} />
        }
      >
        <View style={styles.statsContainer}>
          <StatCard label="Series" value={stats.totalSeries} icon="tv" color={SONARR_BLUE} delay={0} />
          <StatCard label="Have" value={stats.episodesDownloaded} icon="checkmark-circle" color={colors.status.success} delay={50} />
          <StatCard label="Missing" value={stats.missingEpisodes} icon="time" color={colors.status.warning} delay={100} />
          <StatCard label="Queue" value={stats.queueCount} icon="cloud-download" color={colors.status.info} delay={150} />
        </View>

        <View style={styles.tabsWrapper}>
          <View style={styles.tabs}>
            {(['library', 'queue', 'search'] as TabType[]).map((tab) => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons
                  name={tab === 'library' ? 'library' : tab === 'queue' ? 'cloud-download' : 'search'}
                  size={18}
                  color={activeTab === tab ? SONARR_BLUE : colors.text.tertiary}
                />
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {activeTab === 'search' && (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputWrapper}>
              <Ionicons name="search" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search TV shows..."
                placeholderTextColor={colors.text.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                </Pressable>
              )}
            </View>
            <Pressable style={styles.searchBtn} onPress={handleSearch} disabled={isSearching}>
              <LinearGradient colors={SONARR_GRADIENT} style={styles.searchBtnGradient}>
                {isSearching ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#fff" />
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {activeTab === 'library' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'continuing', 'ended', 'missing', 'unmonitored'] as FilterType[]).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All Series' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {activeTab === 'library' && (
          isLoading ? (
            viewMode === 'grid' ? renderSkeletonGrid() : renderSkeletonList()
          ) : filteredAndSortedSeries.length === 0 ? (
            <EmptyState
              icon="tv-outline"
              title="No Series Found"
              message={filter === 'all' ? 'Add some TV shows to get started' : 'No series match this filter'}
            />
          ) : viewMode === 'grid' ? (
            <View style={styles.movieGrid}>
              {filteredAndSortedSeries.map((item, index) => (
                <SeriesCard
                  key={item.id}
                  series={item}
                  viewMode={viewMode}
                  gridItemWidth={gridItemWidth}
                  onPress={handleOpenSeriesDetail}
                  index={index}
                />
              ))}
            </View>
          ) : (
            <View style={styles.listContainer}>
              {filteredAndSortedSeries.map((item, index) => (
                <SeriesCard
                  key={item.id}
                  series={item}
                  viewMode={viewMode}
                  gridItemWidth={gridItemWidth}
                  onPress={handleOpenSeriesDetail}
                  index={index}
                />
              ))}
            </View>
          )
        )}

        {activeTab === 'queue' && (
          isLoading ? (
            renderSkeletonQueue()
          ) : queue.length === 0 ? (
            <EmptyState
              icon="cloud-download-outline"
              title="Queue Empty"
              message="Nothing is currently downloading"
            />
          ) : (
            <View style={styles.listContainer}>
              {queue.map((item, index) => (
                <QueueItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFromQueue}
                  index={index}
                />
              ))}
            </View>
          )
        )}

        {activeTab === 'search' && (
          searchResults.length > 0 ? (
            <View style={styles.listContainer}>
              {searchResults.map((item, index) => (
                <SearchResultCard
                  key={item.tvdbId}
                  result={item}
                  onAdd={handleAddSeries}
                  existingSeries={seriesList.find((s) => s.tvdbId === item.tvdbId)}
                  index={index}
                />
              ))}
            </View>
          ) : searchQuery.length > 0 && !isSearching ? (
            <EmptyState
              icon="search-outline"
              title="No Results"
              message="Try a different search term"
            />
          ) : null
        )}
      </RNAnimated.ScrollView>

      <AddSeriesModal
        visible={showAddModal}
        series={selectedSeries}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSeries(null);
        }}
        onAdd={handleConfirmAdd}
        isAdding={isAdding}
      />

      <SeriesDetailModal
        visible={showDetailModal}
        series={detailSeries}
        episodes={detailEpisodes}
        onClose={() => {
          setShowDetailModal(false);
          setDetailSeries(null);
          setDetailEpisodes([]);
        }}
        onToggleMonitored={handleToggleMonitored}
        onDelete={handleDeleteSeries}
        onRefresh={handleRefreshSeries}
        onSearchSeries={handleTriggerSeriesSearch}
        onSearchSeason={handleSearchSeason}
        onSearchEpisode={handleSearchEpisode}
        onManualSearch={handleManualSearch}
        onToggleSeasonMonitored={handleToggleSeasonMonitored}
        isLoading={isDetailLoading}
      />

      <ManualSearchModal
        visible={showManualSearch}
        series={detailSeries}
        seasonNumber={manualSearchSeasonNumber}
        releases={manualSearchReleases}
        isLoading={isManualSearchLoading}
        onClose={() => setShowManualSearch(false)}
        onDownload={handleDownloadRelease}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: 120,
    gap: spacing[3],
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
    alignItems: 'center',
    overflow: 'hidden',
  },
  statGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statLabel: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginTop: spacing[1],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabsWrapper: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[1],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    gap: spacing[2],
    borderRadius: borderRadius.lg,
  },
  tabActive: {
    backgroundColor: colors.surface.elevated,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: SONARR_BLUE,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[2],
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[3],
    color: '#fff',
    fontSize: 15,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  searchBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterScroll: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
  },
  filterChipActive: {
    backgroundColor: `${SONARR_BLUE}25`,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  filterChipTextActive: {
    color: SONARR_BLUE,
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[2],
  },
  listContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  // Legacy styles kept for compatibility
  skeletonContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[1],
  },
  viewButton: {
    padding: spacing[2],
    borderRadius: borderRadius.md,
  },
  viewButtonActive: {
    backgroundColor: colors.surface.elevated,
  },
  listContent: {
    paddingBottom: spacing[20],
  },
  gridContent: {
    padding: spacing[4],
    paddingBottom: spacing[20],
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[2],
  },
  skeletonListCard: {
    flexDirection: 'row',
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    gap: spacing[4],
  },
  skeletonListInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonQueueInner: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  skeletonQueueContent: {
    flex: 1,
    justifyContent: 'center',
  },
  listCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  listCardInner: {
    position: 'relative',
    minHeight: 130,
  },
  listBackdrop: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },
  listGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  listCardContent: {
    flexDirection: 'row',
    padding: spacing[4],
    gap: spacing[4],
    paddingBottom: spacing[20],
  },
  listPosterWrapper: {
    position: 'relative',
  },
  listPoster: {
    width: 70,
    height: 105,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.elevated,
  },
  posterShadow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  listTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  endedBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  endedText: {
    color: colors.text.tertiary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
    flexWrap: 'wrap',
  },
  listSubtitle: {
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
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    marginTop: spacing[2],
  },
  ratingText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: spacing[1],
  },
  episodeProgress: {
    marginTop: spacing[3],
  },
  progressBarContainer: {
    marginBottom: spacing[1],
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  episodeCount: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    gap: spacing[3],
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sizeText: {
    color: colors.text.muted,
    fontSize: 11,
  },
  searchActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  searchButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCard: {
    padding: spacing[1],
  },
  gridPosterContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface.default,
  },
  gridPoster: {
    width: '100%',
    height: '100%',
  },
  noPosterGrid: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
  },
  gridStatusBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  unmonitoredBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: spacing[1],
    borderRadius: borderRadius.sm,
  },
  gridProgressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  gridProgressFill: {
    height: '100%',
  },
  gridTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing[2],
  },
  gridMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  gridYear: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  gridDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.muted,
    marginHorizontal: spacing[1.5],
  },
  gridNetwork: {
    color: colors.text.tertiary,
    fontSize: 11,
    flex: 1,
  },
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
  queueCard: {
    marginHorizontal: spacing[4],
    marginVertical: spacing[2],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  queueCardInner: {
    flexDirection: 'row',
  },
  queuePoster: {
    width: 70,
    height: '100%',
    minHeight: 105,
  },
  queueContent: {
    flex: 1,
    padding: spacing[4],
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  queueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  queueTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  episodeBadge: {
    backgroundColor: SONARR_BLUE,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.sm,
  },
  episodeBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: spacing[1],
  },
  removeBtn: {
    padding: spacing[1],
  },
  queueMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[2],
  },
  queueStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1.5],
  },
  queueStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timeLeft: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  queueProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[3],
  },
  queueProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: colors.surface.elevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  queueProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  queueProgressText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  queueSize: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  qualityBadge: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  qualityText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emptyIconContainer: {
    marginBottom: spacing[4],
  },
  emptyIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  notConfigured: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  notConfiguredGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  notConfiguredIcon: {
    marginBottom: spacing[6],
  },
  notConfiguredIconGradient: {
    width: 120,
    height: 120,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConfiguredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  notConfiguredSubtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: spacing[3],
    textAlign: 'center',
    lineHeight: 24,
  },
  configureButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginTop: spacing[8],
  },
  configureGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  configureButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '90%',
    overflow: 'hidden',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: spacing[2],
  },
  modalScroll: {
    padding: spacing[4],
  },
  seriesPreview: {
    flexDirection: 'row',
    marginBottom: spacing[6],
    gap: spacing[4],
  },
  previewPoster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface.default,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  previewYear: {
    color: colors.text.secondary,
    fontSize: 15,
    marginTop: spacing[1],
  },
  previewNetwork: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[1],
  },
  sectionLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing[3],
    marginTop: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionScroll: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  optionButton: {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface.default,
    overflow: 'hidden',
  },
  optionButtonActive: {
    backgroundColor: 'transparent',
  },
  optionGradient: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  optionText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  optionTextActive: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderOptionActive: {
    borderColor: SONARR_BLUE,
    backgroundColor: 'rgba(53, 197, 244, 0.1)',
  },
  folderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  folderPath: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  folderSpace: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: spacing[2],
    marginLeft: spacing[8],
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[2],
    padding: spacing[3],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  addSeriesButton: {
    margin: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  addSeriesGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  addSeriesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
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
  seasonSize: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: spacing[2],
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
  episodeTitle: {
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
  // Manual Search Modal styles
  manualSearchOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  manualSearchBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  manualSearchModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
    minHeight: '50%',
  },
  manualSearchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  manualSearchTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  manualSearchSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing[1],
    maxWidth: 280,
  },
  manualSearchClose: {
    padding: spacing[2],
  },
  manualSearchLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[4],
  },
  manualSearchLoadingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  manualSearchEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    gap: spacing[3],
  },
  manualSearchEmptyText: {
    color: colors.text.muted,
    fontSize: 14,
  },
  releaseList: {
    padding: spacing[4],
    gap: spacing[3],
  },
  releaseCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  releaseCardRejected: {
    opacity: 0.5,
  },
  releaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  releaseSize: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  fullSeasonBadge: {
    backgroundColor: `${SONARR_BLUE}20`,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },
  fullSeasonText: {
    color: SONARR_BLUE,
    fontSize: 10,
    fontWeight: '600',
  },
  releaseTitle: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing[2],
  },
  releaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  releaseIndexer: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  seedersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  seedersText: {
    color: colors.status.success,
    fontSize: 11,
    fontWeight: '600',
  },
  releaseAge: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  rejectionText: {
    color: colors.status.error,
    fontSize: 11,
    marginTop: spacing[2],
  },
});
