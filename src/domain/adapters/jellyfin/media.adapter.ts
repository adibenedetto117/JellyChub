import type { ValidatedBaseItem, ValidatedUserItemData } from '@/domain/schemas/jellyfin';
import type {
  MediaItem,
  MediaType,
  MediaImages,
  UserMediaStatus,
  ExternalIds,
  Person,
  ChapterInfo,
  SeriesInfo,
  SeasonInfo,
  EpisodeInfo,
  MusicInfo,
  MediaItemsResult,
  DEFAULT_USER_STATUS,
  DEFAULT_IMAGES,
  DEFAULT_EXTERNAL_IDS,
} from '@/domain/models';
import { ticksToMs } from '@/utils';

export interface AdapterOptions {
  serverId: string;
  baseUrl?: string;
}

const JELLYFIN_TYPE_MAP: Record<string, MediaType> = {
  Movie: 'movie',
  Series: 'series',
  Season: 'season',
  Episode: 'episode',
  MusicAlbum: 'album',
  Audio: 'track',
  MusicArtist: 'artist',
  Book: 'book',
  AudioBook: 'audiobook',
  Playlist: 'playlist',
  BoxSet: 'collection',
  Folder: 'collection',
  CollectionFolder: 'collection',
  TvChannel: 'channel',
  Program: 'program',
  LiveTvChannel: 'channel',
  LiveTvProgram: 'program',
};

function mapMediaType(jellyfinType: string): MediaType {
  return JELLYFIN_TYPE_MAP[jellyfinType] ?? 'movie';
}

function buildImageUrl(
  itemId: string,
  imageType: string,
  tag: string | null | undefined,
  baseUrl?: string
): string | undefined {
  if (!tag || !baseUrl) return undefined;
  return `${baseUrl}/Items/${itemId}/Images/${imageType}?tag=${tag}&quality=90`;
}

function adaptImages(raw: ValidatedBaseItem, options: AdapterOptions): MediaImages {
  const { Id, ImageTags, BackdropImageTags, ParentId, SeriesId, AlbumId } = raw;
  const baseUrl = options.baseUrl;

  let primaryUrl = buildImageUrl(Id, 'Primary', ImageTags?.Primary, baseUrl);
  if (!primaryUrl && SeriesId) {
    primaryUrl = `${baseUrl}/Items/${SeriesId}/Images/Primary`;
  }
  if (!primaryUrl && AlbumId) {
    primaryUrl = `${baseUrl}/Items/${AlbumId}/Images/Primary`;
  }

  return {
    primary: primaryUrl,
    backdrop: BackdropImageTags?.[0]
      ? buildImageUrl(Id, 'Backdrop', BackdropImageTags[0], baseUrl)
      : undefined,
    thumb: buildImageUrl(Id, 'Thumb', ImageTags?.Thumb, baseUrl),
    logo: buildImageUrl(Id, 'Logo', ImageTags?.Logo, baseUrl),
    banner: buildImageUrl(Id, 'Banner', ImageTags?.Banner, baseUrl),
  };
}

function adaptUserStatus(userData?: ValidatedUserItemData): UserMediaStatus {
  if (!userData) {
    return {
      isFavorite: false,
      isPlayed: false,
      playCount: 0,
      playbackPositionMs: 0,
      playbackPercent: 0,
    };
  }

  return {
    isFavorite: userData.IsFavorite ?? false,
    isPlayed: userData.Played ?? false,
    playCount: userData.PlayCount ?? 0,
    playbackPositionMs: userData.PlaybackPositionTicks
      ? ticksToMs(userData.PlaybackPositionTicks)
      : 0,
    playbackPercent: userData.PlayedPercentage ?? 0,
    lastPlayedAt: userData.LastPlayedDate,
    unplayedCount: userData.UnplayedItemCount,
  };
}

function adaptPeople(people?: Array<{ Id?: string; Name: string; Role?: string; Type?: string; PrimaryImageTag?: string }>, baseUrl?: string): Person[] {
  if (!people) return [];

  return people.map(p => ({
    id: p.Id ?? '',
    name: p.Name,
    role: p.Role,
    type: mapPersonType(p.Type),
    imageUrl: p.Id && p.PrimaryImageTag
      ? `${baseUrl}/Items/${p.Id}/Images/Primary?tag=${p.PrimaryImageTag}`
      : undefined,
  }));
}

