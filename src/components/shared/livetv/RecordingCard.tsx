import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { colors } from '@/theme';
import type { RecordingInfo } from '@/types/livetv';

interface RecordingCardProps {
  recording: RecordingInfo;
  onPress: () => void;
  onDelete: () => void;
  accentColor: string;
}

export const RecordingCard = memo(function RecordingCard({
  recording,
  onPress,
  onDelete,
  accentColor,
}: RecordingCardProps) {
  const imageUrl = recording.ImageTags?.Primary
    ? getImageUrl(recording.Id, 'Primary', { maxWidth: 200 })
    : null;

  const startTime = recording.StartDate
    ? new Date(recording.StartDate).toLocaleString()
    : '';
  const status = recording.Status || 'Completed';
  const isInProgress = status === 'InProgress';

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="videocam" size={32} color={colors.text.tertiary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {recording.Name}
        </Text>
        {recording.ChannelName && (
          <Text style={styles.channel}>{recording.ChannelName}</Text>
        )}
        <Text style={styles.time}>{startTime}</Text>
        <View style={styles.status}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isInProgress ? accentColor : colors.text.tertiary },
            ]}
          />
          <Text style={styles.statusText}>
            {isInProgress ? 'Recording' : status}
          </Text>
        </View>
      </View>
      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color={colors.status.error} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.default,
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: 100,
    height: 75,
  },
  imagePlaceholder: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    padding: 12,
  },
  title: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  channel: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 2,
  },
  time: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    color: colors.text.tertiary,
    fontSize: 12,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
