import { memo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { colors } from '@/theme';

interface CastMemberProps {
  name: string;
  character?: string;
  image?: string;
}

const CastMember = memo(function CastMember({ name, character, image }: CastMemberProps) {
  return (
    <View style={styles.member}>
      <View style={styles.imageContainer}>
        {image ? (
          <CachedImage uri={image} style={styles.image} borderRadius={24} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="person" size={20} color={colors.text.tertiary} />
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {character && <Text style={styles.character} numberOfLines={1}>{character}</Text>}
    </View>
  );
});

type ImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

interface CastSectionProps {
  cast: Array<{
    creditId: string;
    name: string;
    character?: string;
    profilePath?: string | null;
  }>;
  getImageUrl: (path: string | null | undefined, size: ImageSize) => string | null;
  maxItems?: number;
  delay?: number;
}

export const CastSection = memo(function CastSection({
  cast,
  getImageUrl,
  maxItems = 15,
  delay = 300,
}: CastSectionProps) {
  if (!cast || cast.length === 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>Cast</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {cast.slice(0, maxItems).map((member) => (
          <CastMember
            key={member.creditId}
            name={member.name}
            character={member.character}
            image={member.profilePath ? getImageUrl(member.profilePath, 'w185') || undefined : undefined}
          />
        ))}
      </ScrollView>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  scroll: {
    marginTop: 12,
  },
  member: {
    width: 80,
    marginRight: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 8,
  },
  image: {
    width: 64,
    height: 64,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  character: {
    color: colors.text.tertiary,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
  },
});
