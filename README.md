# JellyChub

A Jellyfin client for Android, Android TV, and Desktop.

<p align="center">
  <img src="assets/icon.png" alt="JellyChub" width="128" height="128"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Android%20%7C%20TV%20%7C%20Desktop-blue" alt="Platforms"/>
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License"/>
  <img src="https://img.shields.io/badge/version-1.2.4-orange" alt="Version"/>
</p>

---

## Features

### Core Media Support

| Media Type | Features |
|------------|----------|
| **Video** | Movies & TV shows, trickplay preview, chapter navigation, skip intro/credits, A-B loop, PiP |
| **Music** | Albums, artists, playlists, queue management, synced lyrics, equalizer, visualizer |
| **Live TV** | Channel streaming, EPG grid, program guide, recordings, scheduled programs |
| **Audiobooks** | Chapter navigation, sleep timer, bookmarks, playback speed control, M4B support |
| **Books** | EPUB reader with themes, PDF viewer, comic reader (CBZ/CBR) |

### Platform Features

<table>
<tr>
<td width="33%" valign="top">

#### Mobile (Android)
- Touch gestures for volume, brightness, seeking
- Picture-in-Picture playback
- Background audio with lock screen controls
- Haptic feedback
- Biometric authentication
- Notification controls

</td>
<td width="33%" valign="top">

#### TV (Android TV)
- D-pad navigation with spatial focus
- 10-foot UI optimized layouts
- Sidebar navigation
- Remote control support
- Large artwork display
- Voice search ready

</td>
<td width="33%" valign="top">

#### Desktop (Win/Mac/Linux)
- Native window controls
- Custom title bar
- Keyboard shortcuts
- Mouse hover interactions
- Resizable panels
- System tray integration

</td>
</tr>
</table>

### Additional Features

- **Offline Downloads** - Download media with quality selection, encrypted storage, WiFi-only option
- **Chromecast** - Cast video and audio to compatible devices
- **Multi-server** - Connect to multiple Jellyfin servers
- **Multi-user** - Quick user switching with PIN/biometric lock
- **Quick Connect** - Login via 6-digit code, authorize other devices
- **Jellyseerr** - Browse trending content, request movies and TV shows
- **Radarr/Sonarr** - Calendar view, add media, manage collections
- **Admin Dashboard** - Active sessions, scheduled tasks, user management
- **OpenSubtitles** - Search and download subtitles
- **Subtitles** - Customizable styling (size, position, colors, outline)
- **Internationalization** - English, Spanish, French, German

---

## Architecture

