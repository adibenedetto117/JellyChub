import { memo, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAnnouncementStore } from '@/stores/announcementStore';
import { colors } from '@/theme';
import type { Announcement } from '@/stores/announcementStore';

const TYPE_CONFIG = {
  info: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.3)',
    textColor: '#60a5fa',
    icon: 'information-circle' as const,
  },
  warning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    textColor: '#fbbf24',
    icon: 'warning' as const,
  },
  success: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
    textColor: '#4ade80',
    icon: 'checkmark-circle' as const,
  },
};

interface AnnouncementItemProps {
  announcement: Announcement;
  onDismiss: (id: string) => void;
}

const AnnouncementItem = memo(function AnnouncementItem({
  announcement,
  onDismiss,
}: AnnouncementItemProps) {
  const config = TYPE_CONFIG[announcement.type];

  const handleDismiss = useCallback(() => {
    onDismiss(announcement.id);
  }, [announcement.id, onDismiss]);

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color={config.textColor} style={styles.icon} />
      <View style={styles.content}>
        {announcement.title && (
          <Text style={[styles.title, { color: config.textColor }]}>{announcement.title}</Text>
        )}
        <Text style={styles.message}>{announcement.message}</Text>
      </View>
      <Pressable
        onPress={handleDismiss}
        style={styles.dismissButton}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="close" size={18} color="rgba(255,255,255,0.6)" />
      </Pressable>
    </View>
  );
});

export const AnnouncementBanner = memo(function AnnouncementBanner() {
  const announcements = useAnnouncementStore((s) => s.announcements);
  const dismissedIds = useAnnouncementStore((s) => s.dismissedAnnouncementIds);
  const dismissAnnouncement = useAnnouncementStore((s) => s.dismissAnnouncement);

  const activeAnnouncements = useMemo(() => {
    const now = new Date();
    return announcements.filter((a) => {
      if (dismissedIds.includes(a.id)) return false;
      if (a.expiresAt && new Date(a.expiresAt) < now) return false;
      return true;
    });
  }, [announcements, dismissedIds]);

  if (activeAnnouncements.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {activeAnnouncements.map((announcement) => (
        <AnnouncementItem
          key={announcement.id}
          announcement={announcement}
          onDismiss={dismissAnnouncement}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  icon: {
    marginRight: 10,
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  dismissButton: {
    marginLeft: 8,
    padding: 2,
  },
});
