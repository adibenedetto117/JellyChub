import { memo } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { colors } from '@/theme';
import { getProgramImageUrl } from '@/api';
import type { LiveTvProgram } from '@/types/livetv';

interface ProgramModalProps {
  program: LiveTvProgram | null;
  visible: boolean;
  onClose: () => void;
  onWatchNow?: () => void;
  onRecord?: () => void;
  accentColor: string;
}

export const ProgramModal = memo(function ProgramModal({
  program,
  visible,
  onClose,
  onWatchNow,
  onRecord,
  accentColor,
}: ProgramModalProps) {
  if (!program) return null;

  const startDate = new Date(program.StartDate);
  const endDate = new Date(program.EndDate);
  const now = new Date();
  const isLive = startDate <= now && endDate > now;
  const hasEnded = endDate < now;

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (date: Date) =>
    date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));

  const imageUrl = program.ImageTags?.Primary
    ? getProgramImageUrl(program.Id, { maxWidth: 600, tag: program.ImageTags.Primary })
    : null;

  const genres = program.Genres ?? [];
  const tags: string[] = [];
  if (program.IsMovie) tags.push('Movie');
  if (program.IsSeries) tags.push('Series');
  if (program.IsNews) tags.push('News');
  if (program.IsSports) tags.push('Sports');
  if (program.IsKids) tags.push('Kids');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} tint="dark" style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />
      </BlurView>

      <View style={styles.container}>
        <View style={styles.handle} />

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {imageUrl && (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          )}

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{program.Name}</Text>
              {isLive && (
                <View style={[styles.liveBadge, { backgroundColor: accentColor }]}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              )}
            </View>

            {program.EpisodeTitle && (
              <Text style={styles.episodeTitle}>{program.EpisodeTitle}</Text>
            )}

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>
                {formatDate(startDate)} · {formatTime(startDate)} - {formatTime(endDate)}
              </Text>
              <Text style={styles.metaText}>{durationMinutes} min</Text>
            </View>

            {(program.ProductionYear || program.OfficialRating) && (
              <View style={styles.metaRow}>
                {program.ProductionYear && (
                  <Text style={styles.metaText}>{program.ProductionYear}</Text>
                )}
                {program.OfficialRating && (
                  <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{program.OfficialRating}</Text>
                  </View>
                )}
                {program.CommunityRating && (
                  <Text style={styles.metaText}>
                    ★ {program.CommunityRating.toFixed(1)}
                  </Text>
                )}
              </View>
            )}

            {tags.length > 0 && (
              <View style={styles.tagsRow}>
                {tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {genres.length > 0 && (
              <Text style={styles.genres}>{genres.join(' · ')}</Text>
            )}
          </View>

          {program.Overview && (
            <View style={styles.overviewSection}>
              <Text style={styles.overview}>{program.Overview}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {!hasEnded && onWatchNow && (
            <Pressable
              onPress={onWatchNow}
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
            >
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>
                {isLive ? 'Watch Now' : 'Watch Channel'}
              </Text>
            </Pressable>
          )}

          {onRecord && !hasEnded && (
            <Pressable onPress={onRecord} style={styles.secondaryButton}>
              <Ionicons name="radio-button-on" size={20} color={colors.text.primary} />
              <Text style={styles.secondaryButtonText}>Record</Text>
            </Pressable>
          )}

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropPressable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '85%',
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  content: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: 200,
    marginTop: 16,
  },
  header: {
    padding: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  title: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  liveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  episodeTitle: {
    color: colors.text.secondary,
    fontSize: 16,
    marginTop: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  metaText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  ratingBadge: {
    borderWidth: 1,
    borderColor: colors.text.tertiary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ratingText: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  genres: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 8,
  },
  overviewSection: {
    padding: 16,
    paddingTop: 0,
  },
  overview: {
    color: colors.text.secondary,
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface.elevated,
    gap: 8,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    color: colors.text.tertiary,
    fontSize: 16,
  },
});
