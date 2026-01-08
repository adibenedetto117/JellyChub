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
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { useSettingsStore } from '@/stores/settingsStore';
import { radarrService } from '@/services';
import type {
  RadarrMovie,
  RadarrLookupResult,
  RadarrQueueItem,
  RadarrRootFolder,
  RadarrQualityProfile,
  RadarrRelease,
} from '@/services/radarrService';
import { colors, spacing, borderRadius } from '@/theme';
import { formatBytes, goBack } from '@/utils';
import { Skeleton } from '@/components/ui';

const RADARR_ORANGE = '#ffc230';
const RADARR_DARK = '#1a1a1a';
const RADARR_GRADIENT = ['#ffc230', '#f5a623', '#e8941f'];

type TabType = 'library' | 'queue' | 'search';
type FilterType = 'all' | 'downloaded' | 'missing' | 'unmonitored';

interface Stats {
  total: number;
  downloaded: number;
  missing: number;
  queue: number;
}

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  const stars = Math.round(rating / 2);
  return (
    <View style={styles.starContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Ionicons
          key={star}
          name={star <= stars ? 'star' : 'star-outline'}
          size={size}
          color={star <= stars ? RADARR_ORANGE : colors.text.muted}
        />
      ))}
      <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
    </View>
  );
}

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

function getQualityBadgeColor(quality: string): string {
  const q = quality.toLowerCase();
  if (q.includes('2160') || q.includes('4k') || q.includes('uhd')) return '#9333ea';
  if (q.includes('1080')) return '#3b82f6';
  if (q.includes('720')) return '#22c55e';
  if (q.includes('480') || q.includes('sd')) return '#f59e0b';
  return colors.text.tertiary;
}

