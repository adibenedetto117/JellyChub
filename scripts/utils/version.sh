#!/bin/bash
# Usage: ./scripts/utils/version.sh [patch|minor|major]
# Bumps version in package.json and app.json

set -e
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

TYPE="${1:-patch}"
CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case $TYPE in
    patch) NEW="$MAJOR.$MINOR.$((PATCH + 1))" ;;
    minor) NEW="$MAJOR.$((MINOR + 1)).0" ;;
    major) NEW="$((MAJOR + 1)).0.0" ;;
    *) echo "Usage: $0 [patch|minor|major]"; exit 1 ;;
esac

node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('package.json'));p.version='$NEW';fs.writeFileSync('package.json',JSON.stringify(p,null,2)+'\n')"
[[ -f app.json ]] && node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('app.json'));if(a.expo)a.expo.version='$NEW';fs.writeFileSync('app.json',JSON.stringify(a,null,2)+'\n')"

echo "$CURRENT -> $NEW"
