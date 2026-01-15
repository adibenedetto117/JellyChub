import { StyleSheet } from 'react-native';
import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  intensity?: 'subtle' | 'medium' | 'vibrant';
}

const gradientConfigs = {
  subtle: ['#0a0a0a', '#0d1218', '#0a0a0a'] as const,
  medium: ['#0a0a0a', '#0f1a28', '#0a0a0a'] as const,
  vibrant: ['#050810', '#0d2540', '#050810'] as const,
};

export const AnimatedGradient = memo(function AnimatedGradient({ intensity = 'subtle' }: Props) {
  const colors = gradientConfigs[intensity];

  return (
    <LinearGradient
      colors={[...colors] as [string, string, string]}
      locations={[0, 0.5, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
});
