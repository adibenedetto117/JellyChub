# JellyChub

A modern Jellyfin client for Android that handles all your media - video, music, audiobooks, and ebooks in one app.

<p align="center">
  <img src="assets/icon.png" alt="JellyChub" width="128" height="128"/>
</p>

![Platform](https://img.shields.io/badge/platform-Android-green)
![iOS](https://img.shields.io/badge/iOS-coming%20soon-lightgrey)
![License](https://img.shields.io/badge/license-MIT-blue)

## Download

**[Download Latest APK](https://github.com/adibenedetto117/JellyChub/releases/latest)**

Requires Android 8.0 (API 26) or higher.

## Features

### Video & TV Shows
- Stream movies and TV shows from Jellyfin
- Subtitle formats: VTT, SRT, ASS, SSA
- Subtitle size options: small, medium, large
- Subtitle text colors: white, yellow, cyan, green
- Subtitle background colors: black, gray, navy
- Subtitle background opacity slider
- Force subtitles option
- Default subtitle language setting
- Multiple audio track selection with 30+ languages
- Default audio language setting
- Picture-in-Picture mode
- Skip intro button (uses Jellyfin media segments)
- Skip credits button
- Auto-play next episode (configurable)
- Continue watching with resume support
- Double-tap left/right to seek 10 seconds
- Orientation lock toggle (landscape left/right)
- Hardware acceleration option
- Offline playback for downloaded content

### Music
- Background playback with lock screen controls
- Shuffle mode
- Repeat modes: off, repeat all, repeat one
- Lyrics display
- Add to playlist
- Add to favorites
- Create new playlists
- Artist browsing
- Album browsing
- Genre browsing
- Track list views
- Mini player with quick controls
- Gapless playback
- Album art display

### Audiobooks
- Chapter navigation with visual timeline
- Chapter list with durations
- Sleep timer options: 5, 10, 15, 30, 45 minutes, 1, 1.5, 2 hours
- Bookmarks with custom labels
- Bookmark list with jump-to
- Variable playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
- M4B chapter parsing
- Background playback
- Resume from last position
- Cover art display
- Progress bar with chapter markers

### Books Library
- Ebooks and audiobooks tabs
- Alphabetical index sidebar for quick navigation
- Continue reading section
- Bookmarks view across all books
- Progress percentage display
- Author display
- Grid and list views

### EPUB Reader
- Full EPUB rendering with epub.js
- Table of contents navigation
- Three themes: Dark, Light, Sepia
- Adjustable font size
- Add bookmarks at any position
- Bookmark list with jump-to
- Reading progress percentage
- Progress sync with Jellyfin server
- Swipe left/right to turn pages
- Tap edges to turn pages
- Resume from last position

### PDF Reader
- Native PDF rendering
- Page navigation controls
- Current page / total pages display
- Reading progress tracking

### Downloads
- Download video, music, and audiobooks
- Download quality options: original, high, medium, low
- Pause and resume downloads
- Background download queue
- WiFi-only download option
- Storage usage statistics
- Delete individual downloads
- Offline playback mode
- Download progress indicators

### Jellyseerr Integration
- Browse trending movies and TV shows
- Browse popular content
- Request movies
- Request TV shows (full series or specific seasons)
- View request status and history
- Genre browsing with dedicated pages
- Search Jellyseerr catalog
- View media details and ratings

### Server Administration
- Server overview with system info
- Library item counts (movies, series, episodes, etc.)
- Active sessions view
- Remote control: play, pause, stop active sessions
- Scheduled tasks list
- Run or stop scheduled tasks
- User management
- Create new users
- Delete users
- Enable/disable users
- Reset user passwords
- Edit user permissions and policies
- Library refresh controls
- Activity logs
- Restart server
- Shutdown server

### Customizable Interface
- Fully customizable bottom navigation bar
- Choose which tabs to show (Home, Movies, Shows, Music, Books, etc.)
- Reorder tabs to your preference
- Set any tab as your landing page
- Make JellyChub your dedicated music app, video app, or all-in-one media app
- Accent color themes: blue, purple, pink, red, orange, green, teal

### Settings
- Multi-server support with server switching
- Quick Connect authentication
- Switch between users on same server
- Sign out
- Offline mode toggle (downloads only)
- Auto-play next episode toggle
- Hardware acceleration toggle
- Default audio language (20+ languages)
- Default subtitle language (20+ languages)
- Download quality setting
- WiFi-only downloads toggle
- Storage and cache management
- Clear image cache
- Jellyseerr server configuration

### Home & Navigation
- Home screen with media rows
- Continue watching row
- Next up episodes row
- Recently added content
- Library browsing
- Movies section
- TV Shows section
- Music section
- Favorites collection
- Global search across all libraries
- Bottom navigation bar

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | React Native 0.81 / Expo 54 |
| Language | TypeScript |
| Styling | NativeWind (Tailwind CSS) |
| State Management | Zustand |
| Data Fetching | TanStack Query (React Query) |
| Local Storage | MMKV |
| Video Player | expo-video |
| Audio Player | react-native-track-player |

## Building from Source

### Prerequisites
- Node.js 18+
- Android SDK (API 26+)
- Java 17

### Build Steps

```bash
# Clone the repository
git clone https://github.com/adibenedetto117/JellyChub.git
cd JellyChub

# Install dependencies
npm install

# Generate native code
npx expo prebuild

# Build release APK
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

### Development

```bash
# Start development server
npx expo start

# Run on Android device/emulator
npx expo run:android
```

## Roadmap

### In Progress
- [ ] iOS build and testing
- [ ] Better image caching
- [ ] Video player icon overhaul
- [ ] Audio quality improvements

### Planned
- [ ] Volume/brightness swipe gestures
- [ ] Queue view and management
- [ ] Synced lyrics with auto-scroll
- [ ] iOS release
- [ ] Live TV support
- [ ] Chromecast support
- [ ] SyncPlay (watch together)
- [ ] Android TV optimization
- [ ] Play Store release
- [ ] App Store release
- [ ] Widget for currently playing
- [ ] Wear OS companion app
- [ ] CarPlay / Android Auto

### Under Consideration
- [ ] Comic/manga reader
- [ ] Intro/credits detection improvements
- [ ] Custom server plugins support
- [ ] Parental controls

## Acknowledgments

- [Jellyfin](https://jellyfin.org/) - The free software media system this app connects to
- [Expo](https://expo.dev/) - React Native framework and tooling
- [React Native](https://reactnative.dev/) - Mobile app framework
- [Finamp](https://github.com/jmshrv/finamp) - Inspiration for music player features
- [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) - Request management integration
- [TanStack Query](https://tanstack.com/query) - Data fetching and caching
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [NativeWind](https://www.nativewind.dev/) - Tailwind CSS for React Native
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) - Animations
- [MMKV](https://github.com/mrousavy/react-native-mmkv) - Fast key-value storage
- [epub.js](https://github.com/futurepress/epub.js) - EPUB rendering

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*JellyChub is an independent project and is not affiliated with or endorsed by Jellyfin.*
