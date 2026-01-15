import { View, ScrollView, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useCallback } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useDetailsScreen } from '@/hooks';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { Button } from '@/components/shared/ui/Button';
import { TrackOptionsMenu } from '@/components/shared/music/TrackOptionsMenu';
import { DownloadOptionsModal, PersonModal } from '@/components/shared/media';
import {
  ProgressBar,
  SeriesProgressBar,
  SeasonProgressBar,
  GenreTags,
  CollapsibleDescription,
  SeasonsList,
  EpisodesList,
  TracksList,
  PlaylistTracksList,
  ArtistAlbumsList,
  CollectionItemsList,
  CastSection,
  SimilarItems,
  ErrorState,
  MissingParamsError,
  DownloadIcon,
  CheckIcon,
} from '@/components/shared/details';
import { formatDuration, formatYear, formatRating, ticksToMs } from '@/utils';
import { desktopConstants } from '@/utils/platform';

const HORIZONTAL_PADDING = 32;

export function DesktopDetailScreen() {
  const details = useDetailsScreen();

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: details.contentOpacity.value,
  }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        details.handleGoBack();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (document.activeElement === document.body) {
          details.handlePlay(details.hasProgress);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [details]);

  if (!details.id || !details.rawType) {
    return (
      <MissingParamsError
        rawType={details.rawType}
        id={details.id}
        accentColor={details.accentColor}
        onGoBack={details.handleGoBack}
        t={details.t}
      />
    );
  }

  if (details.itemError) {
    return (
      <ErrorState
        message={details.t('details.errorLoading')}
        details={(details.itemError as any)?.message || details.t('errors.unknown')}
        accentColor={details.accentColor}
        onGoBack={details.handleGoBack}
        t={details.t}
      />
    );
  }

  const getPlayButtonTitle = () => {
    if (details.type === 'series') {
      return details.hasNextUpProgress
        ? details.t('details.continue')
        : details.nextUpEpisode
          ? details.t('details.play')
          : details.t('details.viewSeasons');
    }
    if (details.type === 'season') {
      return details.hasSeasonProgress ? details.t('details.continue') : details.t('details.play');
    }
    return details.hasProgress ? details.t('details.continue') : details.t('details.play');
  };

  const getResumeValue = () => {
    if (details.type === 'series') return details.hasNextUpProgress;
    if (details.type === 'season') return details.hasSeasonProgress;
    return details.hasProgress;
  };

  const showPlayButton = details.type !== 'artist' && details.type !== 'boxset';
  const showShuffleButton = details.type === 'album' || details.type === 'playlist';
  const showDownloadButton = details.type === 'movie' || details.type === 'episode' || details.type === 'book';
  const showFavoriteButton = details.type === 'movie' || details.type === 'series';

  return (
    <View style={styles.container}>
      {details.isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={details.accentColor} size="large" />
        </View>
      )}

      <Animated.View style={[styles.flex1, contentAnimatedStyle]}>
        {details.backdropUrl && (
          <View style={styles.backdropContainer}>
            <CachedImage
              uri={details.backdropUrl}
              style={StyleSheet.absoluteFill}
              showSkeleton={false}
              priority="high"
              cachePolicy="memory-disk"
            />
            <LinearGradient
              colors={['transparent', 'rgba(10,10,10,0.6)', 'rgba(10,10,10,0.95)', '#0a0a0a']}
              locations={[0, 0.4, 0.7, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

        <Pressable style={styles.backButton} onPress={details.handleGoBack}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <ScrollView
          style={styles.flex1}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.heroContent}>
              {details.posterUrl && (
                <View style={styles.posterContainer}>
                  <CachedImage
                    uri={details.posterUrl}
                    style={styles.poster}
                    borderRadius={8}
                    priority="high"
                  />
                </View>
              )}

              <View style={styles.infoContainer}>
                {details.type === 'season' && details.displaySeriesName && (
                  <Text style={styles.seriesName} numberOfLines={1}>
                    {details.displaySeriesName}
                  </Text>
                )}
                {details.type === 'episode' && details.displaySeriesName && (
                  <Text style={styles.seriesName} numberOfLines={1}>
                    {details.displaySeriesName} - S{details.item?.ParentIndexNumber} E
                    {details.item?.IndexNumber}
                  </Text>
                )}

                <Text style={styles.title} numberOfLines={2}>
                  {details.displayName}
                </Text>

                <View style={styles.metaRow}>
                  {details.type === 'artist' && details.artistAlbums?.TotalRecordCount !== undefined && (
                    <Text style={styles.metaText}>
                      {details.artistAlbums.TotalRecordCount}{' '}
                      {details.artistAlbums.TotalRecordCount === 1 ? 'Album' : 'Albums'}
                    </Text>
                  )}
                  {details.type === 'boxset' && details.collectionItems?.TotalRecordCount !== undefined && (
                    <Text style={styles.metaText}>
                      {details.collectionItems.TotalRecordCount}{' '}
                      {details.collectionItems.TotalRecordCount === 1 ? 'item' : 'items'}
                    </Text>
                  )}
                  {details.item?.ProductionYear && (
                    <Text style={styles.metaText}>{formatYear(details.item.ProductionYear)}</Text>
                  )}
                  {details.type !== 'artist' &&
                    details.type !== 'playlist' &&
                    details.type !== 'series' &&
                    details.type !== 'season' &&
                    details.type !== 'boxset' &&
                    details.duration && <Text style={styles.metaText}>{details.duration}</Text>}
                  {details.type === 'playlist' &&
                    details.playlistTracks?.Items?.length !== undefined &&
                    details.playlistTracks.Items.length > 0 && (
                      <Text style={styles.metaText}>
                        {details.playlistTracks.Items.length}{' '}
                        {details.playlistTracks.Items.length === 1 ? 'track' : 'tracks'} -{' '}
                        {formatDuration(
                          ticksToMs(
                            details.playlistTracks.Items.reduce((sum, t) => sum + (t.RunTimeTicks ?? 0), 0)
                          )
                        )}
                      </Text>
                    )}
                  {details.item?.OfficialRating && (
                    <View style={styles.ratingBadge}>
                      <Text style={styles.ratingBadgeText}>{details.item.OfficialRating}</Text>
                    </View>
                  )}
                  {details.item?.CommunityRating && (
                    <Text style={[styles.metaText, { color: details.accentColor }]}>
                      {formatRating(details.item.CommunityRating)}
                    </Text>
                  )}
                </View>

                <View style={styles.actionButtons}>
                  {showPlayButton && (
                    <Button
                      title={getPlayButtonTitle()}
                      onPress={() => details.handlePlay(getResumeValue())}
                      style={styles.playButton}
                    />
                  )}
                  {showShuffleButton && (
                    <Pressable
                      onPress={details.handleShuffle}
                      style={[styles.iconButton, { backgroundColor: details.accentColor + '20' }]}
                    >
                      <Ionicons name="shuffle" size={20} color={details.accentColor} />
                    </Pressable>
                  )}
                  {showDownloadButton && (
                    <Pressable
                      onPress={details.handleDownload}
                      disabled={details.isDownloading}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor: details.isDownloaded
                            ? '#22c55e20'
                            : details.isDownloadInProgress
                              ? details.accentColor + '40'
                              : details.accentColor + '20',
                        },
                      ]}
                    >
                      {details.isDownloading ? (
                        <ActivityIndicator size="small" color={details.accentColor} />
                      ) : details.isDownloaded ? (
                        <CheckIcon size={18} color="#22c55e" />
                      ) : details.isDownloadInProgress ? (
                        <View style={{ alignItems: 'center' }}>
                          <DownloadIcon size={16} color={details.accentColor} />
                          <Text style={{ color: details.accentColor, fontSize: 8, marginTop: 1 }}>
                            {details.downloadItem?.progress ?? 0}%
                          </Text>
                        </View>
                      ) : (
                        <DownloadIcon size={18} color={details.accentColor} />
                      )}
                    </Pressable>
                  )}
                  {showFavoriteButton && (
                    <Pressable
                      onPress={details.handleToggleFavorite}
                      disabled={details.isFavoritePending}
                      style={[
                        styles.iconButton,
                        {
                          backgroundColor: details.currentFavorite
                            ? details.accentColor + '30'
                            : details.accentColor + '20',
                        },
                      ]}
                    >
                      {details.isFavoritePending ? (
                        <ActivityIndicator size="small" color={details.accentColor} />
                      ) : (
                        <Ionicons
                          name={details.currentFavorite ? 'heart' : 'heart-outline'}
                          size={20}
                          color={details.currentFavorite ? details.accentColor : 'rgba(255,255,255,0.8)'}
                        />
                      )}
                    </Pressable>
                  )}
                </View>

                <ProgressBar progress={details.progress} type={details.type!} />

                {details.type === 'series' && details.nextUpEpisode && (
                  <SeriesProgressBar progress={details.nextUpProgress} episode={details.nextUpEpisode} />
                )}

                {details.type === 'season' && details.seasonPlayEpisode && (
                  <SeasonProgressBar
                    progress={details.seasonEpisodeProgress}
                    episode={details.seasonPlayEpisode}
                  />
                )}
              </View>
            </View>
          </View>

          <View style={styles.contentSection}>
            <GenreTags genres={details.item?.Genres || []} />

            {details.item?.Overview && !details.hideMedia && (
              <CollapsibleDescription
                text={details.item.Overview}
                accentColor={details.accentColor}
                t={details.t}
              />
            )}
            {details.item?.Overview && details.hideMedia && (
              <CollapsibleDescription
                text="A wonderful collection that showcases the best of this content. Enjoy the experience and discover something new."
                accentColor={details.accentColor}
                t={details.t}
              />
            )}

            {details.type === 'series' && (
              <SeasonsList
                seasons={details.seasons}
                isLoading={details.isLoadingSeasons}
                accentColor={details.accentColor}
                currentDetailsRoute={details.currentDetailsRoute}
                hideMedia={details.hideMedia}
                t={details.t}
              />
            )}

            {details.type === 'season' && (
              <EpisodesList
                episodes={details.episodes}
                isLoading={details.isLoadingEpisodes}
                accentColor={details.accentColor}
                type={details.type}
                id={details.id}
                from={details.from}
                hideMedia={details.hideMedia}
                isBatchDownloading={details.isBatchDownloading}
                downloadingEpisodeId={details.downloadingEpisodeId}
                getDownloadByItemId={details.getDownloadByItemId}
                isItemDownloaded={details.isItemDownloaded}
                onSeasonDownload={details.handleSeasonDownload}
                onEpisodeDownload={details.handleEpisodeDownload}
                t={details.t}
              />
            )}

            {details.type === 'album' && (
              <TracksList
                tracks={details.tracks}
                isLoading={details.isLoadingTracks}
                accentColor={details.accentColor}
                hideMedia={details.hideMedia}
                isBatchDownloading={details.isBatchDownloading}
                currentItemId={details.currentItem?.item?.Id}
                playerState={details.playerState}
                setQueue={details.setQueue}
                onTrackOptions={details.openTrackOptions}
                onDownloadAlbum={details.handleDownloadAlbum}
                t={details.t}
              />
            )}

            {details.type === 'playlist' && (
              <PlaylistTracksList
                tracks={details.playlistTracks}
                isLoading={details.isLoadingPlaylistTracks}
                error={details.playlistError}
                accentColor={details.accentColor}
                hideMedia={details.hideMedia}
                currentItemId={details.currentItem?.item?.Id}
                playerState={details.playerState}
                onTrackOptions={details.openTrackOptions}
                t={details.t}
              />
            )}

            {details.type === 'artist' && (
              <ArtistAlbumsList
                albums={details.artistAlbums}
                isLoading={details.isLoadingArtistAlbums}
                accentColor={details.accentColor}
                currentDetailsRoute={details.currentDetailsRoute}
                hideMedia={details.hideMedia}
                t={details.t}
              />
            )}

            {details.type === 'boxset' && (
              <CollectionItemsList
                items={details.collectionItems}
                isLoading={details.isLoadingCollectionItems}
                accentColor={details.accentColor}
                currentDetailsRoute={details.currentDetailsRoute}
                hideMedia={details.hideMedia}
                t={details.t}
              />
            )}

            <CastSection
              people={details.item?.People || []}
              hideMedia={details.hideMedia}
              onPersonPress={details.setSelectedPerson}
              t={details.t}
            />
          </View>

          <SimilarItems items={details.similar} onItemPress={details.handleItemPress} t={details.t} />

          <View style={{ height: 60 }} />
        </ScrollView>
      </Animated.View>

      {details.selectedTrack && (
        <TrackOptionsMenu
          track={details.selectedTrack}
          visible={details.showTrackOptions}
          onClose={details.closeTrackOptions}
        />
      )}

      {(details.item || details.selectedEpisodeForDownload) && (
        <DownloadOptionsModal
          item={details.selectedEpisodeForDownload || details.item!}
          userId={details.userId}
          visible={details.showDownloadOptions}
          onClose={details.closeDownloadOptions}
          onConfirm={details.startDownloadWithOptions}
        />
      )}

      <PersonModal
        personId={details.selectedPerson?.id ?? null}
        personName={details.selectedPerson?.name}
        personImageTag={details.selectedPerson?.imageTag}
        visible={!!details.selectedPerson}
        onClose={() => details.setSelectedPerson(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  flex1: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backdropContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
  },
  heroSection: {
    minHeight: 320,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 48,
  },
  heroContent: {
    flexDirection: 'row',
  },
  posterContainer: {
    width: 180,
    height: 270,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  poster: {
    width: 180,
    height: 270,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
  },
  seriesName: {
    color: '#999',
    fontSize: 14,
    marginBottom: 6,
  },
  title: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  metaText: {
    color: '#999',
    fontSize: 14,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingBadgeText: {
    color: '#999',
    fontSize: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  playButton: {
    minWidth: 140,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentSection: {
    paddingHorizontal: HORIZONTAL_PADDING,
  },
});
