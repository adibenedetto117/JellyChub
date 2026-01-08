import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores';

export function useDeepLinking() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    const handleUrl = (url: string) => {
      if (!isAuthenticated) return;

      const parsed = Linking.parse(url);
      const path = parsed.path;
      const params = parsed.queryParams;

      if (!path) return;

      if (path.startsWith('details/')) {
        const [, type, id] = path.split('/');
        if (type && id) {
          router.push(`/(tabs)/details/${type}/${id}`);
        }
      } else if (path.startsWith('player/video')) {
        const itemId = params?.itemId;
        if (typeof itemId === 'string') {
          router.push(`/player/video?itemId=${itemId}`);
        }
      } else if (path.startsWith('player/music')) {
        const itemId = params?.itemId;
        if (typeof itemId === 'string') {
          router.push(`/player/music?itemId=${itemId}`);
        }
      } else if (path.startsWith('player/audiobook')) {
        const itemId = params?.itemId;
        if (typeof itemId === 'string') {
          router.push(`/player/audiobook?itemId=${itemId}`);
        }
      } else if (path === 'search') {
        const q = params?.q;
        if (typeof q === 'string') {
          router.push(`/(tabs)/search?q=${encodeURIComponent(q)}`);
        } else {
          router.push('/(tabs)/search');
        }
      } else if (path === 'home') {
        router.push('/(tabs)/home');
      } else if (path === 'downloads') {
        router.push('/(tabs)/downloads');
      } else if (path === 'settings') {
        router.push('/(tabs)/settings');
      }
    };

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);
}
