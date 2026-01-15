import { memo, useState } from 'react';
import { View, Text, StyleSheet, ViewStyle, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type AvatarSize = 'tiny' | 'small' | 'medium' | 'large' | 'xlarge';
type AvatarShape = 'circle' | 'rounded' | 'square';

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  shape?: AvatarShape;
  onPress?: () => void;
  showOnlineIndicator?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
}

const sizeConfig: Record<AvatarSize, { size: number; fontSize: number; iconSize: number; indicatorSize: number }> = {
  tiny: { size: 24, fontSize: 10, iconSize: 14, indicatorSize: 8 },
  small: { size: 32, fontSize: 12, iconSize: 18, indicatorSize: 10 },
  medium: { size: 48, fontSize: 16, iconSize: 24, indicatorSize: 12 },
  large: { size: 64, fontSize: 22, iconSize: 32, indicatorSize: 14 },
  xlarge: { size: 96, fontSize: 32, iconSize: 48, indicatorSize: 18 },
};

const shapeConfig: Record<AvatarShape, (size: number) => number> = {
  circle: () => 999,
  rounded: (size) => size * 0.2,
  square: () => 0,
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const avatarColors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
    '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1',
    '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export const Avatar = memo(function Avatar({
  uri,
  name,
  size = 'medium',
  shape = 'circle',
  onPress,
  showOnlineIndicator = false,
  isOnline = false,
  style,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const config = sizeConfig[size];
  const borderRadius = shapeConfig[shape](config.size);

  const showImage = uri && !imageError;
  const showInitials = !showImage && name;
  const showIcon = !showImage && !showInitials;
  const bgColor = name ? getColorFromName(name) : colors.surface.elevated;

  const containerStyle: ViewStyle = {
    width: config.size,
    height: config.size,
    borderRadius,
    backgroundColor: showImage ? colors.surface.default : bgColor,
  };

  const content = (
    <View style={[styles.container, containerStyle, style]}>
      {showImage && (
        <Image
          source={{ uri }}
          style={[styles.image, { borderRadius }]}
          contentFit="cover"
          onError={() => setImageError(true)}
        />
      )}
      {showInitials && (
        <Text style={[styles.initials, { fontSize: config.fontSize }]}>
          {getInitials(name)}
        </Text>
      )}
      {showIcon && (
        <Ionicons name="person" size={config.iconSize} color={colors.text.secondary} />
      )}
      {showOnlineIndicator && (
        <View
          style={[
            styles.indicator,
            {
              width: config.indicatorSize,
              height: config.indicatorSize,
              borderRadius: config.indicatorSize / 2,
              borderWidth: config.indicatorSize > 10 ? 2 : 1.5,
              backgroundColor: isOnline ? colors.status.success : colors.text.tertiary,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
        {content}
      </Pressable>
    );
  }

  return content;
});

interface AvatarGroupProps {
  avatars: Array<{ uri?: string | null; name?: string }>;
  max?: number;
  size?: AvatarSize;
  style?: ViewStyle;
}

export const AvatarGroup = memo(function AvatarGroup({
  avatars,
  max = 4,
  size = 'small',
  style,
}: AvatarGroupProps) {
  const config = sizeConfig[size];
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;
  const overlap = config.size * 0.3;

  return (
    <View style={[styles.group, style]}>
      {visibleAvatars.map((avatar, index) => (
        <View
          key={index}
          style={[
            styles.groupItem,
            { marginLeft: index === 0 ? 0 : -overlap, zIndex: visibleAvatars.length - index },
          ]}
        >
          <Avatar
            uri={avatar.uri}
            name={avatar.name}
            size={size}
            style={styles.groupAvatar}
          />
        </View>
      ))}
      {remainingCount > 0 && (
        <View
          style={[
            styles.groupItem,
            styles.remainingBadge,
            {
              marginLeft: -overlap,
              width: config.size,
              height: config.size,
              borderRadius: config.size / 2,
            },
          ]}
        >
          <Text style={[styles.remainingText, { fontSize: config.fontSize * 0.8 }]}>
            +{remainingCount}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: colors.background.primary,
  },
  pressed: {
    opacity: 0.7,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupItem: {},
  groupAvatar: {
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  remainingBadge: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  remainingText: {
    color: colors.text.secondary,
    fontWeight: '600',
  },
});
