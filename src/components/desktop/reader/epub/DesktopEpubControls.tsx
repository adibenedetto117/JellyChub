import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEMES, type ReaderTheme } from '@/hooks';

const LINE_HEIGHT_OPTIONS = [1.4, 1.5, 1.6, 1.7, 1.8, 2.0];

interface DesktopEpubControlsProps {
  visible: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  fontSize: number;
  lineHeight: number;
  onThemeChange: (theme: ReaderTheme) => void;
  onFontSizeChange: (delta: number) => void;
  onLineHeightChange: (lineHeight: number) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
}

export function DesktopEpubControls({
  visible,
  onClose,
  theme,
  fontSize,
  lineHeight,
  onThemeChange,
  onFontSizeChange,
  onLineHeightChange,
  accentColor,
  themeColors,
}: DesktopEpubControlsProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable
          style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.settingsHeader}>
            <Text style={[styles.settingsTitle, { color: themeColors.text }]}>Reading Settings</Text>
            <Pressable onPress={onClose} style={styles.settingsCloseBtn}>
              <Ionicons name="close" size={24} color={themeColors.text} />
            </Pressable>
          </View>

          <View style={styles.settingsSection}>
            <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Theme</Text>
            <View style={styles.themeRow}>
              {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
                <Pressable
                  key={t}
                  onPress={() => onThemeChange(t)}
                  style={[
                    styles.themeBtn,
                    { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' },
                  ]}
                >
                  <Text style={{ color: THEMES[t].text }}>{THEMES[t].name}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Font Size</Text>
            <View style={styles.fontRow}>
              <Pressable
                onPress={() => onFontSizeChange(-10)}
                style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
              >
                <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
              </Pressable>
              <View style={styles.fontSlider}>
                <View style={[styles.fontSliderTrack, { backgroundColor: themeColors.text + '20' }]}>
                  <View
                    style={[
                      styles.fontSliderFill,
                      { width: `${((fontSize - 50) / 150) * 100}%`, backgroundColor: accentColor },
                    ]}
                  />
                </View>
                <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
              </View>
              <Pressable
                onPress={() => onFontSizeChange(10)}
                style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
              >
                <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={[styles.settingsLabel, { color: themeColors.text }]}>Line Height</Text>
            <View style={styles.lineHeightRow}>
              {LINE_HEIGHT_OPTIONS.map(lh => (
                <Pressable
                  key={lh}
                  onPress={() => onLineHeightChange(lh)}
                  style={[
                    styles.lineHeightBtn,
                    { backgroundColor: themeColors.text + '10', borderColor: lineHeight === lh ? accentColor : 'transparent' },
                  ]}
                >
                  <Text style={[styles.lineHeightBtnText, { color: lineHeight === lh ? accentColor : themeColors.text }]}>
                    {lh}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    width: 480,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  settingsCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(128,128,128,0.15)',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fontBtn: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  fontBtnTextLg: {
    fontSize: 20,
    fontWeight: '600',
  },
  fontSlider: {
    flex: 1,
    alignItems: 'center',
  },
  fontSliderTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fontSliderFill: {
    height: '100%',
    borderRadius: 2,
  },
  fontValue: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },
  lineHeightRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineHeightBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
  },
  lineHeightBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
