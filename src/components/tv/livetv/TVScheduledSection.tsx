import { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { tvConstants } from '@/utils/platform';
import type { TimerInfo } from '@/types/livetv';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface TVTimerCardProps {
  timer: TimerInfo;
  onDelete: () => void;
  accentColor: string;
  autoFocus?: boolean;
}

const TVTimerCard = memo(function TVTimerCard({
  timer,
  onDelete,
  accentColor,
  autoFocus = false,
}: TVTimerCardProps) {
  const [isFocused, setIsFocused] = useState(false);
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(0);

  const startTime = timer.StartDate
    ? new Date(timer.StartDate).toLocaleString()
    : '';
  const status = timer.Status || 'Scheduled';

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
      onPress={onDelete}
      onFocus={handleFocus}
      onBlur={handleBlur}
      hasTVPreferredFocus={autoFocus}
      style={[styles.cardContainer, animatedStyle]}
    >
      <View style={styles.cardInner}>
        <View style={[styles.cardIcon, { backgroundColor: accentColor + '30' }]}>
          <Ionicons name="timer-outline" size={36} color={accentColor} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.cardTitle, isFocused && { color: '#fff' }]} numberOfLines={2}>
            {timer.Name}
          </Text>
          {timer.ChannelName && (
            <Text style={styles.cardChannel}>{timer.ChannelName}</Text>
          )}
          <Text style={styles.cardTime}>{startTime}</Text>
          <Text style={styles.cardStatus}>{status}</Text>
        </View>
        <View style={styles.cancelHint}>
          <Ionicons name="close-circle-outline" size={24} color={colors.status.error} />
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

interface TVScheduledSectionProps {
  timers: TimerInfo[];
  isLoading: boolean;
  onDelete: (timer: TimerInfo) => void;
  accentColor: string;
  emptyTitle: string;
  emptySubtext: string;
  loadingText: string;
}

export const TVScheduledSection = memo(function TVScheduledSection({
  timers,
  isLoading,
  onDelete,
  accentColor,
  emptyTitle,
  emptySubtext,
  loadingText,
}: TVScheduledSectionProps) {
  const renderTimer = useCallback(
    ({ item, index }: { item: TimerInfo; index: number }) => (
      <TVTimerCard
        timer={item}
        onDelete={() => onDelete(item)}
        accentColor={accentColor}
        autoFocus={index === 0}
      />
    ),
    [onDelete, accentColor]
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
      data={timers}
      renderItem={renderTimer}
      keyExtractor={(item) => item.Id}
      contentContainerStyle={styles.listContent}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="timer-outline" size={64} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
        </View>
      }
    />
  );
});

const styles = StyleSheet.create({
  listContent: {
    paddingHorizontal: tvConstants.controlBarPadding,
    paddingBottom: 100,
  },
  cardContainer: {
    marginVertical: 8,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 16,
  },
  cardIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardInfo: {
    flex: 1,
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
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 4,
  },
  cancelHint: {
    padding: 12,
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
