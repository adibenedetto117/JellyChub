import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TVMusicPlayerInfoProps {
  albumArtUrl: string | null;
  displayName: string | undefined;
  albumArtist: string | undefined;
  isFavorite: boolean;
  accentColor: string;
}

export function TVMusicPlayerInfo({
  albumArtUrl,
  displayName,
  albumArtist,
  isFavorite,
  accentColor,
}: TVMusicPlayerInfoProps) {
  return (
    <View style={styles.container}>
      <View style={styles.coverSection}>
        <View style={styles.coverWrapper}>
          {albumArtUrl ? (
            <Image
              source={{ uri: albumArtUrl }}
              style={styles.cover}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="musical-note" size={100} color="rgba(255,255,255,0.3)" />
            </View>
          )}
        </View>
      </View>

      <View style={styles.titleSection}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {displayName}
          </Text>
          {isFavorite && (
            <Ionicons name="heart" size={28} color={accentColor} style={styles.heartIcon} />
          )}
        </View>
        <Text style={styles.artist} numberOfLines={1}>
          {albumArtist}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  coverSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverWrapper: {
    width: '80%',
    aspectRatio: 1,
    maxWidth: 400,
    maxHeight: 400,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.6,
    shadowRadius: 40,
    elevation: 30,
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
  titleSection: {
    marginBottom: 40,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    flex: 1,
  },
  heartIcon: {
    marginLeft: 12,
  },
  artist: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    marginTop: 8,
  },
});
