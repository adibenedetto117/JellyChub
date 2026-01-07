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
- Subtitle support: VTT, SRT, ASS, SSA with customizable appearance
- Multiple audio track selection (30+ languages)
- Picture-in-Picture mode
- Skip intro/credits buttons (Jellyfin media segments)
- Volume/brightness swipe gestures
- Auto-play next episode
- Offline playback for downloads
- Hardware acceleration

### Music
- Background playback with lock screen controls
- Synced lyrics with auto-scroll
- Gapless playback
- Mini player with quick controls
- Playlist management

### Audiobooks
- Chapter navigation with visual timeline
- Sleep timer (5 min to 2 hours)
- Bookmarks with custom labels
- Variable playback speed (0.5x - 2x)
- M4B chapter parsing

### EPUB Reader
- Full EPUB rendering with epub.js
- Reading themes: Dark, Light, Sepia
- Adjustable font size
- Bookmarks with sync to Jellyfin

### PDF Reader
- Native PDF rendering with progress tracking

### Downloads
- Download movies, TV shows, music, and audiobooks
- Organized by content type with collapsible groups
- Quality options: original, high, medium, low
- Background download queue
- WiFi-only option
- Full offline playback

### Jellyseerr Integration
- Browse trending and popular content
- Request movies and TV shows
- View request status and history

### Server Administration
- Active sessions with remote control (play, pause, stop)
- Scheduled task management
- User management (create, delete, permissions)
- Library refresh controls
- Activity logs
- Server restart/shutdown

### Customizable Interface
- Configurable navigation bar (choose and reorder tabs)
- Set any tab as landing page
- Accent color themes

### Multi-Server Support
- Quick Connect authentication
- Switch between servers and users
- Per-server settings

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
- [ ] Audio quality improvements

### Planned
- [ ] Queue view and management
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
- [ ] Comic/manga reader
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
