import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
  isActive?: boolean;
  accentColor: string;
}

function OptionRow({
  icon,
  label,
  value,
  onPress,
  isActive = false,
  accentColor,
}: OptionRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.optionRow}>
      <View
        style={[
          styles.optionIcon,
          { backgroundColor: isActive ? accentColor + '40' : 'rgba(255,255,255,0.1)' },
        ]}
      >
        <Ionicons name={icon} size={20} color={isActive ? accentColor : '#fff'} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionLabel}>{label}</Text>
        {value && <Text style={styles.optionValue}>{value}</Text>}
      </View>
    </Pressable>
  );
}

interface DesktopVideoOptionsMenuProps {
  visible: boolean;
  onClose: () => void;
  accentColor: string;
  currentSpeed: number;
  onSpeedPress: () => void;
  hasChapters: boolean;
  onChapterPress: () => void;
  hasSleepTimer: boolean;
  sleepTimerLabel?: string;
  onSleepTimerPress: () => void;
  onSubtitlePress: () => void;
  onQualityPress: () => void;
  currentQuality?: string;
}

export function DesktopVideoOptionsMenu({
  visible,
  onClose,
  accentColor,
  currentSpeed,
  onSpeedPress,
  hasChapters,
  onChapterPress,
  hasSleepTimer,
  sleepTimerLabel,
  onSleepTimerPress,
  onSubtitlePress,
  onQualityPress,
  currentQuality,
}: DesktopVideoOptionsMenuProps) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.overlay}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.menuContainer}>
          <View style={styles.menu}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Options</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <OptionRow
                icon="speedometer-outline"
                label="Playback Speed"
                value={`${currentSpeed}x`}
                onPress={() => {
                  onClose();
                  onSpeedPress();
                }}
                isActive={currentSpeed !== 1}
                accentColor={accentColor}
              />

              <OptionRow
                icon="text-outline"
                label="Audio & Subtitles"
                onPress={() => {
                  onClose();
                  onSubtitlePress();
                }}
                accentColor={accentColor}
              />

              {currentQuality && (
                <OptionRow
                  icon="settings-outline"
                  label="Quality"
                  value={currentQuality}
                  onPress={() => {
                    onClose();
                    onQualityPress();
                  }}
                  accentColor={accentColor}
                />
              )}

              {hasChapters && (
                <OptionRow
                  icon="list-outline"
                  label="Chapters"
                  onPress={() => {
                    onClose();
                    onChapterPress();
                  }}
                  accentColor={accentColor}
                />
              )}

              <OptionRow
                icon="moon-outline"
                label="Sleep Timer"
                value={hasSleepTimer ? sleepTimerLabel : 'Off'}
                onPress={() => {
                  onClose();
                  onSleepTimerPress();
                }}
                isActive={hasSleepTimer}
                accentColor={accentColor}
              />
            </ScrollView>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    width: '100%',
    maxWidth: 400,
  },
  menu: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginHorizontal: 24,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  optionValue: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginTop: 2,
  },
});
