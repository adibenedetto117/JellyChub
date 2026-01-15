import { View, ScrollView, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useCallback } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useDetailsScreen } from '@/hooks';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { TVFocusableButton } from '@/components/tv/navigation/TVFocusableButton';
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
} from '@/components/shared/details';
import { tvConstants } from '@/utils/platform';
import { formatDuration, formatYear, formatRating, ticksToMs } from '@/utils';

export function TVDetailScreen() {
  const details = useDetailsScreen();
  const [focusedSection, setFocusedSection] = useState<string>('actions');

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: details.contentOpacity.value,
  }));

  const handleSectionFocus = useCallback((section: string) => {
    setFocusedSection(section);
  }, []);

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
              colors={['transparent', 'rgba(10,10,10,0.5)', 'rgba(10,10,10,0.9)', '#0a0a0a']}
              locations={[0, 0.3, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}

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
                    borderRadius={12}
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
                      <Text style={styles.ratingText}>{details.item.OfficialRating}</Text>
                    </View>
                  )}
                  {details.item?.CommunityRating && (
                    <Text style={[styles.metaText, { color: details.accentColor }]}>
                      {formatRating(details.item.CommunityRating)}
                    </Text>
                  )}
                </View>

                <View style={styles.actionButtons} onFocus={() => handleSectionFocus('actions')}>
                  {showPlayButton && (
                    <TVFocusableButton
                      icon="play"
                      label={getPlayButtonTitle()}
                      size="large"
                      onPress={() => details.handlePlay(getResumeValue())}
                      autoFocus
                    />
                  )}
                  {showShuffleButton && (
                    <TVFocusableButton icon="shuffle" size="large" onPress={details.handleShuffle} />
                  )}
                  {showFavoriteButton && (
                    <TVFocusableButton
                      icon={details.currentFavorite ? 'heart' : 'heart-outline'}
                      size="large"
                      onPress={details.handleToggleFavorite}
                      disabled={details.isFavoritePending}
                    />
                  )}
                  <TVFocusableButton icon="arrow-back" size="large" onPress={details.handleGoBack} />
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

          <View style={{ height: 100 }} />
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
    height: '70%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: tvConstants.controlBarPadding,
  },
  heroSection: {
    minHeight: 400,
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingTop: tvConstants.controlBarPadding,
  },
  heroContent: {
    flexDirection: 'row',
  },
  posterContainer: {
    width: 220,
    height: 330,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  poster: {
    width: 220,
    height: 330,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 16,
  },
  seriesName: {
    color: '#999',
    fontSize: 18,
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 16,
  },
  metaText: {
    color: '#999',
    fontSize: 18,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#999',
    fontSize: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  contentSection: {
    paddingHorizontal: tvConstants.controlBarPadding,
  },
});
