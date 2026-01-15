import { View, Text, ScrollView, Pressable, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from '@/providers';
import { colors } from '@/theme';
import type { EditUserModalProps } from './types';
import { ToggleRow } from './ToggleRow';
import { getHiddenUserName } from './utils';

export function EditUserModal({
  visible,
  editingUser,
  fullUserDetails,
  editedPolicy,
  setEditedPolicy,
  newPassword,
  setNewPassword,
  onClose,
  onResetPassword,
  onUpdatePolicy,
  onDeleteUser,
  isResetPasswordPending,
  isUpdatePolicyPending,
  isDeleteUserPending,
  mediaFolders,
  currentUserId,
  accentColor,
  users,
  hideMedia,
}: EditUserModalProps) {
  const editingUserIndex = users?.findIndex(u => u.Id === editingUser?.Id) ?? 0;
  const editingDisplayName = hideMedia ? getHiddenUserName(editingUserIndex) : editingUser?.Name;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <ScrollView style={{ flex: 1 }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <View>
                  <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Edit User</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>{editingDisplayName}</Text>
                </View>
                <Pressable
                  onPress={onClose}
                  style={{ padding: 8 }}
                >
                  <Text style={{ color: accentColor, fontWeight: '600' }}>Done</Text>
                </Pressable>
              </View>

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 }}>Password</Text>
                <TextInput
                  style={{ backgroundColor: colors.background.primary, color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, marginBottom: 12, fontSize: 15 }}
                  placeholder="Enter new password..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
                <Pressable
                  onPress={() => {
                    if (editingUser && newPassword) {
                      onResetPassword(editingUser.Id, newPassword);
                    }
                  }}
                  disabled={!newPassword || isResetPasswordPending}
                  style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: accentColor, opacity: !newPassword || isResetPasswordPending ? 0.5 : 1 }}
                >
                  {isResetPasswordPending ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Update Password</Text>
                  )}
                </Pressable>
              </View>

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Library Access</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Select which libraries this user can access</Text>

                <ToggleRow
                  label="Access All Libraries"
                  description="Automatically grant access to new libraries"
                  value={editedPolicy.EnableAllFolders ?? fullUserDetails?.Policy?.EnableAllFolders ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableAllFolders: value }))}
                  accentColor={accentColor}
                />

                {!(editedPolicy.EnableAllFolders ?? fullUserDetails?.Policy?.EnableAllFolders ?? true) && (
                  <View style={{ marginTop: 12 }}>
                    {mediaFolders?.map((folder) => {
                      const enabledFolders = editedPolicy.EnabledFolders ?? fullUserDetails?.Policy?.EnabledFolders ?? [];
                      const isEnabled = enabledFolders.includes(folder.Id);
                      return (
                        <ToggleRow
                          key={folder.Id}
                          label={folder.Name}
                          description={folder.CollectionType ? `${folder.CollectionType.charAt(0).toUpperCase()}${folder.CollectionType.slice(1)}` : 'Library'}
                          value={isEnabled}
                          onToggle={(value) => {
                            const currentFolders = editedPolicy.EnabledFolders ?? fullUserDetails?.Policy?.EnabledFolders ?? [];
                            const newFolders = value
                              ? [...currentFolders, folder.Id]
                              : currentFolders.filter(id => id !== folder.Id);
                            setEditedPolicy(prev => ({ ...prev, EnabledFolders: newFolders }));
                          }}
                          accentColor={accentColor}
                        />
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Permissions</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Configure what this user can do</Text>

                <ToggleRow
                  label="Administrator"
                  description="Full access to all features and settings"
                  value={editedPolicy.IsAdministrator ?? fullUserDetails?.Policy?.IsAdministrator ?? false}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, IsAdministrator: value }))}
                  accentColor={accentColor}
                  disabled={editingUser?.Id === currentUserId}
                />
                <ToggleRow
                  label="Remote Access"
                  description="Allow access from outside your network"
                  value={editedPolicy.EnableRemoteAccess ?? fullUserDetails?.Policy?.EnableRemoteAccess ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableRemoteAccess: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Media Playback"
                  description="Allow playing media content"
                  value={editedPolicy.EnableMediaPlayback ?? fullUserDetails?.Policy?.EnableMediaPlayback ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableMediaPlayback: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Content Downloading"
                  description="Allow downloading media for offline use"
                  value={editedPolicy.EnableContentDownloading ?? fullUserDetails?.Policy?.EnableContentDownloading ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableContentDownloading: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Content Deletion"
                  description="Allow deleting media from the server"
                  value={editedPolicy.EnableContentDeletion ?? fullUserDetails?.Policy?.EnableContentDeletion ?? false}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableContentDeletion: value }))}
                  accentColor={accentColor}
                />
              </View>

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Transcoding</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Control server transcoding for this user</Text>

                <ToggleRow
                  label="Audio Transcoding"
                  description="Allow audio format conversion"
                  value={editedPolicy.EnableAudioPlaybackTranscoding ?? fullUserDetails?.Policy?.EnableAudioPlaybackTranscoding ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableAudioPlaybackTranscoding: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Video Transcoding"
                  description="Allow video format conversion"
                  value={editedPolicy.EnableVideoPlaybackTranscoding ?? fullUserDetails?.Policy?.EnableVideoPlaybackTranscoding ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableVideoPlaybackTranscoding: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Playback Remuxing"
                  description="Allow container format changes without re-encoding"
                  value={editedPolicy.EnablePlaybackRemuxing ?? fullUserDetails?.Policy?.EnablePlaybackRemuxing ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnablePlaybackRemuxing: value }))}
                  accentColor={accentColor}
                />
              </View>

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Live TV</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Live TV and DVR permissions</Text>

                <ToggleRow
                  label="Live TV Access"
                  description="Allow watching live TV"
                  value={editedPolicy.EnableLiveTvAccess ?? fullUserDetails?.Policy?.EnableLiveTvAccess ?? true}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableLiveTvAccess: value }))}
                  accentColor={accentColor}
                />
                <ToggleRow
                  label="Live TV Management"
                  description="Allow managing recordings and guide data"
                  value={editedPolicy.EnableLiveTvManagement ?? fullUserDetails?.Policy?.EnableLiveTvManagement ?? false}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableLiveTvManagement: value }))}
                  accentColor={accentColor}
                />
              </View>

              {Object.keys(editedPolicy).length > 0 && (
                <Pressable
                  onPress={() => {
                    if (editingUser) {
                      onUpdatePolicy(editingUser.Id, editedPolicy);
                    }
                  }}
                  disabled={isUpdatePolicyPending}
                  style={{ paddingVertical: 14, borderRadius: 8, backgroundColor: accentColor, marginBottom: 16 }}
                >
                  {isUpdatePolicyPending ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>Save Changes</Text>
                  )}
                </Pressable>
              )}

              <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Account Status</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Enable or disable this account</Text>

                <ToggleRow
                  label="Account Enabled"
                  description={editingUser?.Policy?.IsDisabled ? "Account is currently disabled" : "Account is active"}
                  value={!(editedPolicy.IsDisabled ?? fullUserDetails?.Policy?.IsDisabled ?? false)}
                  onToggle={(value) => {
                    if (editingUser?.Id === currentUserId) {
                      Alert.alert('Error', 'You cannot disable yourself');
                      return;
                    }
                    setEditedPolicy(prev => ({ ...prev, IsDisabled: !value }));
                  }}
                  accentColor={accentColor}
                  disabled={editingUser?.Id === currentUserId}
                />
                <ToggleRow
                  label="Hidden User"
                  description="Hide this user from the login screen"
                  value={editedPolicy.IsHidden ?? fullUserDetails?.Policy?.IsHidden ?? false}
                  onToggle={(value) => setEditedPolicy(prev => ({ ...prev, IsHidden: value }))}
                  accentColor={accentColor}
                />
              </View>

              {editingUser?.Id !== currentUserId && !editingUser?.Policy.IsAdministrator && (
                <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 32 }}>
                  <Text style={{ color: '#f87171', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Danger Zone</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Permanently delete this user account</Text>
                  <Pressable
                    onPress={() => {
                      Alert.alert(
                        'Delete User',
                        `Are you sure you want to delete ${editingDisplayName}? This cannot be undone.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => editingUser && onDeleteUser(editingUser.Id) },
                        ]
                      );
                    }}
                    disabled={isDeleteUserPending}
                    style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)' }}
                  >
                    {isDeleteUserPending ? (
                      <ActivityIndicator color="#f87171" size="small" />
                    ) : (
                      <Text style={{ color: '#f87171', textAlign: 'center', fontWeight: '500' }}>Delete User</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
