import { View, Text, ActivityIndicator } from 'react-native';
import { memo } from 'react';
import type { SubtitleSize, SubtitlePosition, SubtitleFontColor, SubtitleBackgroundColor, SubtitleOutlineStyle } from '@/types/player';

interface SubtitleDisplayProps {
  text: string;
  showControls: boolean;
  subtitleSize: SubtitleSize;
  subtitleTextColor: SubtitleFontColor;
  subtitleBackgroundColor: SubtitleBackgroundColor;
  subtitleBackgroundOpacity: number;
  subtitlePosition: SubtitlePosition;
  subtitleOutlineStyle: SubtitleOutlineStyle;
  isLoading?: boolean;
  error?: string | null;
}

const FONT_SIZES: Record<SubtitleSize, number> = {
  small: 14,
  medium: 18,
  large: 24,
  extraLarge: 32,
};

function getTextShadow(outlineStyle: SubtitleOutlineStyle) {
  switch (outlineStyle) {
    case 'outline':
      return {
        textShadowColor: '#000',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 3,
      };
    case 'shadow':
      return {
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 3,
      };
    case 'both':
      return {
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 4,
      };
    default:
      return {
        textShadowColor: 'transparent',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 0,
      };
  }
}

export const SubtitleDisplay = memo(function SubtitleDisplay({
  text,
  showControls,
  subtitleSize,
  subtitleTextColor,
  subtitleBackgroundColor,
  subtitleBackgroundOpacity,
  subtitlePosition,
  subtitleOutlineStyle,
  isLoading = false,
  error = null,
}: SubtitleDisplayProps) {
  const fontSize = FONT_SIZES[subtitleSize];
  const isTop = subtitlePosition === 'top';
  const positionValue = showControls ? (isTop ? 100 : 140) : (isTop ? 40 : 60);
  const textShadow = getTextShadow(subtitleOutlineStyle);

  const getBackgroundStyle = () => {
    if (subtitleBackgroundColor === 'none') {
      return { backgroundColor: 'transparent' };
    }
    const backgroundAlpha = Math.round(subtitleBackgroundOpacity * 255).toString(16).padStart(2, '0');
    return { backgroundColor: `${subtitleBackgroundColor}${backgroundAlpha}` };
  };

  const containerStyle = {
    position: 'absolute' as const,
    left: 20,
    right: 20,
    alignItems: 'center' as const,
    ...(isTop ? { top: positionValue } : { bottom: positionValue }),
  };

  if (isLoading) {
    return (
      <View style={containerStyle} pointerEvents="none">
        <View
          style={{
            ...getBackgroundStyle(),
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
              ...textShadow,
            }}
          >
            Loading subtitles...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={containerStyle} pointerEvents="none">
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

  if (!text) return null;

  return (
    <View style={containerStyle} pointerEvents="none">
      <View
        style={{
          ...getBackgroundStyle(),
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
            ...textShadow,
          }}
        >
          {text}
        </Text>
      </View>
    </View>
  );
});
