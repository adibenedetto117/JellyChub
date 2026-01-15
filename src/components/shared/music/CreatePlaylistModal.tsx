import { View, Text, Pressable, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from 'react-native';
import { memo } from 'react';
import { colors } from '@/theme';

interface CreatePlaylistModalProps {
  visible: boolean;
  onClose: () => void;
  playlistName: string;
  onChangePlaylistName: (name: string) => void;
  onConfirm: () => void;
  isPending: boolean;
  accentColor: string;
}

export const CreatePlaylistModal = memo(function CreatePlaylistModal({
  visible,
  onClose,
  playlistName,
  onChangePlaylistName,
  onConfirm,
  isPending,
  accentColor,
}: CreatePlaylistModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>New Playlist</Text>
          <TextInput
            style={[styles.modalInput, { borderColor: accentColor }]}
            placeholder="Playlist name"
            placeholderTextColor="#666"
            value={playlistName}
            onChangeText={onChangePlaylistName}
            autoFocus
            selectionColor={accentColor}
            onSubmitEditing={onConfirm}
            returnKeyType="done"
          />
          <View style={styles.modalButtons}>
            <Pressable
              style={styles.modalCancelButton}
              onPress={onClose}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalCreateButton, { backgroundColor: accentColor }]}
              onPress={onConfirm}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalCreateText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: colors.surface.default,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 340,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCreateButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
