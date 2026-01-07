# JellyChub

A modern Jellyfin client for Android that handles all your media - video, music, audiobooks, ebooks, and comics in one app.

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
- Full video streaming with quality selection
- Subtitle support (embedded & external) with style customization
- Multiple audio track selection
- Picture-in-Picture mode
- Skip intro and credits buttons
- Auto-play next episode
- Continue watching with resume support

### Music
- Background playback with lock screen controls
- Queue management with drag-to-reorder
- Shuffle and repeat modes
- Lyrics display (synced and unsynced)
- Playlist creation and management
- Artist, album, and genre browsing
- Gapless playback

### Audiobooks
- Chapter navigation with visual progress
- Sleep timer with shake-to-extend
- Bookmarks with notes
- Variable playback speed (0.5x - 2.0x)
- M4B chapter parsing support
- Resume position sync across devices

### E-books & Comics
- EPUB reader with customizable themes
- PDF support with smooth scrolling
- Comic/manga reader with page modes
- Right-to-left reading for manga
- Reading progress tracking
- Offline reading support

### Downloads & Offline
- Download video, music, and audiobooks for offline playback
- Storage management with usage stats
- WiFi-only download option
- Background download queue
- Automatic cleanup of watched downloads

### Additional Features
- **Jellyseerr Integration**: Browse and request new content directly from the app
- **Multi-server Support**: Connect to multiple Jellyfin servers
- **Quick Connect**: Easy server authentication via QR code
- **Server Administration**: Basic admin controls for managing your server
- **Favorites**: Quick access to your favorite content
- **Search**: Global search across all libraries

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

- [Jellyfin](https://jellyfin.org/) - The free software media system
- [Expo](https://expo.dev/) - React Native framework and tooling
- [Finamp](https://github.com/jmshrv/finamp) - Inspiration for music player features
- [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) - Request management integration

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*JellyChub is an independent project and is not affiliated with or endorsed by Jellyfin.*
