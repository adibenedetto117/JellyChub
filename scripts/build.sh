#!/bin/bash
# Build script for Jellychub Expo/React Native project
#
# Usage:
#   ./scripts/build.sh [platform] [options]
#
# Platforms:
#   android    Build Android APK
#   ios        Build iOS app (macOS only)
#   web        Build web version
#   all        Build all available platforms
#
# Options:
#   --release  Build release version (default is development)
#   --clean    Clean build cache before building
#   --help     Show this help message
#
# Examples:
#   ./scripts/build.sh android
#   ./scripts/build.sh android --release
#   ./scripts/build.sh ios --release --clean
#   ./scripts/build.sh all --release

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

PLATFORM=""
RELEASE_MODE=false
CLEAN_BUILD=false

while [[ $# -gt 0 ]]; do
    case $1 in
        android|ios|web|all)
            PLATFORM="$1"
            shift
            ;;
        --release)
            RELEASE_MODE=true
            shift
            ;;
        --clean)
            CLEAN_BUILD=true
            shift
            ;;
        --help|-h)
            head -25 "$0" | tail -24
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

if [[ -z "$PLATFORM" ]]; then
    echo "Error: Platform is required"
    echo "Usage: ./scripts/build.sh [android|ios|web|all] [--release] [--clean]"
    exit 1
fi

clean_cache() {
    echo "Cleaning build cache..."
    rm -rf node_modules/.cache
    rm -rf .expo
    rm -rf android/app/build 2>/dev/null || true
    rm -rf ios/build 2>/dev/null || true
    rm -rf dist 2>/dev/null || true
    echo "Cache cleaned"
}

build_android() {
    echo "Building Android APK..."

    if [[ ! -d "android" ]]; then
        echo "Running expo prebuild for Android..."
        npx expo prebuild --platform android
    fi

    if [[ "$RELEASE_MODE" == true ]]; then
        echo "Building release APK..."
        cd android
        ./gradlew assembleRelease
        cd ..
        echo "Release APK built at: android/app/build/outputs/apk/release/"
    else
        echo "Building debug APK..."
        cd android
        ./gradlew assembleDebug
        cd ..
        echo "Debug APK built at: android/app/build/outputs/apk/debug/"
    fi
}

build_ios() {
    if [[ "$(uname)" != "Darwin" ]]; then
        echo "iOS builds are only available on macOS"
        return 1
    fi

    echo "Building iOS app..."

    if [[ ! -d "ios" ]]; then
        echo "Running expo prebuild for iOS..."
        npx expo prebuild --platform ios
    fi

    if [[ "$RELEASE_MODE" == true ]]; then
        echo "Building release iOS app..."
        cd ios
        xcodebuild -workspace *.xcworkspace -scheme jellychub -configuration Release -sdk iphoneos -archivePath build/jellychub.xcarchive archive
        cd ..
        echo "iOS archive built at: ios/build/jellychub.xcarchive"
    else
        echo "Building debug iOS app..."
        cd ios
        xcodebuild -workspace *.xcworkspace -scheme jellychub -configuration Debug -sdk iphonesimulator build
        cd ..
        echo "iOS debug build completed"
    fi
}

build_web() {
    echo "Building web version..."

    if [[ "$RELEASE_MODE" == true ]]; then
        echo "Building production web bundle..."
        npx expo export --platform web
        echo "Web build completed at: dist/"
    else
        echo "Building development web bundle..."
        npx expo export --platform web --dev
        echo "Web build completed at: dist/"
    fi
}

if [[ "$CLEAN_BUILD" == true ]]; then
    clean_cache
fi

case $PLATFORM in
    android)
        build_android
        ;;
    ios)
        build_ios
        ;;
    web)
        build_web
        ;;
    all)
        build_android
        if [[ "$(uname)" == "Darwin" ]]; then
            build_ios
        fi
        build_web
        ;;
esac

echo "Build completed successfully!"
