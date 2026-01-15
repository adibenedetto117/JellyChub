import { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';

interface OpenSubtitlesModalProps {
  visible: boolean;
  currentApiKey: string | null;
  accentColor: string;
  onSave: (apiKey: string | null) => void;
  onClose: () => void;
}

export function OpenSubtitlesModal({
  visible,
  currentApiKey,
  accentColor,
  onSave,
  onClose,
}: OpenSubtitlesModalProps) {
  const [tempApiKey, setTempApiKey] = useState(currentApiKey || '');

  if (!visible) return null;

  const handleSave = () => {
    onSave(tempApiKey.trim() || null);
    onClose();
  };

  const handleRemove = () => {
    onSave(null);
    setTempApiKey('');
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.modal}>
        <View style={styles.header}>
          <Text style={styles.title}>OpenSubtitles API Key</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>X</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <TextInput
            value={tempApiKey}
            onChangeText={setTempApiKey}
            placeholder="Enter your API key"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>Get your free API key from opensubtitles.com/consumers</Text>
          <View style={styles.buttons}>
            {currentApiKey && (
              <Pressable onPress={handleRemove} style={styles.removeButton}>
                <Text style={styles.removeText}>Remove</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: accentColor }]}
            >
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
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
    maxWidth: 400,
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
  content: {
    padding: 16,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  removeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(239,68,68,0.2)',
    alignItems: 'center',
  },
  removeText: {
    color: '#f87171',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '500',
  },
});
