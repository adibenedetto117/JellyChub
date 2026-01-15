import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { AudiobookPlayerCore } from '@/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MobileAudiobookInfoProps {
  coverUrl: string | null;
  displayName: string;
  displayAuthor: string;
  coverScale: AudiobookPlayerCore['coverScale'];
}

export function MobileAudiobookInfo({
  coverUrl,
  displayName,
  displayAuthor,
  coverScale,
}: MobileAudiobookInfoProps) {
  const coverStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coverScale.value }],
  }));

  return (
    <View style={styles.coverContainer}>
      <Animated.View style={coverStyle}>
        <View style={styles.coverWrapper}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={80} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>
      </Animated.View>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {displayAuthor}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  coverWrapper: {
    width: SCREEN_WIDTH - 100,
    height: SCREEN_WIDTH - 100,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 32,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    width: '100%',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  author: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    marginTop: 4,
  },
});
