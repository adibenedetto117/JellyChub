import { memo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { colors } from '@/theme';

interface Studio {
  id: number;
  name: string;
  logoPath?: string | null;
}

type ImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'original';

interface StudiosSectionProps {
  title: string;
  networks?: Studio[];
  productionCompanies?: Studio[];
  getImageUrl: (path: string | null | undefined, size: ImageSize) => string | null;
  delay?: number;
}

export const StudiosSection = memo(function StudiosSection({
  title,
  networks,
  productionCompanies,
  getImageUrl,
  delay = 275,
}: StudiosSectionProps) {
  const hasContent = (networks && networks.length > 0) || (productionCompanies && productionCompanies.length > 0);

  if (!hasContent) {
    return null;
  }

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {networks?.map((network) => (
          <View key={network.id} style={styles.card}>
            {network.logoPath ? (
              <CachedImage
                uri={getImageUrl(network.logoPath, 'w185') || ''}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business" size={24} color={colors.text.tertiary} />
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>{network.name}</Text>
          </View>
        ))}
        {productionCompanies?.map((company) => (
          <View key={company.id} style={styles.card}>
            {company.logoPath ? (
              <CachedImage
                uri={getImageUrl(company.logoPath, 'w185') || ''}
                style={styles.logo}
                contentFit="contain"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="business" size={24} color={colors.text.tertiary} />
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>{company.name}</Text>
          </View>
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
  card: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 40,
    marginBottom: 8,
  },
  logoPlaceholder: {
    width: 80,
    height: 40,
    backgroundColor: colors.surface.elevated,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  name: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
});
