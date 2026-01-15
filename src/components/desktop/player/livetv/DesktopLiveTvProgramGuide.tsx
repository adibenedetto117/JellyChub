import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '@/theme';
import type { LiveTvChannel, LiveTvProgram } from '@/types/livetv';

interface DesktopLiveTvProgramGuideProps {
  visible: boolean;
  currentChannel: LiveTvChannel | null | undefined;
  currentProgram: LiveTvProgram | null | undefined;
  channels: LiveTvChannel[];
  currentChannelId: string;
  accentColor: string;
  onClose: () => void;
  onChannelSelect: (channel: LiveTvChannel) => void;
}

export function DesktopLiveTvProgramGuide({
  visible,
  currentChannel,
  currentProgram,
  channels,
  currentChannelId,
  accentColor,
  onClose,
  onChannelSelect,
}: DesktopLiveTvProgramGuideProps) {
  const { t } = useTranslation();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!visible) return null;

  return (
    <View style={styles.epgPanel}>
      <View style={styles.sidePanelHeader}>
        <Text style={styles.sidePanelTitle}>
          {t('liveTV.guide') || 'Program Guide'}
        </Text>
        <Pressable onPress={onClose} style={styles.closePanelButton}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView style={styles.epgContent}>
        {currentChannel && (
          <View style={styles.epgChannelSection}>
            <View style={styles.epgChannelHeader}>
              <Text style={styles.epgChannelName}>{currentChannel.Name}</Text>
              <Text style={styles.epgChannelNumber}>
                CH {currentChannel.Number ?? currentChannel.ChannelNumber}
              </Text>
            </View>

            {currentProgram && (
              <View
                style={[styles.epgProgram, { borderLeftColor: accentColor }]}
              >
                <View style={styles.epgProgramHeader}>
                  <View style={[styles.nowBadge, { backgroundColor: accentColor }]}>
                    <Text style={styles.nowBadgeText}>NOW</Text>
                  </View>
                  <Text style={styles.epgProgramTime}>
                    {formatTime(currentProgram.StartDate)} -{' '}
                    {formatTime(currentProgram.EndDate)}
                  </Text>
                </View>
                <Text style={styles.epgProgramTitle}>{currentProgram.Name}</Text>
                {currentProgram.Overview && (
                  <Text style={styles.epgProgramDescription} numberOfLines={3}>
                    {currentProgram.Overview}
                  </Text>
                )}
                <View style={styles.epgProgramTags}>
                  {currentProgram.IsMovie && (
                    <View style={styles.epgTag}>
                      <Text style={styles.epgTagText}>Movie</Text>
                    </View>
                  )}
                  {currentProgram.IsSeries && (
                    <View style={styles.epgTag}>
                      <Text style={styles.epgTagText}>Series</Text>
                    </View>
                  )}
                  {currentProgram.IsNews && (
                    <View style={styles.epgTag}>
                      <Text style={styles.epgTagText}>News</Text>
                    </View>
                  )}
                  {currentProgram.IsSports && (
                    <View style={styles.epgTag}>
                      <Text style={styles.epgTagText}>Sports</Text>
                    </View>
                  )}
                  {currentProgram.OfficialRating && (
                    <View style={styles.epgTag}>
                      <Text style={styles.epgTagText}>
                        {currentProgram.OfficialRating}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.quickChannels}>
              <Text style={styles.quickChannelsTitle}>
                {t('liveTV.quickSwitch') || 'Quick Switch'}
              </Text>
              <View style={styles.quickChannelsList}>
                {channels.slice(0, 8).map((channel) => (
                  <Pressable
                    key={channel.Id}
                    onPress={() => onChannelSelect(channel)}
                    style={({ hovered }: { hovered?: boolean }) => [
                      styles.quickChannelItem,
                      channel.Id === currentChannelId && {
                        backgroundColor: accentColor + '30',
                        borderColor: accentColor,
                      },
                      hovered && styles.quickChannelItemHovered,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickChannelNumber,
                        channel.Id === currentChannelId && { color: accentColor },
                      ]}
                    >
                      {channel.Number ?? channel.ChannelNumber}
                    </Text>
                    <Text
                      style={[
                        styles.quickChannelName,
                        channel.Id === currentChannelId && { color: accentColor },
                      ]}
                      numberOfLines={1}
                    >
                      {channel.Name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  epgPanel: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 450,
    backgroundColor: 'rgba(10,10,10,0.98)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border.default,
  },
  sidePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  sidePanelTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  closePanelButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epgContent: {
    flex: 1,
  },
  epgChannelSection: {
    padding: 20,
  },
  epgChannelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  epgChannelName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  epgChannelNumber: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  epgProgram: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 20,
  },
  epgProgramHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  nowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  nowBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  epgProgramTime: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  epgProgramTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  epgProgramDescription: {
    color: colors.text.tertiary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  epgProgramTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  epgTag: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  epgTagText: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '500',
  },
  quickChannels: {
    marginTop: 24,
  },
  quickChannelsTitle: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickChannelsList: {
    gap: 8,
  },
  quickChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.default,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  quickChannelItemHovered: {
    backgroundColor: colors.surface.elevated,
  },
  quickChannelNumber: {
    color: colors.text.tertiary,
    fontSize: 14,
    fontWeight: '600',
    width: 40,
    fontFamily: 'monospace',
  },
  quickChannelName: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
});
