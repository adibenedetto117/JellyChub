import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEMES, type ReaderTheme } from '@/hooks';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MobileEpubControlsProps {
  visible: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  fontSize: number;
  onThemeChange: (theme: ReaderTheme) => void;
  onFontSizeChange: (delta: number) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
}

export function MobileEpubControls({
  visible,
  onClose,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  accentColor,
  themeColors,
}: MobileEpubControlsProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBg} onPress={onClose}>
        <Pressable
          style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}
          onPress={e => e.stopPropagation()}
        >
          <Text style={[styles.panelTitle, { color: themeColors.text }]}>Settings</Text>

          <Text style={[styles.label, { color: themeColors.text }]}>Theme</Text>
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

          <Text style={[styles.label, { color: themeColors.text }]}>Font Size</Text>
          <View style={styles.fontRow}>
            <Pressable
              onPress={() => onFontSizeChange(-10)}
              style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
            >
              <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
            </Pressable>
            <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
            <Pressable
              onPress={() => onFontSizeChange(10)}
              style={[styles.fontBtn, { backgroundColor: themeColors.text + '15' }]}
            >
              <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
            </Pressable>
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
    width: SCREEN_WIDTH - 48,
    borderRadius: 20,
    padding: 24,
  },
  panelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
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
    justifyContent: 'center',
    gap: 20,
  },
  fontBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontBtnText: {
    fontSize: 18,
    fontWeight: '600',
  },
  fontBtnTextLg: {
    fontSize: 22,
    fontWeight: '600',
  },
  fontValue: {
    fontSize: 20,
    fontWeight: '600',
    width: 70,
    textAlign: 'center',
  },
});
