import { View, Text, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { colors } from '@/theme';
import type { CreateUserModalProps } from './types';

export function CreateUserModal({
  visible,
  newUserName,
  setNewUserName,
  newUserPassword,
  setNewUserPassword,
  onClose,
  onCreate,
  isPending,
  accentColor,
}: CreateUserModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        <View style={{ backgroundColor: colors.surface.default, width: '100%', maxWidth: 400, borderRadius: 16, padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 20 }}>Create New User</Text>

          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Username</Text>
          <TextInput
            style={{ backgroundColor: colors.background.primary, color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginBottom: 16, fontSize: 15 }}
            placeholder="Enter username..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={newUserName}
            onChangeText={setNewUserName}
            autoCapitalize="none"
          />

          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 8 }}>Password (optional)</Text>
          <TextInput
            style={{ backgroundColor: colors.background.primary, color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginBottom: 20, fontSize: 15 }}
            placeholder="Enter password..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={newUserPassword}
            onChangeText={setNewUserPassword}
            secureTextEntry
          />

          <Pressable
            onPress={() => {
              if (newUserName.trim()) {
                onCreate(newUserName.trim(), newUserPassword || undefined);
              }
            }}
            disabled={!newUserName.trim() || isPending}
            style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: accentColor, opacity: !newUserName.trim() || isPending ? 0.5 : 1, marginBottom: 12 }}
          >
            {isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Create User</Text>
            )}
          </Pressable>

          <Pressable
            onPress={onClose}
            style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: colors.background.primary }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
