# JellyChub

A modern Jellyfin client for Android that handles all your media in one app.

<p align="center">
  <img src="assets/icon.png" alt="JellyChub" width="128" height="128"/>
</p>

![Platform](https://img.shields.io/badge/platform-Android-green)
![Android TV](https://img.shields.io/badge/Android%20TV-beta-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)

## Download

**[Download Latest APK](https://github.com/adibenedetto117/JellyChub/releases/latest)**

Requires Android 8.0 or higher.

## Features

### Video Player
- Multiple audio track selection
- Subtitle support (VTT, SRT, ASS, SSA)
- Customizable subtitle appearance (size, color, background)
- Subtitle timing offset adjustment
- OpenSubtitles search and download
- Skip intro and credits (Jellyfin media segments)
- Chapter navigation with markers
- Trickplay thumbnail previews
- Playback speed control (0.25x - 2x)
- A-B loop for repeating sections
- Sleep timer
- Lock controls mode
- Picture-in-Picture
- External player support (VLC, Infuse, nPlayer)
- Chromecast support
- Hardware acceleration
- Auto-play next episode
- Resume playback position

### Live TV (Beta)
- Channel streaming
- EPG grid view
- Channel groups
- Program details

### Music Player
- Background playback
- Lock screen controls
- Synced lyrics with auto-scroll
- Equalizer presets
- Mini player
- Queue management
- Playlist support
- Sleep timer
- Playback speed control

### Audiobook Player
- Chapter navigation
- Sleep timer (5 min - 2 hours)
- Bookmarks
- Playback speed (0.5x - 2x)
- M4B chapter parsing
- Background playback
- Progress sync

### EPUB Reader
- Full EPUB rendering
- Reading themes (Dark, Light, Sepia)
- Adjustable font size
- Bookmarks
- Progress tracking

### PDF Reader
- Native rendering
- Progress tracking

### Comic Reader (Beta)
- Page-by-page viewing
- Progress tracking

### Downloads
- Download any media type
- Encrypted storage (AES)
- Quality selection (Original, High, Medium, Low)
- Background downloads
- WiFi-only option
- Auto-remove watched content
- Full offline playback

### Offline Mode
- Browse and play downloaded content
- Access settings
- No server connection required

### Jellyseerr Integration
- Browse trending content
- Request movies and TV shows
- View request status

### Radarr & Sonarr Integration
- Add movies to Radarr
- Add shows to Sonarr
- Quality profile selection
- Root folder selection
- Manage existing entries

### Server Administration
- View active sessions
- Remote playback control
- Scheduled tasks
- User management
- Library refresh
- Activity logs
- Server restart/shutdown

### Android TV (Beta)
- D-pad navigation
- Sidebar navigation
- TV-optimized controls

### Security
- PIN lock
- Biometric authentication

### Customization
- Customizable bottom navigation
- Reorder tabs
- Set landing page
- Accent color themes

### Multi-Server
- Multiple server connections
- Quick Connect authentication
- Easy user switching

## Building from Source

### Prerequisites
- Node.js 18+
- Android SDK (API 26+)
- Java 17

### Build Steps

```bash
git clone https://github.com/adibenedetto117/JellyChub.git
cd JellyChub
npm install --legacy-peer-deps
npx expo prebuild
cd android && ./gradlew assembleRelease
```

The APK will be at `android/app/build/outputs/apk/release/app-release.apk`

### Development

```bash
npx expo start
npx expo run:android
```

## Roadmap

### Planned
- iOS release
- SyncPlay (watch together)
- Play Store release
- Widget for currently playing
- Wear OS companion app
- CarPlay / Android Auto

## Acknowledgments

- [Jellyfin](https://jellyfin.org/) - The free software media system
- [Expo](https://expo.dev/) - React Native framework
- [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) - Request management
- [Radarr](https://radarr.video/) / [Sonarr](https://sonarr.tv/) - Media management
- [OpenSubtitles](https://www.opensubtitles.org/) - Subtitle database

## License

MIT License - see [LICENSE](LICENSE) for details.

---

*JellyChub is not affiliated with or endorsed by Jellyfin.*
