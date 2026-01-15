import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { CachedImage } from '@/components/shared/ui/CachedImage';
import { getImageUrl } from '@/api';
import { getDisplayImageUrl } from '@/utils';

interface Person {
  Id: string;
  Name: string;
  Role?: string;
  PrimaryImageTag?: string;
}

interface CastSectionProps {
  people: Person[];
  hideMedia: boolean;
  onPersonPress: (person: { id: string; name: string; imageTag?: string }) => void;
  t: (key: string) => string;
}

export function CastSection({ people, hideMedia, onPersonPress, t }: CastSectionProps) {
  if (!people || people.length === 0) {
    return null;
  }

  const handlePersonPress = (person: Person) => {
    if (hideMedia) return;
    onPersonPress({
      id: person.Id,
      name: person.Name,
      imageTag: person.PrimaryImageTag,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('details.cast')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {people.slice(0, 15).map((person, index) => {
          const rawPersonImageUrl = person.PrimaryImageTag
            ? getImageUrl(person.Id, 'Primary', { maxWidth: 200, tag: person.PrimaryImageTag })
            : null;
          const personImageUrl = getDisplayImageUrl(person.Id, rawPersonImageUrl, hideMedia, 'Primary');
          const personName = hideMedia ? `Actor ${index + 1}` : person.Name;
          const personRole = hideMedia ? 'Character' : person.Role;

          return (
            <Pressable
              key={`${person.Id}-${index}`}
              style={styles.personCard}
              onPress={() => handlePersonPress(person)}
            >
              <View style={styles.imageContainer}>
                {personImageUrl ? (
                  <CachedImage
                    uri={personImageUrl}
                    style={styles.personImage}
                    borderRadius={32}
                  />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Text style={styles.placeholderText}>
                      {personName.charAt(0)}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.personName} numberOfLines={1}>
                {personName}
              </Text>
              {person.Role && (
                <Text style={styles.personRole} numberOfLines={1}>
                  {personRole}
                </Text>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  personCard: {
    marginRight: 12,
    alignItems: 'center',
    width: 80,
  },
  imageContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1c1c1c',
    overflow: 'hidden',
  },
  personImage: {
    width: 64,
    height: 64,
  },
  placeholderImage: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 18,
  },
  personName: {
    color: '#fff',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  personRole: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
  },
});
