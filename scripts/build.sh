#!/bin/bash

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"
ANDROID_SDK="${ANDROID_HOME:-$HOME/Android/Sdk}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[BUILD]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

show_help() {
    cat << EOF
JellyChub Build Script

Usage: ./scripts/build.sh [command] [options]

Commands:
  all             Build all platforms (mobile + tv + desktop)
  android         Build Android APKs (mobile and TV)
  mobile          Build mobile APK only
  tv              Build TV APK only
  desktop         Build desktop apps only
  install         Install APK to connected Android device
  clean           Clean all build artifacts
  list            List all build outputs

Options:
  --release       Build release version (default)
  --debug         Build debug version

Examples:
  ./scripts/build.sh all                    Build everything
  ./scripts/build.sh mobile                 Build mobile APK only
  ./scripts/build.sh tv                     Build TV APK only
  ./scripts/build.sh android                Build both mobile and TV APKs
  ./scripts/build.sh install --phone        Install mobile APK to phone
  ./scripts/build.sh install --tv           Install TV APK to Shield/TV
  ./scripts/build.sh clean                  Clean build artifacts

Output:
  All build artifacts are placed in: ./dist/
    dist/android/mobile/      - Mobile APK (com.jellychub.app)
    dist/android/tv/          - TV APK (com.jellychub.app.tv)
    dist/desktop/linux/       - AppImage, deb
    dist/desktop/mac/         - dmg, zip
    dist/desktop/windows/     - exe, portable
EOF
}

clean_builds() {
    log "Cleaning build artifacts..."
    rm -rf "$DIST_DIR"
    rm -rf "$PROJECT_ROOT/android/app/build"
    rm -rf "$PROJECT_ROOT/desktop/dist"
    rm -rf "$PROJECT_ROOT/desktop/web-build"
    rm -rf "$PROJECT_ROOT/dist-desktop"
    log "Clean complete"
}

setup_dist() {
    mkdir -p "$DIST_DIR/android/mobile"
    mkdir -p "$DIST_DIR/android/tv"
    mkdir -p "$DIST_DIR/desktop/linux"
    mkdir -p "$DIST_DIR/desktop/mac"
    mkdir -p "$DIST_DIR/desktop/windows"
}