function mapPersonType(type?: string): Person['type'] {
  switch (type) {
    case 'Actor': return 'actor';
    case 'Director': return 'director';
    case 'Writer': return 'writer';
    case 'Producer': return 'producer';
    case 'Composer': return 'composer';
    default: return 'other';
  }
}

function adaptChapters(chapters?: Array<{ StartPositionTicks: number; Name?: string; ImageTag?: string }>, itemId?: string, baseUrl?: string): ChapterInfo[] {
  if (!chapters) return [];

  return chapters.map((c, index) => ({
    name: c.Name,
    startMs: ticksToMs(c.StartPositionTicks),
    imageUrl: c.ImageTag && itemId
      ? `${baseUrl}/Items/${itemId}/Images/Chapter/${index}?tag=${c.ImageTag}`
      : undefined,
  }));
}

function adaptSeriesInfo(raw: ValidatedBaseItem): SeriesInfo | undefined {
  if (raw.Type !== 'Series') return undefined;

  return {
    seriesId: raw.Id,
    seriesName: raw.Name,
    seasonCount: raw.ChildCount,
    status: mapSeriesStatus(raw.Status),
    airDays: raw.AirDays,
    airTime: raw.AirTime,
  };
}

function mapSeriesStatus(status?: string): SeriesInfo['status'] {
  switch (status) {
    case 'Continuing': return 'continuing';
    case 'Ended': return 'ended';
    default: return undefined;
  }
}

function adaptSeasonInfo(raw: ValidatedBaseItem): SeasonInfo | undefined {
  if (raw.Type !== 'Season') return undefined;

  return {
    seriesId: raw.SeriesId ?? '',
    seriesName: raw.SeriesName ?? '',
    seasonNumber: raw.IndexNumber ?? 0,
    episodeCount: raw.ChildCount,
  };
}

function adaptEpisodeInfo(raw: ValidatedBaseItem): EpisodeInfo | undefined {
  if (raw.Type !== 'Episode') return undefined;

  return {
    seriesId: raw.SeriesId ?? '',
    seriesName: raw.SeriesName ?? '',
    seasonId: raw.SeasonId ?? '',
    seasonNumber: raw.ParentIndexNumber ?? 0,
    episodeNumber: raw.IndexNumber ?? 0,
    airDate: raw.PremiereDate,
  };
}

function adaptMusicInfo(raw: ValidatedBaseItem): MusicInfo | undefined {
  if (!['Audio', 'MusicAlbum'].includes(raw.Type)) return undefined;

  return {
    albumId: raw.AlbumId,
    albumName: raw.AlbumArtist,
    artistIds: raw.ArtistItems?.map(a => a.Id) ?? [],
    artistNames: raw.Artists ?? raw.ArtistItems?.map(a => a.Name) ?? [],
    trackNumber: raw.IndexNumber,
    discNumber: raw.ParentIndexNumber,
  };
}

function adaptExternalIds(raw: ValidatedBaseItem): ExternalIds {
  return {
    jellyfin: raw.Id,
    tmdb: raw.ProviderIds?.Tmdb,
    imdb: raw.ProviderIds?.Imdb,
    tvdb: raw.ProviderIds?.Tvdb,
  };
}

export function adaptJellyfinItem(
  raw: ValidatedBaseItem,
  options: AdapterOptions
): MediaItem {
  return {
    id: raw.Id,
    type: mapMediaType(raw.Type),
    title: raw.Name,
    sortTitle: raw.SortName,
    originalTitle: raw.OriginalTitle,
    overview: raw.Overview,
    tagline: raw.Taglines?.[0],
    year: raw.ProductionYear,
    rating: raw.CommunityRating,
    criticRating: raw.CriticRating,
    officialRating: raw.OfficialRating,
    durationMs: raw.RunTimeTicks ? ticksToMs(raw.RunTimeTicks) : undefined,
    premiereDate: raw.PremiereDate,
    endDate: raw.EndDate,

    images: adaptImages(raw, options),
    userStatus: adaptUserStatus(raw.UserData),

    seriesInfo: adaptSeriesInfo(raw),
    seasonInfo: adaptSeasonInfo(raw),
    episodeInfo: adaptEpisodeInfo(raw),
    musicInfo: adaptMusicInfo(raw),

    genres: raw.Genres ?? [],
    tags: raw.Tags ?? [],
    people: adaptPeople(raw.People, options.baseUrl),
    studios: raw.Studios?.map(s => s.Name) ?? [],
    chapters: adaptChapters(raw.Chapters, raw.Id, options.baseUrl),

    externalIds: adaptExternalIds(raw),
    source: {
      provider: 'jellyfin',
      serverId: options.serverId,
      originalId: raw.Id,
    },

    parentId: raw.ParentId,
    childCount: raw.ChildCount,
    recursiveChildCount: raw.RecursiveItemCount,

    container: raw.Container,
  };
}

