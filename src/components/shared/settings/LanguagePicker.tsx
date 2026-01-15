import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { AUDIO_SUBTITLE_LANGUAGES } from '@/constants/subtitleStyles';

interface LanguagePickerProps {
  title: string;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
  accentColor: string;
}

export function LanguagePicker({ title, selectedCode, onSelect, onClose, accentColor }: LanguagePickerProps) {
  return (
    <View
      style={styles.overlay}
      accessible={true}
      accessibilityRole="none"
      accessibilityViewIsModal={true}
    >
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Pressable
            onPress={onClose}
            style={styles.closeButton}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Close"
            accessibilityHint="Closes the language picker"
          >
            <Text style={styles.closeText} accessible={false}>X</Text>
          </Pressable>
        </View>
        <ScrollView style={styles.list} accessibilityRole="list">
          {AUDIO_SUBTITLE_LANGUAGES.map((lang) => (
            <Pressable
              key={lang.code}
              onPress={() => {
                onSelect(lang.code);
                onClose();
              }}
              style={[
                styles.item,
                selectedCode === lang.code && { backgroundColor: accentColor + '30' },
              ]}
              accessible={true}
              accessibilityRole="radio"
              accessibilityLabel={lang.name}
              accessibilityState={{ checked: selectedCode === lang.code }}
            >
              <Text style={styles.itemText} accessible={false}>{lang.name}</Text>
              {selectedCode === lang.code && (
                <View style={[styles.checkmark, { backgroundColor: accentColor }]} accessible={false}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    zIndex: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#18181b',
    borderRadius: 16,
    width: '85%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: {
    color: '#fff',
    fontWeight: '700',
  },
  list: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  itemText: {
    color: '#fff',
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 12,
  },
});
