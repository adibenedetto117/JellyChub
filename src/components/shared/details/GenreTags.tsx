import { View, Text } from 'react-native';

interface GenreTagsProps {
  genres: string[];
}

export function GenreTags({ genres }: GenreTagsProps) {
  if (!genres || genres.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap mt-4">
      {genres.map((genre) => (
        <View
          key={genre}
          className="bg-surface px-3 py-1 rounded-full mr-2 mb-2"
        >
          <Text className="text-text-secondary text-xs">{genre}</Text>
        </View>
      ))}
    </View>
  );
}
