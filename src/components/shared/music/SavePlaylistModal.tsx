import { memo, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { colors } from '@/theme';

interface SavePlaylistModalProps {
  visible: boolean;
  accentColor: string;
  isLoading: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const SavePlaylistModal = memo(function SavePlaylistModal({
  visible,
  accentColor,
  isLoading,
  onClose,
  onSave,
}: SavePlaylistModalProps) {
  const [playlistName, setPlaylistName] = useState('');

  const handleSave = useCallback(() => {
    const name = playlistName.trim();
    if (name) {
      onSave(name);
      setPlaylistName('');
    }
  }, [playlistName, onSave]);

  const handleClose = useCallback(() => {
    setPlaylistName('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.content}>
          <Text style={styles.title}>Save Queue as Playlist</Text>
          <TextInput
            style={[styles.input, { borderColor: accentColor }]}
            placeholder="Playlist name"
            placeholderTextColor="#666"
            value={playlistName}
            onChangeText={setPlaylistName}
            autoFocus
            selectionColor={accentColor}
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.createButton, { backgroundColor: accentColor }]}
              onPress={handleSave}
              disabled={isLoading}
            >
              <Text style={styles.createText}>{isLoading ? 'Saving...' : 'Save'}</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  content: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  title: { color: '#fff', fontSize: 20, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  input: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  cancelText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  createButton: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  createText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