build_mobile() {
    local build_type="${1:-release}"
    local gradle_task="assembleMobile${build_type^}"

    log "Building Mobile APK ($build_type)..."

    cd "$PROJECT_ROOT"

    if [ ! -d "android" ]; then
        log "Running expo prebuild..."
        npx expo prebuild --platform android
    fi

    cd "$PROJECT_ROOT/android"
    ./gradlew "$gradle_task" --no-daemon

    if [ "$build_type" = "release" ]; then
        cp -f app/build/outputs/apk/mobile/release/*.apk "$DIST_DIR/android/mobile/" 2>/dev/null || true
    else
        cp -f app/build/outputs/apk/mobile/debug/*.apk "$DIST_DIR/android/mobile/" 2>/dev/null || true
    fi

    log "Mobile APK build complete"
}

build_tv() {
    local build_type="${1:-release}"
    local gradle_task="assembleTv${build_type^}"

    log "Building TV APK ($build_type)..."

    cd "$PROJECT_ROOT"

    if [ ! -d "android" ]; then
        log "Running expo prebuild..."
        npx expo prebuild --platform android
    fi

    cd "$PROJECT_ROOT/android"
    ./gradlew "$gradle_task" --no-daemon

    if [ "$build_type" = "release" ]; then
        cp -f app/build/outputs/apk/tv/release/*.apk "$DIST_DIR/android/tv/" 2>/dev/null || true
    else
        cp -f app/build/outputs/apk/tv/debug/*.apk "$DIST_DIR/android/tv/" 2>/dev/null || true
    fi

    log "TV APK build complete"
}

build_android() {
    local build_type="${1:-release}"
    build_mobile "$build_type"
    build_tv "$build_type"
    log "All Android builds complete"
    ls -la "$DIST_DIR/android/mobile/" "$DIST_DIR/android/tv/" 2>/dev/null || true
}

build_desktop() {
    log "Building desktop apps..."

    cd "$PROJECT_ROOT"
    log "Building web bundle..."
    npx expo export --platform web --output-dir desktop/dist

    cd "$PROJECT_ROOT/desktop"

    if [ ! -d "node_modules" ]; then
        log "Installing desktop dependencies..."
        npm install
    fi

    log "Building Linux packages..."
    npm run build:linux || warn "Linux build failed (may need dependencies)"

    if [ -d "$PROJECT_ROOT/dist-desktop" ]; then
        cp -f "$PROJECT_ROOT/dist-desktop"/*.AppImage "$DIST_DIR/desktop/linux/" 2>/dev/null || true
        cp -f "$PROJECT_ROOT/dist-desktop"/*.deb "$DIST_DIR/desktop/linux/" 2>/dev/null || true
        cp -f "$PROJECT_ROOT/dist-desktop"/*.zip "$DIST_DIR/desktop/mac/" 2>/dev/null || true
        cp -f "$PROJECT_ROOT/dist-desktop"/*.dmg "$DIST_DIR/desktop/mac/" 2>/dev/null || true
        cp -f "$PROJECT_ROOT/dist-desktop"/*.exe "$DIST_DIR/desktop/windows/" 2>/dev/null || true
        cp -rf "$PROJECT_ROOT/dist-desktop"/*-portable "$DIST_DIR/desktop/windows/" 2>/dev/null || true
    fi

    log "Desktop build complete"
}

get_device_type() {
    local device_id="$1"
    local features
    features=$("$ANDROID_SDK/platform-tools/adb" -s "$device_id" shell pm list features 2>/dev/null)
    if echo "$features" | grep -q "android.software.leanback"; then
        echo "tv"
    else
        echo "phone"
    fi
}

install_android() {
    local target_type="${1:-any}"
    local apk_path=""
    local package_name=""

    local devices
    devices=$("$ANDROID_SDK/platform-tools/adb" devices | grep -v "List" | grep "device$" | awk '{print $1}')

    if [ -z "$devices" ]; then
        error "No Android devices connected. Connect a device and enable USB debugging."
    fi

    for device in $devices; do
        local device_type
        device_type=$(get_device_type "$device")

        if [ "$target_type" = "any" ] || [ "$target_type" = "$device_type" ]; then
            if [ "$device_type" = "tv" ]; then
                apk_path=$(find "$DIST_DIR/android/tv" -name "*.apk" -type f 2>/dev/null | head -1)
                if [ -z "$apk_path" ]; then
                    apk_path=$(find "$PROJECT_ROOT/android/app/build/outputs/apk/tv" -name "*.apk" -type f 2>/dev/null | head -1)
                fi
                package_name="com.jellychub.app.tv"
            else
                apk_path=$(find "$DIST_DIR/android/mobile" -name "*.apk" -type f 2>/dev/null | head -1)
                if [ -z "$apk_path" ]; then
                    apk_path=$(find "$PROJECT_ROOT/android/app/build/outputs/apk/mobile" -name "*.apk" -type f 2>/dev/null | head -1)
                fi
                package_name="com.jellychub.app"
            fi

            activity_class="com.jellychub.app.MainActivity"

            if [ -z "$apk_path" ]; then
                error "No APK found for $device_type. Run 'build.sh $device_type' first."
            fi

            log "Found APK: $apk_path"
            log "Installing to $device ($device_type)..."
            "$ANDROID_SDK/platform-tools/adb" -s "$device" install -r "$apk_path"
            log "Installed successfully to $device"

            log "Launching app..."
            "$ANDROID_SDK/platform-tools/adb" -s "$device" shell am start -n "$package_name/$activity_class"
            return 0
        fi
    done

    if [ "$target_type" != "any" ]; then
        error "No $target_type device found. Connected devices:"
        for device in $devices; do
            local dtype
            dtype=$(get_device_type "$device")
            echo "  $device ($dtype)"
        done
    fi
}

list_outputs() {
    log "Build outputs in $DIST_DIR:"
    echo ""
    if [ -d "$DIST_DIR" ]; then
        echo "Mobile APKs:"
        find "$DIST_DIR/android/mobile" -name "*.apk" -exec ls -lh {} \; 2>/dev/null || echo "  (none)"
        echo ""
        echo "TV APKs:"
        find "$DIST_DIR/android/tv" -name "*.apk" -exec ls -lh {} \; 2>/dev/null || echo "  (none)"
        echo ""
        echo "Desktop:"
        find "$DIST_DIR/desktop" -type f \( -name "*.AppImage" -o -name "*.deb" -o -name "*.dmg" -o -name "*.exe" \) -exec ls -lh {} \; 2>/dev/null || echo "  (none)"
    else
        warn "No dist directory found. Run a build first."
    fi
}

BUILD_TYPE="release"
TARGET_TYPE="any"
COMMAND=""

while [[ $# -gt 0 ]]; do
    case $1 in
        all|android|mobile|tv|desktop|install|clean|help|list)
            COMMAND="$1"
            shift
            ;;
        --release)
            BUILD_TYPE="release"
            shift
            ;;
        --debug)
            BUILD_TYPE="debug"
            shift
            ;;
        --tv)
            TARGET_TYPE="tv"
            shift
            ;;
        --phone)
            TARGET_TYPE="phone"
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1. Use --help for usage."
            ;;
    esac
done

if [ -z "$COMMAND" ]; then
    show_help
    exit 0
fi

case $COMMAND in
    all)
        setup_dist
        build_android "$BUILD_TYPE"
        build_desktop
        list_outputs
        ;;
    android)
        setup_dist
        build_android "$BUILD_TYPE"
        list_outputs
        ;;
    mobile)
        setup_dist
        build_mobile "$BUILD_TYPE"
        list_outputs
        ;;
    tv)
        setup_dist
        build_tv "$BUILD_TYPE"
        list_outputs
        ;;
    desktop)
        setup_dist
        build_desktop
        list_outputs
        ;;
    install)
        install_android "$TARGET_TYPE"
        ;;
    clean)
        clean_builds
        ;;
    list)
        list_outputs
        ;;
    help)
        show_help
        ;;
    *)
        error "Unknown command: $COMMAND"
        ;;
esac
