export { jellyseerrClient } from './jellyseerr';
export type { JellyseerrAuthMethod } from './jellyseerr';

export { sonarrService } from './sonarr';
export type {
  SonarrSeries,
  SonarrQueueItem,
  SonarrQueueResponse,
  SonarrRootFolder,
  SonarrQualityProfile,
  SonarrLookupResult,
  SonarrAddSeriesOptions,
  SonarrEpisode,
  SonarrCalendarEpisode,
  SonarrRelease,
} from './sonarr';

export { radarrService } from './radarr';
export type {
  RadarrMovie,
  RadarrQueueItem,
  RadarrQueueResponse,
  RadarrRootFolder,
  RadarrQualityProfile,
  RadarrLookupResult,
  RadarrAddMovieOptions,
  RadarrRelease,
  RadarrCalendarMovie,
} from './radarr';
