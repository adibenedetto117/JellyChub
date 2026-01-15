import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '@/theme';

interface Genre {
  id: number;
  name: string;
}

interface Props {
  genres: Genre[];
  maxDisplay?: number;
  delay?: number;
}

export function GenreChips({ genres, maxDisplay = 4, delay = 150 }: Props) {
  if (!genres || genres.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.container}>
      {genres.slice(0, maxDisplay).map((genre) => (
        <View key={genre.id} style={styles.chip}>
          <Text style={styles.text}>{genre.name}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 20,
  },
  chip: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  text: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
  },
});
