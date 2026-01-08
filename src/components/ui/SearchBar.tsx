import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettingsStore } from '@/stores';
import { colors } from '@/theme';

interface SearchBarProps {
  placeholder?: string;
  compact?: boolean;
}

export function SearchBar({ placeholder = 'Search movies, shows, music...', compact = false }: SearchBarProps) {
  const accentColor = useSettingsStore((s) => s.accentColor);

  const handlePress = () => {
    router.push('/search');
  };

  if (compact) {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.compactContainer,
          { opacity: pressed ? 0.7 : 1 },
        ]}
        onPress={handlePress}
      >
        <Ionicons name="search" size={18} color={accentColor} />
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { opacity: pressed ? 0.8 : 1 },
      ]}
      onPress={handlePress}
    >
      <Ionicons name="search" size={18} color="rgba(255,255,255,0.5)" />
      <Text style={styles.placeholder}>{placeholder}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  compactContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.default,
  },
  placeholder: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
    flex: 1,
  },
});