```
src/
├── components/
│   ├── mobile/              # Mobile-optimized (touch, gestures)
│   │   ├── home/            # Home screen, media rows
│   │   ├── navigation/      # Bottom tab navigation
│   │   ├── player/          # Video, music, audiobook, live TV
│   │   ├── reader/          # EPUB, PDF, comic readers
│   │   ├── livetv/          # Channel lists, EPG
│   │   └── details/         # Media detail screens
│   │
│   ├── tv/                  # TV-optimized (D-pad, focus)
│   │   ├── home/            # Focusable cards, TV home
│   │   ├── navigation/      # Sidebar, focusable buttons
│   │   ├── player/          # Remote-friendly controls
│   │   ├── reader/          # Remote-friendly readers
│   │   ├── livetv/          # TV channel experience
│   │   └── details/         # TV detail screens
│   │
│   ├── desktop/             # Desktop-optimized (mouse, keyboard)
│   │   ├── home/            # Desktop home, hover effects
│   │   ├── navigation/      # Sidebar navigation
│   │   ├── player/          # Desktop playback controls
│   │   ├── reader/          # Panel-based readers
│   │   ├── details/         # Desktop detail screens
│   │   └── TitleBar.tsx     # Native window controls
│   │
│   └── shared/              # Cross-platform components
│       ├── ui/              # Buttons, inputs, loading states
│       ├── player/          # Mini player, trickplay preview
│       ├── library/         # Filter/sort modals
│       ├── music/           # Album cards, track lists
│       ├── livetv/          # Channel cards, EPG grid
│       ├── details/         # Media info, cast sections
│       ├── downloads/       # Download management
│       ├── admin/           # Server administration
│       ├── security/        # PIN lock, biometric auth
│       ├── jellyseerr/      # Request components
│       ├── radarr/          # Radarr integration
│       ├── sonarr/          # Sonarr integration
│       └── arr/             # Shared *arr components
│
├── api/                     # API layer
│   ├── client.ts            # Axios configuration
│   ├── auth.ts              # Authentication
│   ├── library.ts           # Media queries
│   ├── playback.ts          # Playback reporting
│   ├── livetv.ts            # Live TV endpoints
│   ├── admin.ts             # Admin endpoints
│   └── external/            # Third-party APIs
│       ├── jellyseerr.ts
│       ├── radarr.ts
│       └── sonarr.ts
│
├── hooks/                   # Custom React hooks
│   ├── usePlayer.ts         # Playback state
│   ├── useResponsive.ts     # Platform detection
│   ├── useChromecast.ts     # Cast functionality
│   ├── useVideoPlayerCore.ts
│   ├── useMusicPlayerCore.ts
│   ├── useAudiobookPlayerCore.ts
│   └── ...
│
├── stores/                  # Zustand state stores
│   ├── authStore.ts         # Authentication
│   ├── playerStore.ts       # Player state
│   ├── settingsStore.ts     # User preferences
│   ├── downloadStore.ts     # Download queue
│   ├── securityStore.ts     # PIN/biometric
│   └── ...
│
├── services/                # Business logic
├── types/                   # TypeScript definitions
├── utils/                   # Utilities
├── theme/                   # Design tokens
├── constants/               # App constants
├── i18n/                    # Translations
└── providers/               # React context
```

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [React Native](https://reactnative.dev/) 0.81 |
| Platform | [Expo](https://expo.dev/) SDK 54 |
| Language | [TypeScript](https://www.typescriptlang.org/) 5.9 |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (File-based) |
| Styling | [NativeWind](https://www.nativewind.dev/) (Tailwind CSS) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) 5 |
| Data Fetching | [TanStack Query](https://tanstack.com/query) 5 |
| HTTP Client | [Axios](https://axios-http.com/) |
| Video | [expo-video](https://docs.expo.dev/versions/latest/sdk/video/) |
| Audio | [expo-audio](https://docs.expo.dev/versions/latest/sdk/audio/) |
| Storage | [MMKV](https://github.com/mrousavy/react-native-mmkv) |
| Animations | [Reanimated](https://docs.swmansion.com/react-native-reanimated/) 4 |
| Desktop | [Electron](https://www.electronjs.org/) 33 |

---

## Quick Start

### Prerequisites

- Node.js 18+
- For mobile: Android Studio with SDK 34+
- For desktop: Electron dependencies for your platform

### Installation

```bash
# Clone the repository
git clone https://github.com/jellychub/jellychub.git
cd jellychub

# Install dependencies
npm install
```

### Development

```bash
# Start Expo development server
npm start

# Run on Android device/emulator
npm run android

# Run on web browser
npm run web
```

### Desktop Development

```bash
cd desktop
npm install
npm run dev
```

### Building

```bash
# Generate native projects
npm run prebuild

# Build Android APK
cd android && ./gradlew assembleRelease

# Build desktop applications
cd desktop
npm run build:linux   # AppImage, deb
npm run build:mac     # zip (x64, arm64)
npm run build:win     # NSIS installer, portable
npm run build:all     # All platforms
```

### iOS Builds (via EAS)

```bash
# Login to Expo
npm run ios:login

# Register your iOS device
npm run ios:device

# Build iOS app in cloud
npm run ios:build
```

Builds with a free Apple ID expire after 7 days.

---

## Project Structure

```
jellychub/
├── app/                     # Expo Router screens
│   ├── (auth)/              # Login, server selection
│   ├── (tabs)/              # Main tab screens
│   │   ├── home.tsx         # Home feed
│   │   ├── library.tsx      # Media library
│   │   ├── movies.tsx       # Movies
│   │   ├── shows.tsx        # TV Shows
│   │   ├── music.tsx        # Music
│   │   ├── books.tsx        # Books
│   │   ├── livetv.tsx       # Live TV
│   │   └── settings.tsx     # Settings
│   ├── player/              # Media players
│   ├── reader/              # Book readers
│   └── settings/            # Settings subscreens
│
├── src/                     # Source code (see Architecture)
│
├── desktop/                 # Electron wrapper
│   ├── main.js              # Main process
│   ├── preload.js           # Preload scripts
│   └── package.json         # Build configuration
│
├── assets/                  # Images, fonts, icons
└── android/                 # Android native project
```

---

## Configuration

### Server Connection

Connect to your Jellyfin server directly from the app. Server URL and credentials are stored securely on-device using encrypted storage.

### Optional Integrations

Configure these services in Settings for enhanced functionality:

| Service | Features |
|---------|----------|
| **Jellyseerr** | Browse trending, request movies/shows, track requests |
| **Radarr** | Add movies, select quality profiles, view calendar |
| **Sonarr** | Add shows, manage series, upcoming episodes |

---

## Contributing

Contributions welcome!

### Guidelines

1. **Platform Components** - Place platform-specific UI in `mobile/`, `tv/`, or `desktop/`
2. **Shared Logic** - Extract reusable code into `shared/` or custom hooks
3. **Type Safety** - Maintain full TypeScript strict mode compliance
4. **Styling** - Use NativeWind/Tailwind classes consistently
5. **State** - Use Zustand for global state, TanStack Query for server state

### Adding a New Feature

```
1. Create shared components in src/components/shared/
2. Create platform variants in mobile/, tv/, desktop/ as needed
3. Add hooks for business logic in src/hooks/
4. Add API endpoints in src/api/
5. Update types in src/types/
```

---

## Acknowledgments

- [Jellyfin](https://jellyfin.org/) - The free software media system
- [Expo](https://expo.dev/) - React Native development platform
- [Jellyseerr](https://github.com/Fallenbagel/jellyseerr) - Request management
- [Radarr](https://radarr.video/) / [Sonarr](https://sonarr.tv/) - Media management
- [OpenSubtitles](https://www.opensubtitles.org/) - Subtitle database

---

## License

MIT License - see [LICENSE](LICENSE) for details.

