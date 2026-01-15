import { View, Text, Pressable, Modal, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEMES, type ReaderTheme } from '@/hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface TVEpubControlsProps {
  visible: boolean;
  onClose: () => void;
  theme: ReaderTheme;
  fontSize: number;
  onThemeChange: (theme: ReaderTheme) => void;
  onFontSizeChange: (delta: number) => void;
  accentColor: string;
  themeColors: { text: string; bg: string };
}

export function TVEpubControls({
  visible,
  onClose,
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  accentColor,
  themeColors,
}: TVEpubControlsProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={[styles.settingsPanel, { backgroundColor: theme === 'light' ? '#fff' : '#1a1a1a' }]}>
          <Text style={[styles.panelTitle, { color: themeColors.text }]}>Settings</Text>

          <Text style={[styles.label, { color: themeColors.text }]}>Theme</Text>
          <View style={styles.themeRow}>
            {(['dark', 'light', 'sepia'] as ReaderTheme[]).map(t => (
              <Pressable
                key={t}
                onPress={() => onThemeChange(t)}
                style={({ pressed }) => [
                  styles.themeBtn,
                  { backgroundColor: THEMES[t].bg, borderColor: theme === t ? accentColor : '#88888840' },
                  pressed && { borderColor: accentColor, borderWidth: 3 },
                ]}
              >
                <Text style={{ color: THEMES[t].text, fontSize: 18 }}>{THEMES[t].name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: themeColors.text }]}>Font Size</Text>
          <View style={styles.fontRow}>
            <Pressable
              onPress={() => onFontSizeChange(-10)}
              style={({ pressed }) => [
                styles.fontBtn,
                { backgroundColor: themeColors.text + '15' },
                pressed && { borderColor: accentColor, borderWidth: 3 },
              ]}
            >
              <Text style={[styles.fontBtnText, { color: themeColors.text }]}>A-</Text>
            </Pressable>
            <Text style={[styles.fontValue, { color: themeColors.text }]}>{fontSize}%</Text>
            <Pressable
              onPress={() => onFontSizeChange(10)}
              style={({ pressed }) => [
                styles.fontBtn,
                { backgroundColor: themeColors.text + '15' },
                pressed && { borderColor: accentColor, borderWidth: 3 },
              ]}
            >
              <Text style={[styles.fontBtnTextLg, { color: themeColors.text }]}>A+</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    width: 500,
    borderRadius: 24,
    padding: 32,
  },
  panelTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  label: {
    fontSize: 18,
    marginBottom: 16,
    opacity: 0.7,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  themeBtn: {
    flex: 1,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
  },
  fontRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  fontBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  fontBtnText: {
    fontSize: 24,
    fontWeight: '600',
  },
  fontBtnTextLg: {
    fontSize: 28,
    fontWeight: '600',
  },
  fontValue: {
    fontSize: 24,
    fontWeight: '600',
    width: 100,
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
