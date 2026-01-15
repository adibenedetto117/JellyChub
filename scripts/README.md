# Scripts

## Quick Start

```bash
./scripts/dev.sh              # Start dev server
./scripts/dev.sh android      # Run on Android device
./scripts/build.sh android    # Build debug APK
./scripts/install.sh          # Install on connected device
./scripts/release.sh patch    # Release new version
```

## Scripts

| Script | Description |
|--------|-------------|
| `dev.sh` | Start development server |
| `build.sh` | Build for any platform |
| `install.sh` | Install APK on Android device |
| `release.sh` | Bump version and release |
| `utils/version.sh` | Bump version numbers |

## dev.sh

Start the Expo development server.

```bash
./scripts/dev.sh                    # Interactive platform picker
./scripts/dev.sh android            # Run on Android
./scripts/dev.sh ios                # Run on iOS (macOS only)
./scripts/dev.sh web                # Run in browser
./scripts/dev.sh --clear            # Clear cache
./scripts/dev.sh android --tunnel   # Use tunnel for remote devices
```

## build.sh

Build the app for different platforms.

```bash
./scripts/build.sh android              # Debug APK
./scripts/build.sh android --release    # Release APK
./scripts/build.sh ios                  # iOS (macOS only)
./scripts/build.sh ios --release        # iOS release
./scripts/build.sh web                  # Web bundle
./scripts/build.sh all                  # All platforms
./scripts/build.sh android --clean      # Clean before building
```

Output: `android/app/build/outputs/apk/`

## install.sh

Build and install on a connected Android device.

```bash
./scripts/install.sh                # Debug build
./scripts/install.sh --release      # Release build
./scripts/install.sh --device ID    # Specific device
```

## release.sh

Bump version, create git tag, build, and publish release.

```bash
./scripts/release.sh patch          # 1.2.3 -> 1.2.4
./scripts/release.sh minor          # 1.2.3 -> 1.3.0
./scripts/release.sh major          # 1.2.3 -> 2.0.0
./scripts/release.sh patch --dry-run   # Preview changes
./scripts/release.sh patch --no-build  # Skip build
./scripts/release.sh patch --no-push   # Don't push to remote
```

## utils/version.sh

Bump version in package.json and app.json.

```bash
./scripts/utils/version.sh patch    # Bump patch
./scripts/utils/version.sh minor    # Bump minor
./scripts/utils/version.sh major    # Bump major
```
