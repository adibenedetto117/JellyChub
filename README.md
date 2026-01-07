# JellyChub

A Jellyfin client for mobile that handles all your media - video, music, audiobooks, ebooks, and comics.

![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS%20(coming%20soon)-green)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## Features

**Video & TV**
- Stream with subtitle and audio track selection
- Picture-in-Picture, skip intro/credits, auto-play next

**Music**
- Background playback with queue, shuffle, repeat
- Lyrics display, playlist management

**Audiobooks**
- Chapter navigation, sleep timer, bookmarks
- Variable speed (0.5x-2x), M4B chapter parsing

**E-books & Comics**
- EPUB and PDF reader with themes
- Comic reader with manga support (RTL)

**Downloads**
- Offline playback for video, music, audiobooks
- Storage management, WiFi-only option

**Extras**
- Jellyseerr integration for requests
- Server admin panel
- Multi-server, Quick Connect

---

## Install

**Android 8.0+** - Download from [Releases](https://github.com/adibenedetto117/JellyChub/releases)

### Build

```bash
git clone https://github.com/adibenedetto117/JellyChub.git
cd JellyChub && npm install
npx expo prebuild
cd android && ./gradlew assembleDebug
```

---

## Roadmap

- iOS release
- Play Store / App Store
- Chromecast, SyncPlay

---

## License

MIT

*Not affiliated with Jellyfin.*
