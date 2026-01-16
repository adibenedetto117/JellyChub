#!/bin/bash

# iOS Build Script for JellyChub
# Uses EAS to build iOS app in the cloud (no Mac needed)
# Free Apple ID = 7 day expiry, Paid ($99/yr) = 1 year

set -e

PROFILE="preview"
PLATFORM="ios"

show_help() {
    echo "Usage: ./scripts/ios-build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build       Build iOS app (default)"
    echo "  device      Register a new iOS device"
    echo "  login       Login to Expo account"
    echo "  status      Check build status"
    echo "  list        List recent builds"
    echo "  help        Show this help"
    echo ""
    echo "First time setup:"
    echo "  1. ./scripts/ios-build.sh login"
    echo "  2. ./scripts/ios-build.sh device"
    echo "  3. ./scripts/ios-build.sh build"
    echo ""
}

check_login() {
    if ! npx eas-cli whoami &>/dev/null; then
        echo "Not logged in to Expo. Run: ./scripts/ios-build.sh login"
        exit 1
    fi
}

case "${1:-build}" in
    login)
        echo "Logging in to Expo..."
        npx eas-cli login
        ;;
    device)
        echo "Registering iOS device..."
        echo "This will give you a URL to open on your iPhone."
        echo ""
        npx eas-cli device:create
        ;;
    build)
        check_login
        echo "Building iOS app with profile: $PROFILE"
        echo "This runs in Expo's cloud - no Mac needed!"
        echo ""
        npx eas-cli build --platform $PLATFORM --profile $PROFILE
        ;;
    status)
        check_login
        npx eas-cli build:list --platform $PLATFORM --limit 1
        ;;
    list)
        check_login
        npx eas-cli build:list --platform $PLATFORM --limit 5
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo "Unknown command: $1"
        show_help
        exit 1
        ;;
esac
