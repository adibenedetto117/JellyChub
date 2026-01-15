#!/bin/bash
# Release script for Jellychub
#
# Usage:
#   ./scripts/release.sh [version-type] [options]
#
# Version types:
#   patch      Bump patch version (1.2.3 -> 1.2.4)
#   minor      Bump minor version (1.2.3 -> 1.3.0)
#   major      Bump major version (1.2.3 -> 2.0.0)
#
# Options:
#   --dry-run       Show what would be done without making changes
#   --no-build      Skip building release versions
#   --no-push       Create tag but don't push to remote
#   --notes "..."   Custom release notes
#   --help          Show this help message
#
# Examples:
#   ./scripts/release.sh patch
#   ./scripts/release.sh minor --dry-run
#   ./scripts/release.sh major --notes "Major redesign with new features"
#   ./scripts/release.sh patch --no-build --no-push

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

VERSION_TYPE=""
DRY_RUN=false
NO_BUILD=false
NO_PUSH=false
RELEASE_NOTES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        patch|minor|major)
            VERSION_TYPE="$1"
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-build)
            NO_BUILD=true
            shift
            ;;
        --no-push)
            NO_PUSH=true
            shift
            ;;
        --notes)
            RELEASE_NOTES="$2"
            shift 2
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

if [[ -z "$VERSION_TYPE" ]]; then
    echo "Error: Version type is required (patch, minor, or major)"
    exit 1
fi

CURRENT_VERSION=$(node -p "require('./package.json').version")

IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case $VERSION_TYPE in
    patch)
        NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
        ;;
    minor)
        NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
        ;;
    major)
        NEW_VERSION="$((MAJOR + 1)).0.0"
        ;;
esac

TAG_NAME="v$NEW_VERSION"

if [[ -z "$RELEASE_NOTES" ]]; then
    RELEASE_NOTES="Release $TAG_NAME"
fi

echo "Release Summary:"
echo "  Current version: $CURRENT_VERSION"
echo "  New version:     $NEW_VERSION"
echo "  Tag:             $TAG_NAME"
echo "  Notes:           $RELEASE_NOTES"
echo ""

if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY RUN] Would perform the following actions:"
    echo "  1. Update package.json version to $NEW_VERSION"
    echo "  2. Commit version bump"
    echo "  3. Create git tag $TAG_NAME"
    if [[ "$NO_BUILD" != true ]]; then
        echo "  4. Build Android release APK"
        if [[ "$(uname)" == "Darwin" ]]; then
            echo "  5. Build iOS release"
        fi
        echo "  6. Build web release"
    fi
    if [[ "$NO_PUSH" != true ]]; then
        echo "  7. Push to remote with tags"
        echo "  8. Create GitHub release"
    fi
    exit 0
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Error: Working directory is not clean. Commit or stash changes first."
    exit 1
fi

echo "Updating package.json version..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"

if [[ -f "app.json" ]]; then
    echo "Updating app.json version..."
    node -e "
    const fs = require('fs');
    const app = JSON.parse(fs.readFileSync('app.json', 'utf8'));
    if (app.expo) {
        app.expo.version = '$NEW_VERSION';
    }
    fs.writeFileSync('app.json', JSON.stringify(app, null, 2) + '\n');
    "
fi

echo "Committing version bump..."
git add package.json
if [[ -f "app.json" ]]; then
    git add app.json
fi
git commit -m "chore: bump version to $NEW_VERSION"

echo "Creating git tag $TAG_NAME..."
git tag -a "$TAG_NAME" -m "$RELEASE_NOTES"

if [[ "$NO_BUILD" != true ]]; then
    echo "Building release versions..."

    "$SCRIPT_DIR/build.sh" android --release

    if [[ "$(uname)" == "Darwin" ]]; then
        "$SCRIPT_DIR/build.sh" ios --release
    fi

    "$SCRIPT_DIR/build.sh" web --release
fi

if [[ "$NO_PUSH" != true ]]; then
    echo "Pushing to remote..."
    git push origin HEAD
    git push origin "$TAG_NAME"

    if command -v gh &> /dev/null; then
        echo "Creating GitHub release..."

        RELEASE_BODY="$RELEASE_NOTES"

        if [[ "$NO_BUILD" != true ]] && [[ -f "android/app/build/outputs/apk/release/app-release.apk" ]]; then
            gh release create "$TAG_NAME" \
                --title "$TAG_NAME" \
                --notes "$RELEASE_BODY" \
                android/app/build/outputs/apk/release/app-release.apk
        else
            gh release create "$TAG_NAME" \
                --title "$TAG_NAME" \
                --notes "$RELEASE_BODY"
        fi

        echo "GitHub release created: $TAG_NAME"
    else
        echo "GitHub CLI not found. Skipping GitHub release creation."
        echo "Install gh CLI to enable automatic release creation."
    fi
fi

echo ""
echo "Release $TAG_NAME completed successfully!"
