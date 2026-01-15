import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface BackButtonProps {
  topInset: number;
  onPress: () => void;
}

export function BackButton({ topInset, onPress }: BackButtonProps) {
  return (
    <Pressable
      style={{
        position: 'absolute',
        top: topInset + 8,
        left: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={onPress}
    >
      <Ionicons name="chevron-back" size={24} color="#fff" />
    </Pressable>
  );
}

interface SearchButtonProps {
  topInset: number;
}

export function SearchButton({ topInset }: SearchButtonProps) {
  return (
    <Pressable
      style={{
        position: 'absolute',
        top: topInset + 8,
        right: 16,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onPress={() => router.push('/search')}
    >
      <Ionicons name="search" size={20} color="#fff" />
    </Pressable>
  );
}
