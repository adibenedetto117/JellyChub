import { View, Text, ActivityIndicator } from 'react-native';
import { memo } from 'react';

interface SubtitleDisplayProps {
  text: string;
  showControls: boolean;
  subtitleSize: 'small' | 'medium' | 'large';
  subtitleTextColor: string;
  subtitleBackgroundColor: string;
  subtitleBackgroundOpacity: number;
  isLoading?: boolean;
  error?: string | null;
}

export const SubtitleDisplay = memo(function SubtitleDisplay({
  text,
  showControls,
  subtitleSize,
  subtitleTextColor,
  subtitleBackgroundColor,
  subtitleBackgroundOpacity,
  isLoading = false,
  error = null,
}: SubtitleDisplayProps) {
  const fontSize = subtitleSize === 'small' ? 14 : subtitleSize === 'large' ? 24 : 18;
  const bottomPosition = showControls ? 140 : 60;
  const backgroundAlpha = Math.round(subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0');

  // Show loading indicator briefly when subtitles are being loaded
  if (isLoading) {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: bottomPosition,
          left: 20,
          right: 20,
          alignItems: 'center',
        }}
        pointerEvents="none"
      >
        <View
          style={{
            backgroundColor: `${subtitleBackgroundColor}${backgroundAlpha}`,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size="small" color={subtitleTextColor} style={{ marginRight: 8 }} />
          <Text
            style={{
              color: subtitleTextColor,
              fontSize: fontSize * 0.85,
              fontWeight: '500',
              textShadowColor: 'rgba(0,0,0,0.8)',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 2,
            }}
          >
            Loading subtitles...
          </Text>
        </View>
      </View>
    );
  }

  // Show error message briefly if subtitle loading failed
  if (error) {
    return (
      <View
        style={{
          position: 'absolute',
          bottom: bottomPosition,
          left: 20,
          right: 20,
          alignItems: 'center',
        }}
        pointerEvents="none"
      >
        <View
          style={{
            backgroundColor: 'rgba(200, 50, 50, 0.8)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
          }}
        >
          <Text
            style={{
              color: '#fff',
              fontSize: fontSize * 0.85,
              fontWeight: '500',
              textAlign: 'center',
            }}
          >
            {error}
          </Text>
        </View>
      </View>
    );
  }

  // Don't render anything if no text
  if (!text) return null;

  return (
    <View
      style={{
        position: 'absolute',
        bottom: bottomPosition,
        left: 20,
        right: 20,
        alignItems: 'center',
      }}
      pointerEvents="none"
    >
      <View
        style={{
          backgroundColor: `${subtitleBackgroundColor}${backgroundAlpha}`,
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 4,
          maxWidth: '90%',
        }}
      >
        <Text
          style={{
            color: subtitleTextColor,
            fontSize,
            fontWeight: '500',
            textAlign: 'center',
            textShadowColor: 'rgba(0,0,0,0.8)',
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 2,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
});