export function adaptJellyfinItems(
  items: ValidatedBaseItem[],
  options: AdapterOptions
): MediaItem[] {
  return items.map(item => adaptJellyfinItem(item, options));
}

export function adaptItemsResponse(
  response: { Items: ValidatedBaseItem[]; TotalRecordCount: number; StartIndex: number },
  options: AdapterOptions
): MediaItemsResult {
  return {
    items: adaptJellyfinItems(response.Items, options),
    total: response.TotalRecordCount,
    startIndex: response.StartIndex,
  };
}

interface SearchHintLike {
  Id: string;
  ItemId?: string;
  Name: string;
  Type: string;
  ProductionYear?: number;
  PrimaryImageTag?: string;
  ThumbImageTag?: string;
  ThumbImageItemId?: string;
  BackdropImageTag?: string;
  BackdropImageItemId?: string;
  RunTimeTicks?: number;
  Album?: string;
  AlbumId?: string;
  AlbumArtist?: string;
  Artists?: string[];
  Series?: string;
  SeriesId?: string;
}

function adaptSearchHint(hint: SearchHintLike, options: AdapterOptions): MediaItem {
  const id = hint.ItemId ?? hint.Id;
  const baseUrl = options.baseUrl;

  return {
    id,
    type: mapMediaType(hint.Type),
    title: hint.Name,
    year: hint.ProductionYear,
    durationMs: hint.RunTimeTicks ? ticksToMs(hint.RunTimeTicks) : undefined,

    images: {
      primary: hint.PrimaryImageTag && baseUrl
        ? `${baseUrl}/Items/${id}/Images/Primary?tag=${hint.PrimaryImageTag}&quality=90`
        : hint.AlbumId && baseUrl
          ? `${baseUrl}/Items/${hint.AlbumId}/Images/Primary`
          : undefined,
      backdrop: hint.BackdropImageTag && hint.BackdropImageItemId && baseUrl
        ? `${baseUrl}/Items/${hint.BackdropImageItemId}/Images/Backdrop?tag=${hint.BackdropImageTag}`
        : undefined,
      thumb: hint.ThumbImageTag && hint.ThumbImageItemId && baseUrl
        ? `${baseUrl}/Items/${hint.ThumbImageItemId}/Images/Thumb?tag=${hint.ThumbImageTag}`
        : undefined,
    },
    userStatus: {
      isFavorite: false,
      isPlayed: false,
      playCount: 0,
      playbackPositionMs: 0,
      playbackPercent: 0,
    },

    episodeInfo: hint.SeriesId ? {
      seriesId: hint.SeriesId,
      seriesName: hint.Series ?? '',
      seasonId: '',
      seasonNumber: 0,
      episodeNumber: 0,
    } : undefined,

    musicInfo: hint.AlbumId ? {
      albumId: hint.AlbumId,
      albumName: hint.Album,
      artistIds: [],
      artistNames: hint.Artists ?? (hint.AlbumArtist ? [hint.AlbumArtist] : []),
    } : undefined,

    genres: [],
    tags: [],
    people: [],
    studios: [],
    chapters: [],

    externalIds: {
      jellyfin: id,
    },
    source: {
      provider: 'jellyfin',
      serverId: options.serverId,
      originalId: id,
    },
  };
}

export function adaptSearchHints(
  hints: SearchHintLike[],
  options: AdapterOptions
): MediaItem[] {
  return hints.map(hint => adaptSearchHint(hint, options));
}