function MovieCard({
  movie,
  onPress,
  delay = 0,
}: {
  movie: RadarrMovie;
  onPress: () => void;
  delay?: number;
}) {
  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = poster?.remoteUrl || poster?.url;
  const rating = movie.ratings?.tmdb?.value || movie.ratings?.imdb?.value || 0;

  const getStatusInfo = () => {
    if (movie.hasFile) return { color: colors.status.success, label: 'Downloaded', icon: 'checkmark-circle' };
    if (movie.monitored) return { color: colors.status.warning, label: 'Missing', icon: 'time' };
    return { color: colors.text.muted, label: 'Unmonitored', icon: 'eye-off' };
  };

  const status = getStatusInfo();

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <Pressable
        style={({ pressed }) => [styles.movieCard, pressed && styles.movieCardPressed]}
        onPress={onPress}
      >
        <View style={styles.moviePosterContainer}>
          {posterUrl ? (
            <Image source={{ uri: posterUrl }} style={styles.moviePoster} contentFit="cover" />
          ) : (
            <View style={[styles.moviePoster, styles.noPoster]}>
              <Ionicons name="film-outline" size={40} color={colors.text.muted} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.95)']}
            style={styles.posterGradient}
          />
          <View style={styles.posterOverlay}>
            <View style={styles.yearBadge}>
              <Text style={styles.yearText}>{movie.year}</Text>
            </View>
            {movie.sizeOnDisk > 0 && (
              <View style={styles.sizeBadge}>
                <Ionicons name="folder" size={10} color="#fff" />
                <Text style={styles.sizeText}>{formatBytes(movie.sizeOnDisk)}</Text>
              </View>
            )}
          </View>
          <View style={[styles.statusIndicator, { backgroundColor: status.color }]}>
            <Ionicons name={status.icon as any} size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.movieInfo}>
          <Text style={styles.movieTitle} numberOfLines={1}>{movie.title}</Text>
          <View style={styles.movieMeta}>
            {rating > 0 && <StarRating rating={rating} size={10} />}
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function QueueCard({
  item,
  onRemove,
  delay = 0,
}: {
  item: RadarrQueueItem;
  onRemove: () => void;
  delay?: number;
}) {
  const progress = item.size > 0 ? ((item.size - item.sizeleft) / item.size) * 100 : 0;
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withSpring(progress, { damping: 15 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value}%`,
  }));

  const getStatusInfo = () => {
    if (item.trackedDownloadState === 'importPending') return { color: colors.status.success, label: 'Import Pending' };
    if (item.trackedDownloadState === 'downloading') return { color: colors.status.info, label: 'Downloading' };
    if (item.status === 'warning') return { color: colors.status.warning, label: 'Warning' };
    if (item.status === 'failed') return { color: colors.status.error, label: 'Failed' };
    return { color: colors.text.tertiary, label: item.status };
  };

  const status = getStatusInfo();
  const qualityColor = getQualityBadgeColor(item.quality?.quality?.name || '');

  return (
    <Animated.View entering={SlideInRight.delay(delay).springify()} style={styles.queueCard}>
      <LinearGradient
        colors={[`${status.color}08`, 'transparent']}
        style={styles.queueGradientBg}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      <View style={styles.queueHeader}>
        <View style={styles.queueTitleContainer}>
          <Text style={styles.queueTitle} numberOfLines={1}>{item.movie?.title || item.title}</Text>
          {item.quality?.quality?.name && (
            <View style={[styles.qualityBadge, { backgroundColor: `${qualityColor}20`, borderColor: qualityColor }]}>
              <Text style={[styles.qualityText, { color: qualityColor }]}>{item.quality.quality.name}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={onRemove} style={styles.queueRemoveBtn}>
          <Ionicons name="close-circle" size={24} color={colors.text.tertiary} />
        </Pressable>
      </View>

      <View style={styles.queueStatus}>
        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
        <Text style={[styles.queueStatusText, { color: status.color }]}>{status.label}</Text>
        {item.timeleft && (
          <Text style={styles.queueTimeLeft}>{item.timeleft} left</Text>
        )}
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressBar, { backgroundColor: status.color }, progressStyle]}>
            <LinearGradient
              colors={[`${status.color}`, `${status.color}cc`]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </Animated.View>
        </View>
        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.queueFooter}>
        <Text style={styles.queueSize}>
          {formatBytes(item.size - item.sizeleft)} / {formatBytes(item.size)}
        </Text>
        {item.indexer && (
          <Text style={styles.queueIndexer}>{item.indexer}</Text>
        )}
      </View>
    </Animated.View>
  );
}

function SearchResultCard({
  result,
  onAdd,
  existingMovie,
  delay = 0,
}: {
  result: RadarrLookupResult;
  onAdd: () => void;
  existingMovie?: RadarrMovie;
  delay?: number;
}) {
  const poster = result.images.find((i) => i.coverType === 'poster');
  const posterUrl = result.remotePoster || poster?.remoteUrl || poster?.url;
  const rating = result.ratings?.tmdb?.value || result.ratings?.imdb?.value || 0;

  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()} style={styles.searchCard}>
      <View style={styles.searchPosterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.searchPoster} contentFit="cover" />
        ) : (
          <View style={[styles.searchPoster, styles.noPoster]}>
            <Ionicons name="film-outline" size={32} color={colors.text.muted} />
          </View>
        )}
      </View>
      <View style={styles.searchInfo}>
        <Text style={styles.searchTitle} numberOfLines={2}>{result.title}</Text>
        <View style={styles.searchMeta}>
          <Text style={styles.searchYear}>{result.year}</Text>
          {result.runtime > 0 && (
            <Text style={styles.searchRuntime}>{result.runtime} min</Text>
          )}
        </View>
        {rating > 0 && <StarRating rating={rating} />}
        {result.overview && (
          <Text style={styles.searchOverview} numberOfLines={2}>{result.overview}</Text>
        )}
        {result.genres.length > 0 && (
          <View style={styles.genreContainer}>
            {result.genres.slice(0, 3).map((genre) => (
              <View key={genre} style={styles.genreChip}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {existingMovie ? (
        <View style={styles.inLibraryBadge}>
          <Ionicons name="checkmark-circle" size={24} color={colors.status.success} />
        </View>
      ) : (
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <LinearGradient colors={RADARR_GRADIENT} style={styles.addBtnGradient}>
            <Ionicons name="add" size={24} color="#000" />
          </LinearGradient>
        </Pressable>
      )}
    </Animated.View>
  );
}

function MovieDetailModal({
  visible,
  movie,
  onClose,
  onToggleMonitored,
  onDelete,
  onRefresh,
  onSearch,
  onManualSearch,
}: {
  visible: boolean;
  movie: RadarrMovie | null;
  onClose: () => void;
  onToggleMonitored: () => void;
  onDelete: () => void;
  onRefresh: () => void;
  onSearch: () => void;
  onManualSearch: () => void;
}) {
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
              colors={['transparent', 'rgba(0,0,0,0.9)', colors.background.secondary]}
              style={styles.detailFanartGradient}
            />
            <Pressable style={styles.detailCloseBtn} onPress={onClose}>
              <BlurView intensity={80} style={styles.blurBtn}>
                <Ionicons name="close" size={24} color="#fff" />
              </BlurView>
            </Pressable>
            <View style={styles.detailHeaderContent}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.detailPoster} contentFit="cover" />
              ) : (
                <View style={[styles.detailPoster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={40} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.detailHeaderInfo}>
                <Text style={styles.detailTitle}>{movie.title}</Text>
                <View style={styles.detailMetaRow}>
                  <Text style={styles.detailYear}>{movie.year}</Text>
                  {movie.runtime > 0 && (
                    <Text style={styles.detailRuntime}>{movie.runtime} min</Text>
                  )}
                </View>
                {rating > 0 && <StarRating rating={rating} size={14} />}
                <View style={[styles.detailStatusBadge, { backgroundColor: `${status.color}20` }]}>
                  <Ionicons name={status.icon as any} size={14} color={status.color} />
                  <Text style={[styles.detailStatusText, { color: status.color }]}>{status.label}</Text>
                </View>
              </View>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {movie.overview && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Overview</Text>
                <Text style={styles.detailOverview}>{movie.overview}</Text>
              </View>
            )}

            {movie.genres.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Genres</Text>
                <View style={styles.genreContainer}>
                  {movie.genres.map((genre) => (
                    <View key={genre} style={styles.genreChip}>
                      <Text style={styles.genreText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {movie.hasFile && movie.sizeOnDisk > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>File Info</Text>
                <View style={styles.fileInfoCard}>
                  <View style={styles.fileInfoRow}>
                    <Ionicons name="folder" size={16} color={RADARR_ORANGE} />
                    <Text style={styles.fileInfoText}>{formatBytes(movie.sizeOnDisk)}</Text>
                  </View>
                  {movie.path && (
                    <Text style={styles.filePath} numberOfLines={2}>{movie.path}</Text>
                  )}
                </View>
              </View>
            )}

            <View style={styles.detailActions}>
              <Pressable
                style={[styles.actionBtn, movie.monitored && styles.actionBtnActive]}
                onPress={onToggleMonitored}
              >
                <Ionicons
                  name={movie.monitored ? 'eye' : 'eye-off'}
                  size={20}
                  color={movie.monitored ? RADARR_ORANGE : colors.text.tertiary}
                />
                <Text style={[styles.actionBtnText, movie.monitored && { color: RADARR_ORANGE }]}>
                  {movie.monitored ? 'Monitored' : 'Unmonitored'}
                </Text>
              </Pressable>

              <Pressable style={styles.actionBtn} onPress={onRefresh}>
                <Ionicons name="refresh" size={20} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Refresh</Text>
              </Pressable>

              {!movie.hasFile && movie.monitored && (
                <Pressable style={styles.actionBtn} onPress={onSearch}>
                  <Ionicons name="search" size={20} color={colors.text.secondary} />
                  <Text style={styles.actionBtnText}>Auto Search</Text>
                </Pressable>
              )}

              <Pressable style={styles.actionBtn} onPress={onManualSearch}>
                <Ionicons name="list" size={20} color={colors.text.secondary} />
                <Text style={styles.actionBtnText}>Manual Search</Text>
              </Pressable>

              <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={onDelete}>
                <Ionicons name="trash" size={20} color={colors.status.error} />
                <Text style={[styles.actionBtnText, { color: colors.status.error }]}>Delete</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function ManualSearchModal({
  visible,
  movie,
  releases,
  isLoading,
  onClose,
  onDownload,
}: {
  visible: boolean;
  movie: RadarrMovie | null;
  releases: RadarrRelease[];
  isLoading: boolean;
  onClose: () => void;
  onDownload: (release: RadarrRelease) => void;
}) {
  if (!movie) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.manualSearchModal}>
          <View style={styles.manualSearchHeader}>
            <Text style={styles.manualSearchTitle}>Manual Search</Text>
            <Text style={styles.manualSearchSubtitle}>{movie.title}</Text>
            <Pressable style={styles.manualSearchClose} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.manualSearchLoading}>
              <ActivityIndicator size="large" color={RADARR_ORANGE} />
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

function AddMovieModal({
  visible,
  movie,
  rootFolders,
  qualityProfiles,
  onClose,
  onAdd,
  isAdding,
}: {
  visible: boolean;
  movie: RadarrLookupResult | null;
  rootFolders: RadarrRootFolder[];
  qualityProfiles: RadarrQualityProfile[];
  onClose: () => void;
  onAdd: (options: { qualityProfileId: number; rootFolderPath: string; searchForMovie: boolean }) => void;
  isAdding: boolean;
}) {
  const [selectedQuality, setSelectedQuality] = useState<number>(0);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [searchForMovie, setSearchForMovie] = useState(true);

  useEffect(() => {
    if (qualityProfiles.length > 0 && !selectedQuality) {
      setSelectedQuality(qualityProfiles[0].id);
    }
    if (rootFolders.length > 0 && !selectedFolder) {
      setSelectedFolder(rootFolders[0].path);
    }
  }, [qualityProfiles, rootFolders]);

  if (!movie) return null;

  const poster = movie.images.find((i) => i.coverType === 'poster');
  const posterUrl = movie.remotePoster || poster?.remoteUrl || poster?.url;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <Animated.View entering={FadeInUp.springify()} style={styles.addModal}>
          <View style={styles.addModalHeader}>
            <LinearGradient colors={RADARR_GRADIENT} style={styles.addModalHeaderGradient}>
              <Text style={styles.addModalTitle}>Add Movie</Text>
              <Pressable style={styles.addModalClose} onPress={onClose}>
                <Ionicons name="close" size={24} color="#000" />
              </Pressable>
            </LinearGradient>
          </View>

          <ScrollView style={styles.addModalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.addMoviePreview}>
              {posterUrl ? (
                <Image source={{ uri: posterUrl }} style={styles.addPreviewPoster} contentFit="cover" />
              ) : (
                <View style={[styles.addPreviewPoster, styles.noPoster]}>
                  <Ionicons name="film-outline" size={32} color={colors.text.muted} />
                </View>
              )}
              <View style={styles.addPreviewInfo}>
                <Text style={styles.addPreviewTitle}>{movie.title}</Text>
                <Text style={styles.addPreviewYear}>{movie.year}</Text>
              </View>
            </View>

            <Text style={styles.addSectionLabel}>Quality Profile</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.optionScroll}>
              {qualityProfiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  style={[styles.optionChip, selectedQuality === profile.id && styles.optionChipActive]}
                  onPress={() => setSelectedQuality(profile.id)}
                >
                  <Text style={[styles.optionChipText, selectedQuality === profile.id && styles.optionChipTextActive]}>
                    {profile.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.addSectionLabel}>Root Folder</Text>
            {rootFolders.map((folder) => (
              <Pressable
                key={folder.id}
                style={[styles.folderOption, selectedFolder === folder.path && styles.folderOptionActive]}
                onPress={() => setSelectedFolder(folder.path)}
              >
                <View style={styles.folderRadio}>
                  <Ionicons
                    name={selectedFolder === folder.path ? 'radio-button-on' : 'radio-button-off'}
                    size={22}
                    color={selectedFolder === folder.path ? RADARR_ORANGE : colors.text.tertiary}
                  />
                  <Text style={styles.folderPath} numberOfLines={1}>{folder.path}</Text>
                </View>
                <Text style={styles.folderSpace}>{formatBytes(folder.freeSpace)} free</Text>
              </Pressable>
            ))}

            <Pressable style={styles.searchToggle} onPress={() => setSearchForMovie(!searchForMovie)}>
              <View style={[styles.checkbox, searchForMovie && styles.checkboxActive]}>
                {searchForMovie && <Ionicons name="checkmark" size={16} color="#000" />}
              </View>
              <Text style={styles.searchToggleText}>Search for movie after adding</Text>
            </Pressable>
          </ScrollView>

          <Pressable
            style={styles.addMovieBtn}
            onPress={() => onAdd({ qualityProfileId: selectedQuality, rootFolderPath: selectedFolder, searchForMovie })}
            disabled={isAdding}
          >
            <LinearGradient colors={RADARR_GRADIENT} style={styles.addMovieBtnGradient}>
              {isAdding ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color="#000" />
                  <Text style={styles.addMovieBtnText}>Add to Radarr</Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <LinearGradient colors={[`${RADARR_ORANGE}20`, 'transparent']} style={styles.emptyIconGradient} />
        <Ionicons name={icon as any} size={56} color={RADARR_ORANGE} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

export default function RadarrManageScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isConfigured = radarrService.isConfigured();
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const [activeTab, setActiveTab] = useState<TabType>('library');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const [movies, setMovies] = useState<RadarrMovie[]>([]);
  const [searchResults, setSearchResults] = useState<RadarrLookupResult[]>([]);
  const [queue, setQueue] = useState<RadarrQueueItem[]>([]);
  const [rootFolders, setRootFolders] = useState<RadarrRootFolder[]>([]);
  const [qualityProfiles, setQualityProfiles] = useState<RadarrQualityProfile[]>([]);

  const [selectedMovie, setSelectedMovie] = useState<RadarrMovie | null>(null);
  const [selectedSearchResult, setSelectedSearchResult] = useState<RadarrLookupResult | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualSearchReleases, setManualSearchReleases] = useState<RadarrRelease[]>([]);
  const [isManualSearchLoading, setIsManualSearchLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const numColumns = screenWidth > 600 ? 4 : 3;
  const cardWidth = (screenWidth - spacing[4] * 2 - spacing[3] * (numColumns - 1)) / numColumns;

  const stats: Stats = useMemo(() => ({
    total: movies.length,
    downloaded: movies.filter((m) => m.hasFile).length,
    missing: movies.filter((m) => m.monitored && !m.hasFile).length,
    queue: queue.length,
  }), [movies, queue]);

  const filteredMovies = useMemo(() => {
    return movies.filter((movie) => {
      if (filter === 'downloaded') return movie.hasFile;
      if (filter === 'missing') return movie.monitored && !movie.hasFile;
      if (filter === 'unmonitored') return !movie.monitored;
      return true;
    });
  }, [movies, filter]);

  const loadData = useCallback(async (showLoader = true) => {
    if (!isConfigured) {
      setIsLoading(false);
      return;
    }

    if (showLoader) setIsLoading(true);

    try {
      const [moviesData, queueData, foldersData, profilesData] = await Promise.all([
        radarrService.getMovies(),
        radarrService.getQueue(1, 50),
        radarrService.getRootFolders(),
        radarrService.getQualityProfiles(),
      ]);

      setMovies(moviesData);
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
      const results = await radarrService.searchMovies(searchQuery.trim());
      setSearchResults(results);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleMoviePress = useCallback((movie: RadarrMovie) => {
    setSelectedMovie(movie);
    setShowDetailModal(true);
  }, []);

  const handleToggleMonitored = useCallback(async () => {
    if (!selectedMovie) return;
    setActionLoading('monitored');
    try {
      const updated = await radarrService.toggleMonitored(selectedMovie.id, !selectedMovie.monitored);
      setMovies((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      setSelectedMovie(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setActionLoading(null);
    }
  }, [selectedMovie]);

  const handleDeleteMovie = useCallback(async () => {
    if (!selectedMovie) return;

    Alert.alert(
      'Delete Movie',
      `Are you sure you want to delete "${selectedMovie.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading('delete');
            try {
              await radarrService.deleteMovie(selectedMovie.id, false);
              setMovies((prev) => prev.filter((m) => m.id !== selectedMovie.id));
              setShowDetailModal(false);
              setSelectedMovie(null);
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Failed to delete');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  }, [selectedMovie]);

  const handleRefreshMovie = useCallback(async () => {
    if (!selectedMovie) return;
    setActionLoading('refresh');
    try {
      await radarrService.refreshMovie(selectedMovie.id);
      Alert.alert('Success', 'Refresh command sent');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to refresh');
    } finally {
      setActionLoading(null);
    }
  }, [selectedMovie]);

  const handleAutoSearch = useCallback(async () => {
    if (!selectedMovie) return;
    setActionLoading('search');
    try {
      await radarrService.triggerMovieSearch(selectedMovie.id);
      Alert.alert('Success', 'Search started');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search');
    } finally {
      setActionLoading(null);
    }
  }, [selectedMovie]);

  const handleManualSearch = useCallback(async () => {
    if (!selectedMovie) return;
    setShowManualSearch(true);
    setIsManualSearchLoading(true);
    try {
      const releases = await radarrService.manualSearchMovie(selectedMovie.id);
      setManualSearchReleases(releases);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to search');
    } finally {
      setIsManualSearchLoading(false);
    }
  }, [selectedMovie]);

  const handleDownloadRelease = useCallback(async (release: RadarrRelease) => {
    try {
      await radarrService.downloadRelease(release.guid, release.indexerId);
      Alert.alert('Success', 'Download started');
      setShowManualSearch(false);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to download');
    }
  }, [loadData]);

  const handleAddMovie = useCallback((result: RadarrLookupResult) => {
    setSelectedSearchResult(result);
    setShowAddModal(true);
  }, []);

  const handleConfirmAdd = useCallback(async (options: {
    qualityProfileId: number;
    rootFolderPath: string;
    searchForMovie: boolean;
  }) => {
    if (!selectedSearchResult) return;

    setIsAdding(true);
    try {
      await radarrService.addMovie({
        tmdbId: selectedSearchResult.tmdbId,
        title: selectedSearchResult.title,
        qualityProfileId: options.qualityProfileId,
        rootFolderPath: options.rootFolderPath,
        searchForMovie: options.searchForMovie,
      });
      Alert.alert('Success', `${selectedSearchResult.title} added to Radarr`);
      setShowAddModal(false);
      setSelectedSearchResult(null);
      loadData(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to add movie');
    } finally {
      setIsAdding(false);
    }
  }, [selectedSearchResult, loadData]);

  const handleRemoveFromQueue = useCallback(async (id: number) => {
    try {
      await radarrService.removeFromQueue(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove');
    }
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  if (!isConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notConfigured}>
          <LinearGradient colors={[`${RADARR_ORANGE}30`, 'transparent']} style={styles.notConfiguredGradient} />
          <View style={styles.notConfiguredIcon}>
            <Ionicons name="film" size={64} color={RADARR_ORANGE} />
          </View>
          <Text style={styles.notConfiguredTitle}>Radarr Not Configured</Text>
          <Text style={styles.notConfiguredSubtitle}>Set up Radarr to manage your movie library</Text>
          <Pressable style={styles.configureBtn} onPress={() => router.push('/settings/radarr')}>
            <LinearGradient colors={RADARR_GRADIENT} style={styles.configureBtnGradient}>
              <Text style={styles.configureBtnText}>Configure Radarr</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <RNAnimated.View style={[styles.header, { opacity: headerOpacity }]}>
        <LinearGradient colors={[RADARR_ORANGE, '#f5a623']} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <Pressable style={styles.backBtn} onPress={() => goBack('/(tabs)/settings')}>
              <Ionicons name="chevron-back" size={24} color="#000" />
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Ionicons name="film" size={24} color="#000" />
              <Text style={styles.headerTitle}>Radarr</Text>
            </View>
            <View style={{ width: 40 }} />
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
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={RADARR_ORANGE} />
        }
      >
        <View style={styles.statsContainer}>
          <StatCard label="Total" value={stats.total} icon="film" color={RADARR_ORANGE} delay={0} />
          <StatCard label="Downloaded" value={stats.downloaded} icon="checkmark-circle" color={colors.status.success} delay={50} />
          <StatCard label="Missing" value={stats.missing} icon="time" color={colors.status.warning} delay={100} />
          <StatCard label="Queue" value={stats.queue} icon="cloud-download" color={colors.status.info} delay={150} />
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
                  color={activeTab === tab ? RADARR_ORANGE : colors.text.tertiary}
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
                placeholder="Search movies..."
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
              <LinearGradient colors={RADARR_GRADIENT} style={styles.searchBtnGradient}>
                {isSearching ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Ionicons name="search" size={20} color="#000" />
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {activeTab === 'library' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {(['all', 'downloaded', 'missing', 'unmonitored'] as FilterType[]).map((f) => (
              <Pressable
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'all' ? 'All Movies' : f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {activeTab === 'library' && (
          isLoading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 9 }).map((_, i) => (
                <View key={i} style={[styles.skeletonCard, { width: cardWidth }]}>
                  <Skeleton width={cardWidth} height={cardWidth * 1.5} borderRadius={12} />
                  <Skeleton width="80%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                  <Skeleton width="50%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
              ))}
            </View>
          ) : filteredMovies.length === 0 ? (
            <EmptyState
              icon="film-outline"
              title="No movies found"
              subtitle={filter !== 'all' ? 'Try changing your filter' : 'Add movies from the search tab'}
            />
          ) : (
            <View style={styles.movieGrid}>
              {filteredMovies.map((movie, index) => (
                <View key={movie.id} style={{ width: cardWidth }}>
                  <MovieCard
                    movie={movie}
                    onPress={() => handleMoviePress(movie)}
                    delay={Math.min(index * 30, 300)}
                  />
                </View>
              ))}
            </View>
          )
        )}

        {activeTab === 'queue' && (
          isLoading ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 4 }).map((_, i) => (
                <View key={i} style={styles.skeletonQueueCard}>
                  <Skeleton width="70%" height={18} borderRadius={4} />
                  <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                  <Skeleton width="100%" height={8} borderRadius={4} style={{ marginTop: 12 }} />
                  <Skeleton width="30%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                </View>
              ))}
            </View>
          ) : queue.length === 0 ? (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Queue is empty"
              subtitle="No downloads in progress"
            />
          ) : (
            <View style={styles.queueList}>
              {queue.map((item, index) => (
                <QueueCard
                  key={item.id}
                  item={item}
                  onRemove={() => handleRemoveFromQueue(item.id)}
                  delay={index * 50}
                />
              ))}
            </View>
          )
        )}

        {activeTab === 'search' && (
          isSearching ? (
            <View style={styles.skeletonList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <View key={i} style={styles.skeletonSearchCard}>
                  <Skeleton width={80} height={120} borderRadius={8} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Skeleton width="80%" height={16} borderRadius={4} />
                    <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
                    <Skeleton width="100%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
                    <Skeleton width="60%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
                  </View>
                </View>
              ))}
            </View>
          ) : searchResults.length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="Search for movies"
              subtitle="Find movies to add to your library"
            />
          ) : (
            <View style={styles.searchResultsList}>
              {searchResults.map((result, index) => (
                <SearchResultCard
                  key={result.tmdbId}
                  result={result}
                  onAdd={() => handleAddMovie(result)}
                  existingMovie={movies.find((m) => m.tmdbId === result.tmdbId)}
                  delay={index * 50}
                />
              ))}
            </View>
          )
        )}
      </RNAnimated.ScrollView>

      <MovieDetailModal
        visible={showDetailModal}
        movie={selectedMovie}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedMovie(null);
        }}
        onToggleMonitored={handleToggleMonitored}
        onDelete={handleDeleteMovie}
        onRefresh={handleRefreshMovie}
        onSearch={handleAutoSearch}
        onManualSearch={handleManualSearch}
      />

      <ManualSearchModal
        visible={showManualSearch}
        movie={selectedMovie}
        releases={manualSearchReleases}
        isLoading={isManualSearchLoading}
        onClose={() => setShowManualSearch(false)}
        onDownload={handleDownloadRelease}
      />

      <AddMovieModal
        visible={showAddModal}
        movie={selectedSearchResult}
        rootFolders={rootFolders}
        qualityProfiles={qualityProfiles}
        onClose={() => {
          setShowAddModal(false);
          setSelectedSearchResult(null);
        }}
        onAdd={handleConfirmAdd}
        isAdding={isAdding}
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
    backgroundColor: 'rgba(0,0,0,0.2)',
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
    color: '#000',
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
    color: RADARR_ORANGE,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing[4],
    color: '#fff',
    fontSize: 16,
  },
  searchBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    paddingVertical: spacing[2.5],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.full,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterChipTextActive: {
    color: RADARR_ORANGE,
  },
  movieGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  movieCard: {
    marginBottom: spacing[2],
  },
  movieCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  moviePosterContainer: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    aspectRatio: 2 / 3,
  },
  moviePoster: {
    width: '100%',
    height: '100%',
  },
  posterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  posterOverlay: {
    position: 'absolute',
    bottom: spacing[2],
    left: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yearBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  yearText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  sizeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  sizeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  statusIndicator: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  movieInfo: {
    paddingTop: spacing[2],
  },
  movieTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  movieMeta: {
    marginTop: spacing[1],
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: colors.text.secondary,
    fontSize: 11,
    marginLeft: spacing[1],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1.5],
    gap: spacing[1.5],
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  noPoster: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueList: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  queueCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    overflow: 'hidden',
  },
  queueGradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  queueTitleContainer: {
    flex: 1,
    gap: spacing[2],
  },
  queueTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  queueRemoveBtn: {
    padding: spacing[1],
    marginTop: -spacing[1],
    marginRight: -spacing[1],
  },
  queueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  queueStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  queueTimeLeft: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 'auto',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.surface.elevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressPercent: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    width: 45,
    textAlign: 'right',
  },
  queueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  queueSize: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  queueIndexer: {
    color: colors.text.muted,
    fontSize: 11,
  },
  qualityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  searchResultsList: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  searchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
    gap: spacing[3],
  },
  searchPosterContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  searchPoster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.lg,
  },
  searchInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  searchTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  searchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  searchYear: {
    color: RADARR_ORANGE,
    fontSize: 13,
    fontWeight: '600',
  },
  searchRuntime: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  searchOverview: {
    color: colors.text.secondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing[2],
  },
  genreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
    marginTop: spacing[2],
  },
  genreChip: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  genreText: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontWeight: '500',
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  addBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inLibraryBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.status.success}20`,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[8],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    overflow: 'hidden',
  },
  emptyIconGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyTitle: {
    color: colors.text.secondary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing[2],
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: 14,
    textAlign: 'center',
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  skeletonCard: {
    marginBottom: spacing[2],
  },
  skeletonList: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    gap: spacing[3],
  },
  skeletonQueueCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
  },
  skeletonSearchCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.xl,
    padding: spacing[3],
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${RADARR_ORANGE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[6],
  },
  notConfiguredTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: spacing[2],
  },
  notConfiguredSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  configureBtn: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  configureBtnGradient: {
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
  },
  configureBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
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
    height: 280,
    overflow: 'hidden',
  },
  detailFanart: {
    ...StyleSheet.absoluteFillObject,
  },
  detailFanartGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  detailCloseBtn: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    zIndex: 10,
  },
  blurBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    gap: spacing[4],
  },
  detailPoster: {
    width: 100,
    height: 150,
    borderRadius: borderRadius.lg,
  },
  detailHeaderInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  detailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  detailYear: {
    color: RADARR_ORANGE,
    fontSize: 15,
    fontWeight: '600',
  },
  detailRuntime: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  detailStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing[1.5],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    marginTop: spacing[3],
  },
  detailStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailContent: {
    padding: spacing[4],
  },
  detailSection: {
    marginBottom: spacing[5],
  },
  detailSectionTitle: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  detailOverview: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 22,
  },
  fileInfoCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  fileInfoText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  filePath: {
    color: colors.text.muted,
    fontSize: 11,
    marginTop: spacing[2],
  },
  detailActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingBottom: spacing[8],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.surface.default,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
  },
  actionBtnActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
  },
  actionBtnText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: `${colors.status.error}15`,
  },
  manualSearchModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '80%',
  },
  manualSearchHeader: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  manualSearchTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  manualSearchSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: spacing[1],
  },
  manualSearchClose: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
  },
  manualSearchLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  manualSearchLoadingText: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[4],
  },
  manualSearchEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[16],
  },
  manualSearchEmptyText: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: spacing[3],
  },
  releaseList: {
    padding: spacing[4],
    gap: spacing[3],
  },
  releaseCard: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[3],
  },
  releaseCardRejected: {
    opacity: 0.5,
  },
  releaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  releaseSize: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  releaseTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: spacing[2],
  },
  releaseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  releaseIndexer: {
    color: RADARR_ORANGE,
    fontSize: 12,
    fontWeight: '500',
  },
  seedersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seedersText: {
    color: colors.status.success,
    fontSize: 12,
    fontWeight: '500',
  },
  releaseAge: {
    color: colors.text.muted,
    fontSize: 11,
  },
  rejectionText: {
    color: colors.status.error,
    fontSize: 11,
    marginTop: spacing[2],
  },
  addModal: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    maxHeight: '85%',
  },
  addModalHeader: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    overflow: 'hidden',
  },
  addModalHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  addModalTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  addModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addModalContent: {
    padding: spacing[4],
  },
  addMoviePreview: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  addPreviewPoster: {
    width: 80,
    height: 120,
    borderRadius: borderRadius.lg,
  },
  addPreviewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  addPreviewTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  addPreviewYear: {
    color: RADARR_ORANGE,
    fontSize: 14,
    marginTop: spacing[1],
  },
  addSectionLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  optionScroll: {
    marginBottom: spacing[4],
  },
  optionChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    marginRight: spacing[2],
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionChipActive: {
    backgroundColor: `${RADARR_ORANGE}20`,
    borderColor: RADARR_ORANGE,
  },
  optionChipText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
  optionChipTextActive: {
    color: RADARR_ORANGE,
  },
  folderOption: {
    backgroundColor: colors.surface.default,
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[2],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  folderOptionActive: {
    borderColor: RADARR_ORANGE,
    backgroundColor: `${RADARR_ORANGE}10`,
  },
  folderRadio: {
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
    marginLeft: spacing[9],
  },
  searchToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: RADARR_ORANGE,
    borderColor: RADARR_ORANGE,
  },
  searchToggleText: {
    color: '#fff',
    fontSize: 14,
  },
  addMovieBtn: {
    margin: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  addMovieBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  addMovieBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
