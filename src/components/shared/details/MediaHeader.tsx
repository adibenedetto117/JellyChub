import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '@/components/shared/ui/CachedImage';

interface MediaHeaderProps {
  backdropUrl: string | null;
  itemId: string;
  topInset: number;
}

export function MediaHeader({ backdropUrl, itemId, topInset }: MediaHeaderProps) {
  if (!backdropUrl) {
    return <View style={{ height: topInset + 60 }} />;
  }

  return (
    <View className="relative" style={{ height: 320 }} key={`backdrop-${itemId}`}>
      <CachedImage
        uri={backdropUrl}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        showSkeleton={false}
        priority="high"
        cachePolicy="memory-disk"
      />
      <LinearGradient
        colors={['rgba(10,10,10,0.3)', 'transparent', 'rgba(10,10,10,0.7)', '#0a0a0a']}
        locations={[0, 0.3, 0.7, 1]}
        className="absolute inset-0"
      />
    </View>
  );
}
