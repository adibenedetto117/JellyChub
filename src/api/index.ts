export { jellyfinClient, getImageUrl, getStreamUrl, getAudioStreamUrl, getBookDownloadUrl, getSubtitleUrl } from './client';

export {
  getServerInfo,
  getServerPublicInfo,
  getPublicUsers,
  authenticateByName,
  logout,
  initiateQuickConnect,
  checkQuickConnectStatus,
  authenticateWithQuickConnect,
  getCurrentUser,
  validateServerUrl,
} from './auth';

export type { ServerInfo, ServerPublicInfo } from './auth';

export {
  getLibraries,
  getItems,
  getItem,
  getResumeItems,
  getLatestMedia,
  getNextUp,
  getSimilarItems,
  getSuggestions,
  getFavorites,
  getFavoriteSongs,
  getSeasons,
  getEpisodes,
  getAlbumTracks,
  getArtistAlbums,
  getArtists,
  search,
  markAsFavorite,
  markAsPlayed,
  getGenres,
  createPlaylist,
  addToPlaylist,
  removeFromPlaylist,
  getPlaylists,
  getPlaylistItems,
  getLibraryConfig,
  getLibraryIcon,
  getLibraryItemTypes,
  shouldUseSquareVariant,
  getPerson,
  getPersonItems,
  COLLECTION_TYPE_CONFIG,
  DEFAULT_LIBRARY_CONFIG,
} from './library';

export type { LibraryQueryParams, LibraryConfig, Genre, CreatePlaylistResult, PersonDetails } from './library';

export {
  getPlaybackInfo,
  reportPlaybackStart,
  reportPlaybackProgress,
  reportPlaybackStopped,
  selectBestMediaSource,
  determinePlayMethod,
  generatePlaySessionId,
  getMediaSegments,
} from './playback';

export type { PlaybackStartInfo, MediaSegment, MediaSegmentsResponse } from './playback';

export {
  getSystemInfo,
  getSessions,
  getItemCounts,
  getActivityLog,
  refreshLibrary,
  restartServer,
  shutdownServer,
  stopSession,
  sendSessionMessage,
} from './admin';

export type {
  SystemInfo,
  SessionInfo,
  NowPlayingItem,
  PlayState,
  TranscodingInfo,
  ItemCounts,
  ActivityLogEntry,
  ActivityLogResponse,
} from './admin';

export { jellyseerrClient } from './jellyseerr';
