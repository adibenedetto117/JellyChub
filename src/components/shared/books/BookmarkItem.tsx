import { View, Text, Pressable, StyleSheet } from 'react-native';
import { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

interface BookmarkItemProps {
  bookTitle: string;
  name: string;
  timeOrProgress: string;
  isAudiobook: boolean;
  accentColor: string;
  onPress: () => void;
  onDelete: () => void;
}

export const BookmarkItem = memo(function BookmarkItem({
  bookTitle,
  name,
  timeOrProgress,
  isAudiobook,
  accentColor,
  onPress,
  onDelete,
}: BookmarkItemProps) {
  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.icon, { backgroundColor: accentColor + '20' }]}>
        <Ionicons name={isAudiobook ? 'headset' : 'book'} size={16} color={accentColor} />
      </View>
      <View style={styles.info}>
        <Text style={styles.bookTitle} numberOfLines={1}>{bookTitle || 'Unknown Book'}</Text>
        <Text style={styles.name} numberOfLines={1}>{name || 'Bookmark'}</Text>
        <Text style={styles.time}>{timeOrProgress}</Text>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginBottom: 8,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  bookTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  name: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  time: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
