#!/bin/bash
# Usage: ./scripts/install.sh [--release] [--device ID]
# Build and install APK on connected Android device

set -e
cd "$(dirname "${BASH_SOURCE[0]}")/.."

export ANDROID_HOME="${ANDROID_HOME:-$HOME/Android/Sdk}"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

RELEASE=false DEVICE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --release) RELEASE=true; shift ;;
        --device) DEVICE="-s $2"; shift 2 ;;
        --help|-h) head -3 "$0" | tail -2; exit 0 ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

DEVICES=$(adb devices | grep -c "device$" || true)
[[ $DEVICES -eq 0 ]] && echo "No device connected" && exit 1

[[ ! -d android ]] && npx expo prebuild --platform android

if [[ "$RELEASE" == true ]]; then
    cd android && ./gradlew installRelease
else
    cd android && ./gradlew installDebug
fi

PACKAGE=$(grep -o 'applicationId "[^"]*"' app/build.gradle | head -1 | cut -d'"' -f2)
adb $DEVICE shell am start -n "${PACKAGE:-com.jellychub}/.MainActivity"
echo "Installed and launched"
