import { Pressable, Text } from 'react-native';
import { router } from 'expo-router';
import { useSettingsStore, DEFAULT_BOTTOM_BAR_CONFIG } from '@/stores';

const LANDING_PAGE_ICONS: Record<string, string> = {
  home: '\u2302',
  library: '\u25A6',
  movies: '\u25B6',
  shows: '\u25A3',
  music: '\u266B',
  books: '\u25AF',
  downloads: '\u2193',
  requests: '\u2606',
  admin: '\u2318',
  settings: '\u2699',
};

interface HomeButtonProps {
  currentScreen?: string;
}

export function HomeButton({ currentScreen }: HomeButtonProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);
  const bottomBarConfig = useSettingsStore((s) => s.bottomBarConfig);
  const landingPage = bottomBarConfig?.landingPage ?? DEFAULT_BOTTOM_BAR_CONFIG.landingPage;

  const isOnLandingPage = currentScreen === landingPage;

  const handlePress = () => {
    router.push(`/(tabs)/${landingPage}` as any);
  };

  const icon = LANDING_PAGE_ICONS[landingPage] ?? '\u2302';

  return (
    <Pressable
      onPress={isOnLandingPage ? undefined : handlePress}
      disabled={isOnLandingPage}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isOnLandingPage ? 'transparent' : 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {!isOnLandingPage && (
        <Text style={{ fontSize: 16, color: accentColor }}>{icon}</Text>
      )}
    </Pressable>
  );
}
