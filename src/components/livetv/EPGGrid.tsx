import { memo, useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { colors } from '@/theme';
import { getChannelImageUrl } from '@/api';
import type { LiveTvChannel, LiveTvProgram, EPGRow } from '@/types/livetv';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHANNEL_COLUMN_WIDTH = 80;
const TIME_HEADER_HEIGHT = 40;
const CHANNEL_ROW_HEIGHT = 60;
const HOUR_WIDTH = 200;
const TIME_SLOT_MINUTES = 30;

interface EPGGridProps {
  channels: LiveTvChannel[];
  programs: LiveTvProgram[];
  startTime: Date;
  endTime: Date;
  onChannelPress: (channel: LiveTvChannel) => void;
  onProgramPress: (program: LiveTvProgram) => void;
  accentColor: string;
  favoriteChannelIds?: string[];
}

interface TimeSlot {
  time: Date;
  label: string;
}

function generateTimeSlots(start: Date, end: Date): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const current = new Date(start);
  current.setMinutes(Math.floor(current.getMinutes() / TIME_SLOT_MINUTES) * TIME_SLOT_MINUTES, 0, 0);

  while (current <= end) {
    slots.push({
      time: new Date(current),
      label: current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    current.setMinutes(current.getMinutes() + TIME_SLOT_MINUTES);
  }

  return slots;
}

function getProgramWidth(program: LiveTvProgram, startTime: Date, endTime: Date): number {
  const progStart = new Date(program.StartDate);
  const progEnd = new Date(program.EndDate);

  const visibleStart = Math.max(progStart.getTime(), startTime.getTime());
  const visibleEnd = Math.min(progEnd.getTime(), endTime.getTime());

  const durationMinutes = (visibleEnd - visibleStart) / (1000 * 60);
  return (durationMinutes / 60) * HOUR_WIDTH;
}

function getProgramOffset(program: LiveTvProgram, startTime: Date): number {
  const progStart = new Date(program.StartDate);
  const visibleStart = Math.max(progStart.getTime(), startTime.getTime());
  const offsetMinutes = (visibleStart - startTime.getTime()) / (1000 * 60);
  return (offsetMinutes / 60) * HOUR_WIDTH;
}

const TimeHeader = memo(function TimeHeader({ timeSlots }: { timeSlots: TimeSlot[] }) {
  return (
    <View style={styles.header}>
      <View style={styles.channelColumnHeader} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} scrollEnabled={false}>
        <View style={styles.timeSlotContainer}>
          {timeSlots.map((slot, index) => (
            <View key={index} style={styles.timeSlot}>
              <Text style={styles.timeSlotText}>{slot.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

interface ChannelRowProps {
  channel: LiveTvChannel;
  programs: LiveTvProgram[];
  startTime: Date;
  endTime: Date;
  onChannelPress: () => void;
  onProgramPress: (program: LiveTvProgram) => void;
  accentColor: string;
  isFavorite?: boolean;
  scrollX: number;
}

const ChannelRow = memo(function ChannelRow({
  channel,
  programs,
  startTime,
  endTime,
  onChannelPress,
  onProgramPress,
  accentColor,
  isFavorite,
}: ChannelRowProps) {
  const imageUrl = channel.ImageTags?.Primary
    ? getChannelImageUrl(channel.Id, { maxWidth: 80, tag: channel.ImageTags.Primary })
    : null;

  const now = new Date();

  return (
    <View style={styles.channelRow}>
      <Pressable onPress={onChannelPress} style={styles.channelColumn}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.channelLogo}
            contentFit="contain"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={styles.channelLogoPlaceholder}>
            <Text style={styles.channelLogoText}>
              {channel.Number ?? channel.Name.charAt(0)}
            </Text>
          </View>
        )}
        {isFavorite && (
          <View style={styles.favoriteIndicator}>
            <Text style={styles.favoriteIcon}>★</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.programsContainer}>
        {programs.map((program) => {
          const width = getProgramWidth(program, startTime, endTime);
          const offset = getProgramOffset(program, startTime);
          const isLive =
            new Date(program.StartDate) <= now && new Date(program.EndDate) > now;

          if (width <= 0) return null;

          return (
            <Pressable
              key={program.Id}
              onPress={() => onProgramPress(program)}
              style={[
                styles.programBlock,
                {
                  width,
                  left: offset,
                  backgroundColor: isLive ? accentColor + '30' : colors.surface.elevated,
                  borderLeftColor: isLive ? accentColor : 'transparent',
                },
              ]}
            >
              <Text style={styles.programTitle} numberOfLines={1}>
                {program.Name}
              </Text>
              <Text style={styles.programTime} numberOfLines={1}>
                {new Date(program.StartDate).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

export const EPGGrid = memo(function EPGGrid({
  channels,
  programs,
  startTime,
  endTime,
  onChannelPress,
  onProgramPress,
  accentColor,
  favoriteChannelIds = [],
}: EPGGridProps) {
  const horizontalScrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);

  const timeSlots = useMemo(() => generateTimeSlots(startTime, endTime), [startTime, endTime]);

  const programsByChannel = useMemo(() => {
    const map = new Map<string, LiveTvProgram[]>();
    channels.forEach((channel) => map.set(channel.Id, []));

    programs.forEach((program) => {
      const channelPrograms = map.get(program.ChannelId);
      if (channelPrograms) {
        channelPrograms.push(program);
      }
    });

    map.forEach((progs) => {
      progs.sort(
        (a, b) => new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
      );
    });

    return map;
  }, [channels, programs]);

  const scrollToNow = useCallback(() => {
    const now = new Date();
    const offsetMinutes = (now.getTime() - startTime.getTime()) / (1000 * 60);
    const offset = Math.max(0, (offsetMinutes / 60) * HOUR_WIDTH - SCREEN_WIDTH / 3);
    horizontalScrollRef.current?.scrollTo({ x: offset, animated: true });
  }, [startTime]);

  useEffect(() => {
    const timer = setTimeout(scrollToNow, 500);
    return () => clearTimeout(timer);
  }, [scrollToNow]);

  const totalWidth = ((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)) * HOUR_WIDTH;

  const handleScroll = useCallback((event: any) => {
    setScrollX(event.nativeEvent.contentOffset.x);
  }, []);

  const renderChannel = useCallback(
    ({ item: channel }: { item: LiveTvChannel }) => (
      <ChannelRow
        channel={channel}
        programs={programsByChannel.get(channel.Id) ?? []}
        startTime={startTime}
        endTime={endTime}
        onChannelPress={() => onChannelPress(channel)}
        onProgramPress={onProgramPress}
        accentColor={accentColor}
        isFavorite={favoriteChannelIds.includes(channel.Id)}
        scrollX={scrollX}
      />
    ),
    [programsByChannel, startTime, endTime, onChannelPress, onProgramPress, accentColor, favoriteChannelIds, scrollX]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.channelColumnHeader} />
        <View style={styles.timeHeaderRow}>
          {timeSlots.map((slot, index) => (
            <View key={index} style={styles.timeSlot}>
              <Text style={styles.timeSlotText}>{slot.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        ref={horizontalScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ width: totalWidth + CHANNEL_COLUMN_WIDTH }}
      >
        <View style={{ flexDirection: 'row' }}>
          <FlatList
            data={channels}
            renderItem={renderChannel}
            keyExtractor={(item) => item.Id}
            showsVerticalScrollIndicator={false}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            getItemLayout={(_, index) => ({
              length: CHANNEL_ROW_HEIGHT,
              offset: CHANNEL_ROW_HEIGHT * index,
              index,
            })}
          />
        </View>
      </ScrollView>

      <Pressable onPress={scrollToNow} style={[styles.nowButton, { backgroundColor: accentColor }]}>
        <Text style={styles.nowButtonText}>Now</Text>
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    height: TIME_HEADER_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  channelColumnHeader: {
    width: CHANNEL_COLUMN_WIDTH,
    backgroundColor: colors.background.secondary,
  },
  timeHeaderRow: {
    flexDirection: 'row',
    flex: 1,
  },
  timeSlotContainer: {
    flexDirection: 'row',
  },
  timeSlot: {
    width: HOUR_WIDTH / 2,
    justifyContent: 'center',
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: colors.border.subtle,
  },
  timeSlotText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  channelRow: {
    flexDirection: 'row',
    height: CHANNEL_ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  channelColumn: {
    width: CHANNEL_COLUMN_WIDTH,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border.default,
  },
  channelLogo: {
    width: 48,
    height: 32,
    borderRadius: 4,
  },
  channelLogoPlaceholder: {
    width: 48,
    height: 32,
    backgroundColor: colors.surface.elevated,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channelLogoText: {
    color: colors.text.tertiary,
    fontSize: 12,
    fontWeight: '600',
  },
  favoriteIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  favoriteIcon: {
    color: '#FFD700',
    fontSize: 10,
  },
  programsContainer: {
    flex: 1,
    position: 'relative',
  },
  programBlock: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderLeftWidth: 2,
    overflow: 'hidden',
  },
  programTitle: {
    color: colors.text.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  programTime: {
    color: colors.text.tertiary,
    fontSize: 10,
    marginTop: 2,
  },
  nowButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  nowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
