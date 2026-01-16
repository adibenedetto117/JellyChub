import { View, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useDetailsScreen, useMiniPlayerPadding } from '@/hooks';
import { useAuthStore } from '@/stores';
import { TrackOptionsMenu } from '@/components/shared/music/TrackOptionsMenu';
import { DownloadOptionsModal, PersonModal } from '@/components/shared/media';
import { MetadataEditorModal } from '@/components/shared/admin/metadata';
import {
  MediaHeader,
  MediaInfo,
  ActionButtons,
  ProgressBar,
  SeriesProgressBar,
  SeasonProgressBar,
  GenreTags,
  CollapsibleDescription,
  SeasonsList,
  EpisodesList,
  EpisodeDetailsModal,
  TracksList,
  PlaylistTracksList,
  ArtistAlbumsList,
  CollectionItemsList,
  CastSection,
  SimilarItems,
  BackButton,
  SearchButton,
  ErrorState,
  MissingParamsError,
} from '@/components/shared/details';

export function MobileDetailScreen() {
  const insets = useSafeAreaInsets();
  const details = useDetailsScreen();
  const miniPlayerPadding = useMiniPlayerPadding();
  const currentUser = useAuthStore((s) => s.currentUser);
  const isAdmin = (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator ?? false;

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: details.contentOpacity.value,
  }));

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

  return (
    <View className="flex-1 bg-background">
      {details.isLoading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <ActivityIndicator color={details.accentColor} size="large" />
        </View>
      )}
      <Animated.View style={[{ flex: 1 }, contentAnimatedStyle]}>
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          bounces={true}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 16 + miniPlayerPadding }}
        >
          <MediaHeader
            backdropUrl={details.backdropUrl}
            itemId={details.item?.Id || ''}
            topInset={insets.top}
          />

          <View className="px-4" style={{ marginTop: details.backdropUrl ? -80 : 0 }}>
            <MediaInfo
              item={details.item!}
              type={details.type!}
              posterUrl={details.posterUrl}
              displayName={details.displayName}
              displaySeriesName={details.displaySeriesName}
              duration={details.duration}
              artistAlbumsCount={details.artistAlbums?.TotalRecordCount}
              collectionItemsCount={details.collectionItems?.TotalRecordCount}
              playlistTracksCount={details.playlistTracks?.Items?.length}
              playlistTotalDuration={details.playlistTracks?.Items?.reduce(
                (sum, t) => sum + (t.RunTimeTicks ?? 0),
                0
              )}
              from={details.from}
              hideMedia={details.hideMedia}
            />

            <ActionButtons
              type={details.type!}
              hasProgress={details.hasProgress}
              hasNextUpProgress={details.hasNextUpProgress}
              hasSeasonProgress={details.hasSeasonProgress}
              nextUpEpisode={!!details.nextUpEpisode}
              accentColor={details.accentColor}
              isDownloading={details.isDownloading}
              isDownloaded={details.isDownloaded}
              isDownloadInProgress={details.isDownloadInProgress}
              downloadProgress={details.downloadItem?.progress}
              isFavorite={details.currentFavorite}
              isFavoritePending={details.isFavoritePending}
              onPlay={details.handlePlay}
              onShuffle={details.handleShuffle}
              onDownload={details.handleDownload}
              onToggleFavorite={details.handleToggleFavorite}
              onEdit={details.openMetadataEditor}
              canEdit={isAdmin}
              t={details.t}
            />

            <ProgressBar progress={details.progress} type={details.type!} />

            {details.type === 'series' && details.nextUpEpisode && (
              <SeriesProgressBar progress={details.nextUpProgress} episode={details.nextUpEpisode} />
            )}

            {details.type === 'season' && details.seasonPlayEpisode && (
              <SeasonProgressBar progress={details.seasonEpisodeProgress} episode={details.seasonPlayEpisode} />
            )}

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
                onEpisodePress={details.handleEpisodePress}
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
        </ScrollView>
      </Animated.View>

      <BackButton topInset={insets.top} onPress={details.handleGoBack} />
      <SearchButton topInset={insets.top} />

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

      <EpisodeDetailsModal
        episodeId={details.selectedEpisodeId}
        visible={details.showEpisodeDetails}
        onClose={details.closeEpisodeDetails}
        from={details.currentDetailsRoute}
        accentColor={details.accentColor}
        hideMedia={details.hideMedia}
        t={details.t}
      />

      {details.item && (
        <MetadataEditorModal
          visible={details.showMetadataEditor}
          onClose={details.closeMetadataEditor}
          item={details.item}
        />
      )}
    </View>
  );
}
