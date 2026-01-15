import { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '@/api';
import { colors } from '@/theme';
import { tvConstants } from '@/utils/platform';
import type { RecordingInfo } from '@/types/livetv';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TVRecordingCardProps {
  recording: RecordingInfo;
  onPress: () => void;
  onDelete: () => void;
  accentColor: string;
  autoFocus?: boolean;
}

const TVRecordingCard = memo(function TVRecordingCard({
  recording,
  onPress,
  onDelete,
  accentColor,
  autoFocus = false,
}: TVRecordingCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const imageUrl = recording.ImageTags?.Primary
    ? getImageUrl(recording.Id, 'Primary', { maxWidth: 300 })
    : null;

  const startTime = recording.StartDate
    ? new Date(recording.StartDate).toLocaleString()
    : '';
  const status = recording.Status || 'Completed';
  const isInProgress = status === 'InProgress';

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    scale.value = withTiming(tvConstants.focusScale, { duration: tvConstants.focusDuration });
    borderOpacity.value = withTiming(1, { duration: tvConstants.focusDuration });
  }, [scale, borderOpacity]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    scale.value = withTiming(1, { duration: tvConstants.focusDuration });
    borderOpacity.value = withTiming(0, { duration: tvConstants.focusDuration });
  }, [scale, borderOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedBorderStyle = useAnimatedStyle(() => ({
    opacity: borderOpacity.value,
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={autoFocus}
      style={[styles.cardContainer, animatedStyle]}
    >
      <View style={styles.cardInner}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.cardImage}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Ionicons name="videocam" size={40} color={colors.text.tertiary} />
          </View>
        )}
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isFocused && { color: '#fff' }]} numberOfLines={2}>
            {recording.Name}
          </Text>
          {recording.ChannelName && (
            <Text style={styles.cardChannel}>{recording.ChannelName}</Text>
          )}
          <Text style={styles.cardTime}>{startTime}</Text>
          <View style={styles.cardStatus}>
            <View
              style={[
                styles.cardStatusDot,
                { backgroundColor: isInProgress ? accentColor : colors.text.tertiary },
              ]}
            />
            <Text style={styles.cardStatusText}>
              {isInProgress ? 'Recording' : status}
            </Text>
          </View>
        </View>
        <Animated.View
          style={[
            styles.cardFocusBorder,
            animatedBorderStyle,
            { borderColor: accentColor },
          ]}
        />
      </View>
    </AnimatedPressable>
  );
});

interface TVRecordingsSectionProps {
  recordings: RecordingInfo[];
  isLoading: boolean;
  onPlay: (recording: RecordingInfo) => void;
  onDelete: (recording: RecordingInfo) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const TVRecordingsSection = memo(function TVRecordingsSection({
  recordings,
  isLoading,
  onPlay,
  onDelete,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: TVRecordingsSectionProps) {
  const renderRecording = useCallback(
    ({ item, index }: { item: RecordingInfo; index: number }) => (
      <TVRecordingCard
        recording={item}
        onPress={() => onPlay(item)}
        onDelete={() => onDelete(item)}
        accentColor={accentColor}
        autoFocus={index === 0}
      />
    ),
    [onPlay, onDelete, accentColor]
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={accentColor} size="large" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={recordings}
      renderItem={renderRecording}
      keyExtractor={(item) => item.Id}
      numColumns={3}
      contentContainerStyle={styles.listContent}
      columnWrapperStyle={styles.columnWrapper}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="videocam-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: tvConstants.controlBarPadding - 8,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'flex-start',
  },
  cardContainer: {
    flex: 1,
    maxWidth: '33.33%',
    margin: 8,
  },
  cardInner: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  cardImagePlaceholder: {
    backgroundColor: colors.surface.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    padding: 16,
  },
  cardTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  cardChannel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginTop: 4,
  },
  cardTime: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 6,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  cardStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardStatusText: {
    color: colors.text.tertiary,
    fontSize: 13,
  },
  cardFocusBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: tvConstants.focusRingWidth,
    borderRadius: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.text.tertiary,
    marginTop: 16,
    fontSize: 18,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    marginTop: 24,
  },
  emptySubtext: {
    color: colors.text.tertiary,
    fontSize: 18,
    textAlign: 'center',
    marginTop: 12,
  },
});
