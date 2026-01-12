import { create } from 'zustand';
import type { BaseItem, Library, Episode, MusicAlbum } from '@/types/jellyfin';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';
import type { DownloadItem } from '@/types';

// Public domain movie data with real images from TMDB (these are public domain films)
export const DEMO_MOVIES: BaseItem[] = [
  {
    Id: 'demo-movie-1',
    Name: 'Night of the Living Dead',
    Type: 'Movie',
    ServerId: 'demo-server',
    Overview: 'A group of people hide from bloodthirsty zombies in a farmhouse. A groundbreaking horror classic that defined the zombie genre.',
    ProductionYear: 1968,
    CommunityRating: 7.8,
    OfficialRating: 'NR',
    RunTimeTicks: 576000000000, // 96 minutes
    Genres: ['Horror', 'Thriller'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-movie-2',
    Name: 'Nosferatu',
    Type: 'Movie',
    ServerId: 'demo-server',
    Overview: 'Vampire Count Orlok expresses interest in a new residence and real estate agent Hutter\'s wife. A silent film masterpiece of German Expressionism.',
    ProductionYear: 1922,
    CommunityRating: 7.9,
    OfficialRating: 'NR',
    RunTimeTicks: 540000000000, // 90 minutes
    Genres: ['Horror', 'Fantasy'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-movie-3',
    Name: 'The General',
    Type: 'Movie',
    ServerId: 'demo-server',
    Overview: 'When Union spies steal an engineer\'s beloved locomotive, he pursues it single-handedly and straight through enemy lines. A Buster Keaton masterpiece.',
    ProductionYear: 1926,
    CommunityRating: 8.1,
    OfficialRating: 'NR',
    RunTimeTicks: 468000000000, // 78 minutes
    Genres: ['Comedy', 'Action', 'War'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-movie-4',
    Name: 'His Girl Friday',
    Type: 'Movie',
    ServerId: 'demo-server',
    Overview: 'A newspaper editor uses every trick in the book to keep his ace reporter ex-wife from remarrying. A screwball comedy classic.',
    ProductionYear: 1940,
    CommunityRating: 7.9,
    OfficialRating: 'NR',
    RunTimeTicks: 552000000000, // 92 minutes
    Genres: ['Comedy', 'Romance'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: true,
    },
  },
  {
    Id: 'demo-movie-5',
    Name: 'Charade',
    Type: 'Movie',
    ServerId: 'demo-server',
    Overview: 'Romance and suspense ensue in Paris as a woman is pursued by several men who want a fortune her murdered husband had stolen.',
    ProductionYear: 1963,
    CommunityRating: 7.9,
    OfficialRating: 'NR',
    RunTimeTicks: 678000000000, // 113 minutes
    Genres: ['Thriller', 'Mystery', 'Romance'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
];

// Public domain TV series data
export const DEMO_TV_SHOWS: BaseItem[] = [
  {
    Id: 'demo-series-1',
    Name: 'The Twilight Zone',
    Type: 'Series',
    ServerId: 'demo-server',
    Overview: 'Ordinary people find themselves in extraordinarily astounding situations in this anthology series.',
    ProductionYear: 1959,
    CommunityRating: 9.0,
    OfficialRating: 'TV-PG',
    Genres: ['Sci-Fi', 'Mystery', 'Drama'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-series-2',
    Name: 'Alfred Hitchcock Presents',
    Type: 'Series',
    ServerId: 'demo-server',
    Overview: 'The master of suspense introduces tales of mystery and intrigue in this classic anthology series.',
    ProductionYear: 1955,
    CommunityRating: 8.5,
    OfficialRating: 'TV-PG',
    Genres: ['Mystery', 'Thriller', 'Drama'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-series-3',
    Name: 'Sherlock Holmes',
    Type: 'Series',
    ServerId: 'demo-server',
    Overview: 'The legendary detective solves mysteries in Victorian London with his trusted companion Dr. Watson.',
    ProductionYear: 1954,
    CommunityRating: 7.8,
    OfficialRating: 'TV-G',
    Genres: ['Mystery', 'Crime', 'Drama'],
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Demo episodes for continue watching
export const DEMO_EPISODES: Episode[] = [
  {
    Id: 'demo-episode-1',
    Name: 'Time Enough at Last',
    Type: 'Episode',
    ServerId: 'demo-server',
    Overview: 'A bookworm finds himself the last man on Earth after a nuclear holocaust.',
    IndexNumber: 8,
    ParentIndexNumber: 1,
    SeriesId: 'demo-series-1',
    SeriesName: 'The Twilight Zone',
    SeasonId: 'demo-season-1',
    SeasonName: 'Season 1',
    RunTimeTicks: 1500000000000, // 25 minutes
    ImageTags: { Primary: 'demo' },
    BackdropImageTags: ['demo'],
    UserData: {
      PlaybackPositionTicks: 900000000000, // 15 minutes in
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-episode-2',
    Name: 'The Monsters Are Due on Maple Street',
    Type: 'Episode',
    ServerId: 'demo-server',
    Overview: 'When strange things start happening on Maple Street, the residents become suspicious of each other.',
    IndexNumber: 22,
    ParentIndexNumber: 1,
    SeriesId: 'demo-series-1',
    SeriesName: 'The Twilight Zone',
    SeasonId: 'demo-season-1',
    SeasonName: 'Season 1',
    RunTimeTicks: 1500000000000, // 25 minutes
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Classical music - public domain compositions
export const DEMO_MUSIC_ALBUMS: MusicAlbum[] = [
  {
    Id: 'demo-album-1',
    Name: 'Beethoven: Piano Sonatas',
    Type: 'MusicAlbum',
    ServerId: 'demo-server',
    Overview: 'A collection of Ludwig van Beethoven\'s most beloved piano sonatas including the Moonlight Sonata.',
    ProductionYear: 1801,
    Genres: ['Classical'],
    ImageTags: { Primary: 'demo' },
    AlbumArtist: 'Ludwig van Beethoven',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-album-2',
    Name: 'Bach: Cello Suites',
    Type: 'MusicAlbum',
    ServerId: 'demo-server',
    Overview: 'Johann Sebastian Bach\'s timeless cello suites, among the most performed solo compositions for cello.',
    ProductionYear: 1720,
    Genres: ['Classical', 'Baroque'],
    ImageTags: { Primary: 'demo' },
    AlbumArtist: 'Johann Sebastian Bach',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-album-3',
    Name: 'Mozart: Eine kleine Nachtmusik',
    Type: 'MusicAlbum',
    ServerId: 'demo-server',
    Overview: 'Wolfgang Amadeus Mozart\'s famous serenade, one of his most popular compositions.',
    ProductionYear: 1787,
    Genres: ['Classical'],
    ImageTags: { Primary: 'demo' },
    AlbumArtist: 'Wolfgang Amadeus Mozart',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-album-4',
    Name: 'Vivaldi: The Four Seasons',
    Type: 'MusicAlbum',
    ServerId: 'demo-server',
    Overview: 'Antonio Vivaldi\'s iconic violin concertos depicting the seasons of the year.',
    ProductionYear: 1723,
    Genres: ['Classical', 'Baroque'],
    ImageTags: { Primary: 'demo' },
    AlbumArtist: 'Antonio Vivaldi',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-album-5',
    Name: 'Debussy: Suite bergamasque',
    Type: 'MusicAlbum',
    ServerId: 'demo-server',
    Overview: 'Claude Debussy\'s piano suite including the famous Clair de Lune.',
    ProductionYear: 1905,
    Genres: ['Classical', 'Impressionist'],
    ImageTags: { Primary: 'demo' },
    AlbumArtist: 'Claude Debussy',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Demo audio tracks with lyrics
export const DEMO_AUDIO_TRACKS: BaseItem[] = [
  {
    Id: 'demo-track-1',
    Name: 'Moonlight Sonata (1st Movement)',
    Type: 'Audio',
    ServerId: 'demo-server',
    Overview: 'Piano Sonata No. 14 in C-sharp minor',
    RunTimeTicks: 3600000000000, // 6 minutes
    ParentId: 'demo-album-1',
    Genres: ['Classical'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 1200000000000, // 2 minutes in
      PlayCount: 3,
      IsFavorite: true,
      Played: true,
    },
  },
  {
    Id: 'demo-track-2',
    Name: 'Cello Suite No. 1 - Prelude',
    Type: 'Audio',
    ServerId: 'demo-server',
    Overview: 'The famous opening prelude from Bach\'s first cello suite',
    RunTimeTicks: 1620000000000, // 2.7 minutes
    ParentId: 'demo-album-2',
    Genres: ['Classical', 'Baroque'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-track-3',
    Name: 'Eine kleine Nachtmusik - Allegro',
    Type: 'Audio',
    ServerId: 'demo-server',
    Overview: 'The lively first movement of Mozart\'s beloved serenade',
    RunTimeTicks: 3300000000000, // 5.5 minutes
    ParentId: 'demo-album-3',
    Genres: ['Classical'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-track-4',
    Name: 'Spring (La Primavera) - Allegro',
    Type: 'Audio',
    ServerId: 'demo-server',
    Overview: 'The opening of Vivaldi\'s Spring concerto from The Four Seasons',
    RunTimeTicks: 2040000000000, // 3.4 minutes
    ParentId: 'demo-album-4',
    Genres: ['Classical', 'Baroque'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-track-5',
    Name: 'Clair de Lune',
    Type: 'Audio',
    ServerId: 'demo-server',
    Overview: 'The third movement of Debussy\'s Suite bergamasque',
    RunTimeTicks: 3000000000000, // 5 minutes
    ParentId: 'demo-album-5',
    Genres: ['Classical', 'Impressionist'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Public domain audiobooks
export const DEMO_AUDIOBOOKS: BaseItem[] = [
  {
    Id: 'demo-audiobook-1',
    Name: 'The Adventures of Sherlock Holmes',
    Type: 'AudioBook',
    ServerId: 'demo-server',
    Overview: 'A collection of twelve short stories featuring the famous detective Sherlock Holmes, written by Sir Arthur Conan Doyle.',
    ProductionYear: 1892,
    CommunityRating: 8.5,
    RunTimeTicks: 396000000000000, // ~11 hours
    Genres: ['Mystery', 'Fiction'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 36000000000000, // 1 hour in
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-audiobook-2',
    Name: 'Pride and Prejudice',
    Type: 'AudioBook',
    ServerId: 'demo-server',
    Overview: 'Jane Austen\'s beloved novel of manners follows Elizabeth Bennet as she navigates issues of marriage, morality, and misconceptions.',
    ProductionYear: 1813,
    CommunityRating: 8.8,
    RunTimeTicks: 432000000000000, // ~12 hours
    Genres: ['Romance', 'Classic'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-audiobook-3',
    Name: 'Dracula',
    Type: 'AudioBook',
    ServerId: 'demo-server',
    Overview: 'Bram Stoker\'s gothic horror masterpiece tells the story of Count Dracula\'s attempt to move from Transylvania to England.',
    ProductionYear: 1897,
    CommunityRating: 8.0,
    RunTimeTicks: 576000000000000, // ~16 hours
    Genres: ['Horror', 'Gothic'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-audiobook-4',
    Name: 'A Tale of Two Cities',
    Type: 'AudioBook',
    ServerId: 'demo-server',
    Overview: 'Charles Dickens\' historical novel set in London and Paris before and during the French Revolution.',
    ProductionYear: 1859,
    CommunityRating: 8.2,
    RunTimeTicks: 504000000000000, // ~14 hours
    Genres: ['Historical', 'Classic'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-audiobook-5',
    Name: 'The Adventures of Tom Sawyer',
    Type: 'AudioBook',
    ServerId: 'demo-server',
    Overview: 'Mark Twain\'s classic tale of a young boy growing up along the Mississippi River in the mid-1800s.',
    ProductionYear: 1876,
    CommunityRating: 7.9,
    RunTimeTicks: 288000000000000, // ~8 hours
    Genres: ['Adventure', 'Classic'],
    ImageTags: { Primary: 'demo' },
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Public domain ebooks
export const DEMO_BOOKS: BaseItem[] = [
  {
    Id: 'demo-book-1',
    Name: 'Frankenstein',
    Type: 'Book',
    ServerId: 'demo-server',
    Overview: 'Mary Shelley\'s groundbreaking novel about Victor Frankenstein and the creature he brings to life.',
    ProductionYear: 1818,
    CommunityRating: 8.1,
    Genres: ['Horror', 'Science Fiction', 'Gothic'],
    ImageTags: { Primary: 'demo' },
    Container: 'epub',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-book-2',
    Name: 'Moby Dick',
    Type: 'Book',
    ServerId: 'demo-server',
    Overview: 'Herman Melville\'s epic tale of Captain Ahab\'s obsessive quest to hunt the white whale.',
    ProductionYear: 1851,
    CommunityRating: 7.8,
    Genres: ['Adventure', 'Classic'],
    ImageTags: { Primary: 'demo' },
    Container: 'epub',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-book-3',
    Name: 'The Picture of Dorian Gray',
    Type: 'Book',
    ServerId: 'demo-server',
    Overview: 'Oscar Wilde\'s philosophical novel about a young man whose portrait ages while he remains forever young.',
    ProductionYear: 1890,
    CommunityRating: 8.3,
    Genres: ['Gothic', 'Philosophical'],
    ImageTags: { Primary: 'demo' },
    Container: 'epub',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  {
    Id: 'demo-book-4',
    Name: 'Alice\'s Adventures in Wonderland',
    Type: 'Book',
    ServerId: 'demo-server',
    Overview: 'Lewis Carroll\'s beloved tale of a girl who falls through a rabbit hole into a fantastical world.',
    ProductionYear: 1865,
    CommunityRating: 8.0,
    Genres: ['Fantasy', 'Children\'s'],
    ImageTags: { Primary: 'demo' },
    Container: 'epub',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
  {
    Id: 'demo-book-5',
    Name: 'The War of the Worlds',
    Type: 'Book',
    ServerId: 'demo-server',
    Overview: 'H.G. Wells\' science fiction classic about a Martian invasion of Earth.',
    ProductionYear: 1898,
    CommunityRating: 7.9,
    Genres: ['Science Fiction', 'Classic'],
    ImageTags: { Primary: 'demo' },
    Container: 'epub',
    UserData: {
      PlaybackPositionTicks: 0,
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
];

// Demo libraries
export const DEMO_LIBRARIES: Library[] = [
  {
    Id: 'demo-lib-movies',
    Name: 'Movies',
    CollectionType: 'movies',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
  {
    Id: 'demo-lib-tvshows',
    Name: 'TV Shows',
    CollectionType: 'tvshows',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
  {
    Id: 'demo-lib-music',
    Name: 'Music',
    CollectionType: 'music',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
  {
    Id: 'demo-lib-audiobooks',
    Name: 'Audiobooks',
    CollectionType: 'audiobooks',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
  {
    Id: 'demo-lib-books',
    Name: 'Books',
    CollectionType: 'books',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
  {
    Id: 'demo-lib-livetv',
    Name: 'Live TV',
    CollectionType: 'livetv',
    Type: 'CollectionFolder',
    ImageTags: { Primary: 'demo' },
  },
];

// Demo Live TV channels
export const DEMO_LIVETV_CHANNELS: LiveTvChannel[] = [
  {
    Id: 'demo-channel-1',
    Name: 'Classic Movies',
    Number: '1',
    ChannelNumber: '1',
    Type: 'TvChannel',
    ServerId: 'demo-server',
    ChannelType: 'TV',
    ImageTags: { Primary: 'demo' },
    CurrentProgram: {
      Id: 'demo-program-1',
      ChannelId: 'demo-channel-1',
      Name: 'Night of the Living Dead',
      Overview: 'A group of people hide from bloodthirsty zombies in a farmhouse.',
      StartDate: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      EndDate: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      Type: 'Program',
      IsMovie: true,
      ServerId: 'demo-server',
      Genres: ['Horror'],
    },
    UserData: { IsFavorite: true },
  },
  {
    Id: 'demo-channel-2',
    Name: 'Drama Classics',
    Number: '2',
    ChannelNumber: '2',
    Type: 'TvChannel',
    ServerId: 'demo-server',
    ChannelType: 'TV',
    ImageTags: { Primary: 'demo' },
    CurrentProgram: {
      Id: 'demo-program-2',
      ChannelId: 'demo-channel-2',
      Name: 'His Girl Friday',
      Overview: 'A newspaper editor tries to keep his ace reporter ex-wife from remarrying.',
      StartDate: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      EndDate: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      Type: 'Program',
      IsMovie: true,
      ServerId: 'demo-server',
      Genres: ['Comedy', 'Romance'],
    },
    UserData: { IsFavorite: false },
  },
  {
    Id: 'demo-channel-3',
    Name: 'Mystery Theatre',
    Number: '3',
    ChannelNumber: '3',
    Type: 'TvChannel',
    ServerId: 'demo-server',
    ChannelType: 'TV',
    ImageTags: { Primary: 'demo' },
    CurrentProgram: {
      Id: 'demo-program-3',
      ChannelId: 'demo-channel-3',
      Name: 'The Twilight Zone - Time Enough at Last',
      Overview: 'A bookworm finds himself the last man on Earth.',
      StartDate: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      EndDate: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      Type: 'Program',
      IsSeries: true,
      ServerId: 'demo-server',
      Genres: ['Sci-Fi', 'Mystery'],
    },
    UserData: { IsFavorite: true },
  },
  {
    Id: 'demo-channel-4',
    Name: 'Silent Film Channel',
    Number: '4',
    ChannelNumber: '4',
    Type: 'TvChannel',
    ServerId: 'demo-server',
    ChannelType: 'TV',
    ImageTags: { Primary: 'demo' },
    CurrentProgram: {
      Id: 'demo-program-4',
      ChannelId: 'demo-channel-4',
      Name: 'Nosferatu',
      Overview: 'Vampire Count Orlok terrorizes a young couple.',
      StartDate: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      EndDate: new Date(Date.now() + 70 * 60 * 1000).toISOString(),
      Type: 'Program',
      IsMovie: true,
      ServerId: 'demo-server',
      Genres: ['Horror', 'Fantasy'],
    },
    UserData: { IsFavorite: false },
  },
  {
    Id: 'demo-channel-5',
    Name: 'Comedy Classics',
    Number: '5',
    ChannelNumber: '5',
    Type: 'TvChannel',
    ServerId: 'demo-server',
    ChannelType: 'TV',
    ImageTags: { Primary: 'demo' },
    CurrentProgram: {
      Id: 'demo-program-5',
      ChannelId: 'demo-channel-5',
      Name: 'The General',
      Overview: 'Buster Keaton pursues his stolen locomotive through enemy lines.',
      StartDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      EndDate: new Date(Date.now() + 73 * 60 * 1000).toISOString(),
      Type: 'Program',
      IsMovie: true,
      ServerId: 'demo-server',
      Genres: ['Comedy', 'Action'],
    },
    UserData: { IsFavorite: false },
  },
];

// Demo downloaded items
export const DEMO_DOWNLOADS: DownloadItem[] = [
  {
    id: 'demo-download-1',
    itemId: 'demo-movie-1',
    serverId: 'demo-server',
    item: DEMO_MOVIES[0],
    status: 'completed',
    progress: 100,
    totalBytes: 1500000000, // 1.5 GB
    downloadedBytes: 1500000000,
    localPath: '/demo/night-of-the-living-dead.mp4',
    quality: 'high',
    createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'demo-download-2',
    itemId: 'demo-movie-3',
    serverId: 'demo-server',
    item: DEMO_MOVIES[2],
    status: 'completed',
    progress: 100,
    totalBytes: 1200000000, // 1.2 GB
    downloadedBytes: 1200000000,
    localPath: '/demo/the-general.mp4',
    quality: 'high',
    createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
  },
  {
    id: 'demo-download-3',
    itemId: 'demo-audiobook-1',
    serverId: 'demo-server',
    item: DEMO_AUDIOBOOKS[0],
    status: 'completed',
    progress: 100,
    totalBytes: 350000000, // 350 MB
    downloadedBytes: 350000000,
    localPath: '/demo/sherlock-holmes.m4b',
    quality: 'original',
    createdAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
  },
];

// Continue watching items (mix of movies and episodes)
export const DEMO_CONTINUE_WATCHING: BaseItem[] = [
  {
    ...DEMO_MOVIES[0],
    UserData: {
      PlaybackPositionTicks: 288000000000, // 48 minutes in (halfway)
      PlayCount: 0,
      IsFavorite: false,
      Played: false,
    },
  },
  DEMO_EPISODES[0],
  {
    ...DEMO_MOVIES[4],
    UserData: {
      PlaybackPositionTicks: 339000000000, // 56.5 minutes in
      PlayCount: 0,
      IsFavorite: true,
      Played: false,
    },
  },
];

// Demo image URLs - using placeholder gradients for clean screenshots
export const DEMO_IMAGE_MAP: Record<string, { primary: string; backdrop?: string }> = {
  // Movies - dark cinematic gradients
  'demo-movie-1': {
    primary: 'https://placehold.co/400x600/1a1a2e/e94560?text=Night+of+the\\nLiving+Dead',
    backdrop: 'https://placehold.co/1920x1080/1a1a2e/e94560?text=Night+of+the+Living+Dead',
  },
  'demo-movie-2': {
    primary: 'https://placehold.co/400x600/0f3460/e94560?text=Nosferatu',
    backdrop: 'https://placehold.co/1920x1080/0f3460/e94560?text=Nosferatu',
  },
  'demo-movie-3': {
    primary: 'https://placehold.co/400x600/3d1f1f/f5a623?text=The+General',
    backdrop: 'https://placehold.co/1920x1080/3d1f1f/f5a623?text=The+General',
  },
  'demo-movie-4': {
    primary: 'https://placehold.co/400x600/2d132c/ffb6c1?text=His+Girl\\nFriday',
    backdrop: 'https://placehold.co/1920x1080/2d132c/ffb6c1?text=His+Girl+Friday',
  },
  'demo-movie-5': {
    primary: 'https://placehold.co/400x600/1b262c/00d4ff?text=Charade',
    backdrop: 'https://placehold.co/1920x1080/1b262c/00d4ff?text=Charade',
  },
  // TV Shows
  'demo-series-1': {
    primary: 'https://placehold.co/400x600/141e30/9d4edd?text=The+Twilight\\nZone',
    backdrop: 'https://placehold.co/1920x1080/141e30/9d4edd?text=The+Twilight+Zone',
  },
  'demo-series-2': {
    primary: 'https://placehold.co/400x600/232526/ff6b6b?text=Alfred\\nHitchcock',
    backdrop: 'https://placehold.co/1920x1080/232526/ff6b6b?text=Alfred+Hitchcock+Presents',
  },
  'demo-series-3': {
    primary: 'https://placehold.co/400x600/1e3d59/c9a227?text=Sherlock\\nHolmes',
    backdrop: 'https://placehold.co/1920x1080/1e3d59/c9a227?text=Sherlock+Holmes',
  },
  // Episodes
  'demo-episode-1': {
    primary: 'https://placehold.co/400x225/141e30/9d4edd?text=Time+Enough\\nat+Last',
    backdrop: 'https://placehold.co/1920x1080/141e30/9d4edd?text=Time+Enough+at+Last',
  },
  'demo-episode-2': {
    primary: 'https://placehold.co/400x225/141e30/9d4edd?text=Maple+Street',
  },
  // Music Albums - elegant classical gradients
  'demo-album-1': {
    primary: 'https://placehold.co/400x400/1a1a2e/d4af37?text=Beethoven',
  },
  'demo-album-2': {
    primary: 'https://placehold.co/400x400/2b2e4a/b8860b?text=Bach',
  },
  'demo-album-3': {
    primary: 'https://placehold.co/400x400/3d1f1f/ffd700?text=Mozart',
  },
  'demo-album-4': {
    primary: 'https://placehold.co/400x400/1f4037/90ee90?text=Vivaldi',
  },
  'demo-album-5': {
    primary: 'https://placehold.co/400x400/0f2027/87ceeb?text=Debussy',
  },
  // Audio tracks inherit from albums
  'demo-track-1': {
    primary: 'https://placehold.co/400x400/1a1a2e/d4af37?text=Moonlight\\nSonata',
  },
  'demo-track-2': {
    primary: 'https://placehold.co/400x400/2b2e4a/b8860b?text=Cello+Suite',
  },
  'demo-track-3': {
    primary: 'https://placehold.co/400x400/3d1f1f/ffd700?text=Nachtmusik',
  },
  'demo-track-4': {
    primary: 'https://placehold.co/400x400/1f4037/90ee90?text=Spring',
  },
  'demo-track-5': {
    primary: 'https://placehold.co/400x400/0f2027/87ceeb?text=Clair+de+Lune',
  },
  // Audiobooks
  'demo-audiobook-1': {
    primary: 'https://placehold.co/400x600/2c3e50/f39c12?text=Sherlock\\nHolmes',
  },
  'demo-audiobook-2': {
    primary: 'https://placehold.co/400x600/8e44ad/ecf0f1?text=Pride+%26\\nPrejudice',
  },
  'demo-audiobook-3': {
    primary: 'https://placehold.co/400x600/c0392b/ecf0f1?text=Dracula',
  },
  'demo-audiobook-4': {
    primary: 'https://placehold.co/400x600/34495e/e74c3c?text=Tale+of\\nTwo+Cities',
  },
  'demo-audiobook-5': {
    primary: 'https://placehold.co/400x600/27ae60/f1c40f?text=Tom+Sawyer',
  },
  // Books
  'demo-book-1': {
    primary: 'https://placehold.co/400x600/1a1a2e/00ff00?text=Frankenstein',
  },
  'demo-book-2': {
    primary: 'https://placehold.co/400x600/1e3799/ffffff?text=Moby+Dick',
  },
  'demo-book-3': {
    primary: 'https://placehold.co/400x600/6c3483/d4af37?text=Dorian+Gray',
  },
  'demo-book-4': {
    primary: 'https://placehold.co/400x600/3498db/ffffff?text=Alice+in\\nWonderland',
  },
  'demo-book-5': {
    primary: 'https://placehold.co/400x600/922b21/2ecc71?text=War+of\\nthe+Worlds',
  },
  // Live TV Channels
  'demo-channel-1': {
    primary: 'https://placehold.co/400x400/1a1a2e/e94560?text=Classic\\nMovies',
  },
  'demo-channel-2': {
    primary: 'https://placehold.co/400x400/2d132c/ffb6c1?text=Drama\\nClassics',
  },
  'demo-channel-3': {
    primary: 'https://placehold.co/400x400/141e30/9d4edd?text=Mystery\\nTheatre',
  },
  'demo-channel-4': {
    primary: 'https://placehold.co/400x400/0f3460/e94560?text=Silent\\nFilm',
  },
  'demo-channel-5': {
    primary: 'https://placehold.co/400x400/3d1f1f/f5a623?text=Comedy\\nClassics',
  },
};

// Lyrics for demo tracks (placeholder text since these are instrumental)
export const DEMO_LYRICS: Record<string, string> = {
  'demo-track-1': `[Instrumental - Piano Sonata No. 14]

The "Moonlight Sonata" is one of Beethoven's
most beloved compositions. Written in 1801,
the first movement is marked "Adagio sostenuto"
and is characterized by its gentle, flowing
arpeggios and melancholic melody.

The piece was dedicated to Countess Giulietta
Guicciardi, with whom Beethoven was reportedly
in love. The name "Moonlight Sonata" was given
by music critic Ludwig Rellstab years after
Beethoven's death.`,

  'demo-track-2': `[Instrumental - Cello Suite No. 1]

Bach's Cello Suites are among the most
performed solo compositions for cello.
The Prelude of Suite No. 1 in G major
is particularly famous for its flowing
arpeggios and harmonic richness.

Written around 1720, these suites were
rediscovered and popularized by Pablo
Casals in the early 20th century.`,

  'demo-track-3': `[Instrumental - Serenade No. 13]

"Eine kleine Nachtmusik" (A Little Night Music)
was composed by Mozart in 1787. This beloved
serenade is one of his most famous works.

The first movement, Allegro, opens with an
ascending theme that has become one of the
most recognizable melodies in classical music.`,

  'demo-track-4': `[Instrumental - The Four Seasons]

"La Primavera" (Spring) from Vivaldi's
The Four Seasons depicts the arrival of spring.
The concerto is accompanied by a sonnet,
possibly written by Vivaldi himself:

"Spring has come, and joyfully
The birds greet it with happy song,
And the streams, caressed by breezes,
Flow with a sweet murmur."`,

  'demo-track-5': `[Instrumental - Clair de Lune]

"Clair de Lune" (Moonlight) is the third
movement of Debussy's Suite bergamasque.
Composed in 1890 and revised in 1905,
it evokes the quiet beauty of moonlight.

The title refers to a poem by Paul Verlaine
that begins: "Your soul is a select landscape..."
The piece is known for its dreamlike quality
and delicate, impressionistic harmonies.`,
};

interface DemoState {
  isDemoMode: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  toggleDemoMode: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  enterDemoMode: () => set({ isDemoMode: true }),
  exitDemoMode: () => set({ isDemoMode: false }),
  toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
}));

// Helper function to get demo image URL
export function getDemoImageUrl(itemId: string, imageType: 'primary' | 'backdrop' = 'primary'): string {
  const images = DEMO_IMAGE_MAP[itemId];
  if (!images) {
    // Fallback gradient
    return `https://placehold.co/400x600/1a1a2e/ffffff?text=Demo`;
  }
  return imageType === 'backdrop' && images.backdrop ? images.backdrop : images.primary;
}

// Demo Jellyseerr data for discover/requests
export const DEMO_JELLYSEERR_TRENDING = [
  {
    id: 27205,
    mediaType: 'movie' as const,
    popularity: 68.5,
    posterPath: '/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg',
    backdropPath: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    voteCount: 35000,
    voteAverage: 8.4,
    genreIds: [28, 878, 12],
    overview: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
    originalLanguage: 'en',
    title: 'Inception',
    originalTitle: 'Inception',
    releaseDate: '2010-07-16',
  },
  {
    id: 603,
    mediaType: 'movie' as const,
    popularity: 62.3,
    posterPath: '/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdropPath: '/fNG7i7RqMErkcqhohV2a6cV1Ehy.jpg',
    voteCount: 24000,
    voteAverage: 8.7,
    genreIds: [28, 878],
    overview: 'A computer hacker learns about the true nature of reality and his role in the war against its controllers.',
    originalLanguage: 'en',
    title: 'The Matrix',
    originalTitle: 'The Matrix',
    releaseDate: '1999-03-31',
  },
  {
    id: 155,
    mediaType: 'movie' as const,
    popularity: 85.2,
    posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdropPath: '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
    voteCount: 31000,
    voteAverage: 9.0,
    genreIds: [18, 28, 80, 53],
    overview: 'Batman raises the stakes in his war on crime with the help of Lt. Jim Gordon.',
    originalLanguage: 'en',
    title: 'The Dark Knight',
    originalTitle: 'The Dark Knight',
    releaseDate: '2008-07-18',
  },
  {
    id: 1396,
    mediaType: 'tv' as const,
    popularity: 120.5,
    posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    backdropPath: '/tsRy63Mu5cu8etL1X7ZLyf7gYr.jpg',
    voteCount: 12000,
    voteAverage: 9.5,
    genreIds: [18, 80],
    overview: 'A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing crystal meth.',
    originalLanguage: 'en',
    name: 'Breaking Bad',
    originalName: 'Breaking Bad',
    firstAirDate: '2008-01-20',
  },
  {
    id: 1399,
    mediaType: 'tv' as const,
    popularity: 115.8,
    posterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJx.jpg',
    backdropPath: '/suopoADq0k8YZr4dQXcU6pToj6s.jpg',
    voteCount: 22000,
    voteAverage: 8.4,
    genreIds: [10765, 18, 10759],
    overview: 'Seven noble families fight for control of the mythical land of Westeros.',
    originalLanguage: 'en',
    name: 'Game of Thrones',
    originalName: 'Game of Thrones',
    firstAirDate: '2011-04-17',
  },
];

export const DEMO_JELLYSEERR_POPULAR_MOVIES = [
  {
    id: 550,
    mediaType: 'movie' as const,
    popularity: 75.3,
    posterPath: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    backdropPath: '/fCayJrkfRaCRCTh176RzLT1r4rL.jpg',
    voteCount: 28000,
    voteAverage: 8.4,
    genreIds: [18],
    overview: 'A depressed man suffering from insomnia meets a strange soap salesman.',
    originalLanguage: 'en',
    title: 'Fight Club',
    originalTitle: 'Fight Club',
    releaseDate: '1999-10-15',
  },
  {
    id: 13,
    mediaType: 'movie' as const,
    popularity: 68.2,
    posterPath: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    backdropPath: '/rSPw7tgCH9c6NqICZef4kZjFOQ5.jpg',
    voteCount: 15000,
    voteAverage: 8.5,
    genreIds: [35, 18, 10749],
    overview: 'A man with a low IQ has accomplished great things in his life.',
    originalLanguage: 'en',
    title: 'Forrest Gump',
    originalTitle: 'Forrest Gump',
    releaseDate: '1994-07-06',
  },
  {
    id: 680,
    mediaType: 'movie' as const,
    popularity: 72.1,
    posterPath: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    backdropPath: '/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg',
    voteCount: 26000,
    voteAverage: 8.5,
    genreIds: [53, 80],
    overview: 'The lives of two mob hitmen, a boxer, and a pair of diner bandits intertwine.',
    originalLanguage: 'en',
    title: 'Pulp Fiction',
    originalTitle: 'Pulp Fiction',
    releaseDate: '1994-10-14',
  },
];

export const DEMO_JELLYSEERR_POPULAR_TV = [
  {
    id: 94997,
    mediaType: 'tv' as const,
    popularity: 95.6,
    posterPath: '/zrPpUlehQaBf8YX2xaI1ckAFDxv.jpg',
    backdropPath: '/8BmYQ8W3q2GjWIiP8Y9xYqDR3u9.jpg',
    voteCount: 8500,
    voteAverage: 8.1,
    genreIds: [18, 9648, 10765],
    overview: 'A young woman discovers she has inherited a manor, along with its dark secrets.',
    originalLanguage: 'en',
    name: 'House of the Dragon',
    originalName: 'House of the Dragon',
    firstAirDate: '2022-08-21',
  },
  {
    id: 66732,
    mediaType: 'tv' as const,
    popularity: 88.4,
    posterPath: '/reEMJA1uzscCbkpeRJeTT2bjqUp.jpg',
    backdropPath: '/9faGSFi5jam6pDWGNd0p8JcJgXQ.jpg',
    voteCount: 14000,
    voteAverage: 8.6,
    genreIds: [10765, 18],
    overview: 'A young boy vanishes in a small town, unraveling a series of mysteries.',
    originalLanguage: 'en',
    name: 'Stranger Things',
    originalName: 'Stranger Things',
    firstAirDate: '2016-07-15',
  },
  {
    id: 76479,
    mediaType: 'tv' as const,
    popularity: 78.9,
    posterPath: '/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
    backdropPath: '/56v2KjBlU4XaOv9rVYEQypROD7P.jpg',
    voteCount: 11000,
    voteAverage: 8.2,
    genreIds: [10759, 10765],
    overview: 'The further adventures of the Mandalorian and his foundling.',
    originalLanguage: 'en',
    name: 'The Mandalorian',
    originalName: 'The Mandalorian',
    firstAirDate: '2019-11-12',
  },
];

export const DEMO_JELLYSEERR_UPCOMING = [
  {
    id: 912649,
    mediaType: 'movie' as const,
    popularity: 145.2,
    posterPath: '/ldfCF9RhR40mppkzmftxapaHeTo.jpg',
    backdropPath: '/xvk5AhfhgQcTuaCQyq5XwA5tPwT.jpg',
    voteCount: 0,
    voteAverage: 0,
    genreIds: [28, 878, 12],
    overview: 'The next installment in the action-packed sci-fi franchise.',
    originalLanguage: 'en',
    title: 'Venom: The Last Dance',
    originalTitle: 'Venom: The Last Dance',
    releaseDate: '2024-10-25',
  },
  {
    id: 693134,
    mediaType: 'movie' as const,
    popularity: 132.8,
    posterPath: '/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
    backdropPath: '/nb3xI8XI3w4pMVZ38VijbsyBqP4.jpg',
    voteCount: 0,
    voteAverage: 0,
    genreIds: [18, 878, 12],
    overview: 'The epic continuation of the Dune saga.',
    originalLanguage: 'en',
    title: 'Dune: Part Two',
    originalTitle: 'Dune: Part Two',
    releaseDate: '2024-03-01',
  },
];

const DEMO_USER = {
  id: 1,
  email: 'demo@example.com',
  username: 'DemoUser',
  displayName: 'Demo User',
  permissions: 32, // REQUEST permission
  avatar: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  requestCount: 3,
};

export const DEMO_JELLYSEERR_MY_REQUESTS = [
  {
    id: 1,
    status: 4 as const, // AVAILABLE
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), // 7 days ago
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    type: 'movie' as const,
    is4k: false,
    media: {
      id: 1,
      tmdbId: 27205,
      status: 5 as const, // AVAILABLE
      status4k: 1 as const,
      mediaType: 'movie' as const,
      title: 'Inception',
      overview: 'A thief who steals corporate secrets through dream-sharing technology.',
      posterPath: '/8IB2e4r4oVhHnANbnm7O3Tj6tF8.jpg',
      backdropPath: '/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
      releaseDate: '2010-07-16',
      voteAverage: 8.4,
    },
    requestedBy: DEMO_USER,
  },
  {
    id: 2,
    status: 2 as const, // APPROVED
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    type: 'movie' as const,
    is4k: false,
    media: {
      id: 2,
      tmdbId: 155,
      status: 3 as const, // PROCESSING
      status4k: 1 as const,
      mediaType: 'movie' as const,
      title: 'The Dark Knight',
      overview: 'Batman raises the stakes in his war on crime.',
      posterPath: '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      backdropPath: '/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
      releaseDate: '2008-07-18',
      voteAverage: 9.0,
    },
    requestedBy: DEMO_USER,
  },
  {
    id: 3,
    status: 1 as const, // PENDING
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), // 1 day ago
    updatedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    type: 'tv' as const,
    is4k: false,
    media: {
      id: 3,
      tmdbId: 1396,
      status: 1 as const, // UNKNOWN
      status4k: 1 as const,
      mediaType: 'tv' as const,
      title: 'Breaking Bad',
      overview: 'A high school chemistry teacher turns to manufacturing crystal meth.',
      posterPath: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
      backdropPath: '/tsRy63Mu5cu8etL1X7ZLyf7gYr.jpg',
      firstAirDate: '2008-01-20',
      voteAverage: 9.5,
    },
    requestedBy: DEMO_USER,
    seasons: [
      { id: 1, seasonNumber: 1, status: 1 as const },
      { id: 2, seasonNumber: 2, status: 1 as const },
    ],
  },
];

export const DEMO_JELLYSEERR_USER = DEMO_USER;

// Selectors
export const selectIsDemoMode = (state: DemoState) => state.isDemoMode;
