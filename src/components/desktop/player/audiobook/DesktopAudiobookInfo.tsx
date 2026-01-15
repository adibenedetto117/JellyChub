import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, SharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface DesktopAudiobookInfoProps {
  coverUrl: string | null;
  displayName: string;
  displayAuthor: string;
  coverScale: SharedValue<number>;
}

export function DesktopAudiobookInfo({
  coverUrl,
  displayName,
  displayAuthor,
  coverScale,
}: DesktopAudiobookInfoProps) {
  const coverAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coverScale.value }],
  }));

  return (
    <>
      <View style={styles.coverContainer}>
        <Animated.View style={coverAnimatedStyle}>
          <View style={styles.coverWrapper}>
            {coverUrl ? (
              <Image
                source={{ uri: coverUrl }}
                style={styles.cover}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="book" size={120} color="rgba(255,255,255,0.2)" />
              </View>
            )}
          </View>
        </Animated.View>
      </View>

      <View style={styles.metadataContainer}>
        <Text style={styles.title} numberOfLines={2}>{displayName}</Text>
        <Text style={styles.author} numberOfLines={1}>{displayAuthor}</Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: 400,
    marginVertical: 32,
  },
  coverWrapper: {
    width: 320,
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 25,
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
  metadataContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: 500,
  },
  author: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 18,
    marginTop: 8,
  },
});
