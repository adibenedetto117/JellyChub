# Contributing to JellyChub

Thank you for your interest in contributing to JellyChub! This document provides guidelines and information to help you get started.

## Code Style

- **No unnecessary comments** - Code should be self-documenting. Only add comments for complex logic that isn't immediately obvious.
- **No emojis** - Keep code and UI text professional and clean.
- **Functional components only** - No class components.
- **TypeScript strict mode** - All code must pass strict type checking.
- **Keep components small** - Aim for under 200 lines per component.

## Project Structure

```
app/                 # Expo Router screens (file-based routing)
src/
  api/              # Jellyfin API client and endpoint functions
  components/       # Reusable UI components
  hooks/            # Custom React hooks
  services/         # Business logic (audio playback, downloads)
  stores/           # Zustand state management
  theme/            # Colors, typography, spacing constants
  types/            # TypeScript type definitions
  utils/            # Utility functions
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `MediaCard.tsx`, `PlayerControls.tsx` |
| Hooks | camelCase with `use` prefix | `usePlayer.ts`, `useLibrary.ts` |
| Stores | camelCase with `Store` suffix | `authStore.ts`, `playerStore.ts` |
| Utils | camelCase | `formatters.ts`, `mediaHelpers.ts` |
| Types | PascalCase for interfaces | `interface MediaItem {}` |
| Types | camelCase for type aliases | `type playerState = 'playing' | 'paused'` |

## State Management

- **Zustand** for app state (auth, player, settings, downloads)
- **React Query** for server data (caching, pagination, refetching)
- **MMKV** for persistent storage (faster than AsyncStorage)
- **Avoid prop drilling** - Use stores or context for deeply nested data (max 2 levels)

## Styling

- Use **NativeWind** (Tailwind CSS classes) for styling
- Dark theme by default (`#0a0a0a` background)
- Use the theme constants from `src/theme/` for consistency
- Prefer `react-native-reanimated` for animations

## API Guidelines

- All API calls go through `src/api/client.ts`
- Use React Query hooks for data fetching
- Handle errors at the query level
- Type all API responses

## Component Guidelines

```tsx
// Good component structure
interface Props {
  title: string;
  onPress: () => void;
}

export function MediaCard({ title, onPress }: Props) {
  // Hooks at the top
  const accentColor = useSettingsStore((s) => s.accentColor);

  // Event handlers
  const handlePress = () => {
    onPress();
  };

  // Render
  return (
    <Pressable onPress={handlePress}>
      <Text>{title}</Text>
    </Pressable>
  );
}
```

## Testing Your Changes

```bash
# Start development server
npm start

# Run on Android device/emulator
npm run android

# Type checking
npx tsc --noEmit

# Build debug APK
cd android && ./gradlew assembleDebug
```

## Pull Request Guidelines

1. **One feature per PR** - Keep changes focused and reviewable
2. **Test on a real device** - Emulators don't catch everything
3. **Update types** - Ensure TypeScript types are updated
4. **No breaking changes** - Unless discussed in an issue first
5. **Clean commits** - Squash WIP commits before submitting

## Commit Messages

Use clear, descriptive commit messages:

```
# Good
Add sleep timer to audiobook player
Fix subtitle positioning on notched devices
Update React Query to v5.x

# Bad
fix stuff
updates
wip
```

## Architecture Decisions

### Player Architecture
- Single `playerStore` manages all playback state
- `audioService` handles audio playback logic
- Progress is reported to the server every 10 seconds

### Downloads
- `downloadStore` tracks download state and storage
- `downloadManager` service handles the actual download process
- Files are stored in the app's document directory

### Navigation
- Expo Router with file-based routing
- Tab navigation for main screens
- Stack navigation for detail views

## Need Help?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
