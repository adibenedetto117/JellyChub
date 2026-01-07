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
- Stream movies and TV shows
- Subtitle formats: VTT, SRT, ASS, SSA
- Subtitle customization: size, color, background color, opacity
- Multiple audio track selection with 30+ language support
- Picture-in-Picture mode
- Skip intro button (uses Jellyfin media segments)
- Skip credits button
- Auto-play next episode
- Continue watching with resume support
- Gesture controls: swipe for volume/brightness, double-tap to seek
- Orientation lock toggle
- Offline playback for downloaded content

### Music
- Background playback with lock screen controls
- Queue management with drag-to-reorder
- Shuffle mode
- Repeat modes: off, repeat all, repeat one
- Synced lyrics display
- Add to playlist
- Add to favorites
- Artist, album, and genre browsing
- Gapless playback

### Audiobooks
- Chapter navigation with visual timeline
- Sleep timer: 5min, 10min, 15min, 30min, 45min, 1hr, 1.5hr, 2hr
- Bookmarks with labels
- Variable playback speed: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
- M4B chapter parsing
- Background playback
- Resume from last position

### EPUB Reader
- Full EPUB rendering
- Table of contents navigation
- Three themes: Dark, Light, Sepia
- Adjustable font size
- Bookmarks
- Reading progress tracking
- Swipe to turn pages

### PDF Reader
- Native PDF rendering
- Page navigation
- Reading progress tracking

### Downloads
- Download video, music, and audiobooks
- Pause and resume downloads
- Background download queue
- Storage usage stats
- Delete downloads
- Offline playback

### Jellyseerr Integration
- Browse trending and popular content
- Request movies and TV shows
- View request status
- Genre browsing
- Search Jellyseerr catalog

### Server Features
- Multi-server support
- Quick Connect authentication
- Server administration panel
- User management
- Activity logs
- Scheduled tasks

### Other
- Favorites collection
- Global search
- Accent color themes
- Continue watching row
- Next up episodes
- Recently added content

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
- [ ] Enhanced image caching

### Planned
- [ ] Chromecast support
- [ ] SyncPlay (watch together)
- [ ] Android TV optimization
- [ ] Play Store release
- [ ] App Store release
- [ ] Widget for currently playing
- [ ] Wear OS companion app
- [ ] CarPlay / Android Auto

### Under Consideration
- [ ] Intro/credits detection improvements
- [ ] Custom server plugins support
- [ ] Parental controls

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

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
