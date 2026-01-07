import { View, Text, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore, useSettingsStore } from '@/stores';
import {
  getSystemInfo,
  getSessions,
  getItemCounts,
  getActivityLog,
  getScheduledTasks,
  getUsers,
  getUserById,
  getMediaFolders,
  refreshLibrary,
  restartServer,
  shutdownServer,
  stopSession,
  sendPlayCommand,
  sendPauseCommand,
  sendStopCommand,
  runScheduledTask,
  stopScheduledTask,
  enableUser,
  disableUser,
  resetUserPassword,
  deleteUser,
  updateUserPolicy,
  createUser,
} from '@/api/admin';
import type { SystemInfo, SessionInfo, ItemCounts, ActivityLogEntry, ScheduledTask, UserInfo, UserPolicy, MediaFolder } from '@/api/admin';
import { colors } from '@/theme';

type TabType = 'overview' | 'sessions' | 'tasks' | 'users';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editedPolicy, setEditedPolicy] = useState<Partial<UserPolicy>>({});
  const [newPassword, setNewPassword] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.Id ?? '';
  const accentColor = useSettingsStore((s) => s.accentColor);

  // Check if user is admin
  const isAdmin = (currentUser as { Policy?: { IsAdministrator?: boolean } })?.Policy?.IsAdministrator;

  // Queries
  const { data: systemInfo, refetch: refetchSystemInfo } = useQuery({
    queryKey: ['systemInfo'],
    queryFn: getSystemInfo,
    enabled: !!isAdmin,
  });

  const { data: sessions, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions'],
    queryFn: getSessions,
    enabled: !!isAdmin,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: itemCounts, refetch: refetchItemCounts } = useQuery({
    queryKey: ['itemCounts', userId],
    queryFn: () => getItemCounts(userId),
    enabled: !!userId && !!isAdmin,
  });

  const { data: activityLog, refetch: refetchActivityLog } = useQuery({
    queryKey: ['activityLog'],
    queryFn: () => getActivityLog(0, 20),
    enabled: !!isAdmin,
  });

  const { data: scheduledTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['scheduledTasks', activeTab],
    queryFn: getScheduledTasks,
    enabled: !!isAdmin && activeTab === 'tasks',
    refetchInterval: activeTab === 'tasks' ? 3000 : false,
    staleTime: 0,
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['users', activeTab],
    queryFn: getUsers,
    enabled: !!isAdmin && activeTab === 'users',
    staleTime: 0,
  });

  const { data: mediaFolders } = useQuery({
    queryKey: ['mediaFolders'],
    queryFn: getMediaFolders,
    enabled: !!isAdmin,
  });

  const { data: fullUserDetails, refetch: refetchFullUser } = useQuery({
    queryKey: ['fullUser', editingUser?.Id],
    queryFn: () => editingUser ? getUserById(editingUser.Id) : null,
    enabled: !!editingUser?.Id,
  });

  // Mutations
  const refreshLibraryMutation = useMutation({
    mutationFn: refreshLibrary,
    onSuccess: () => Alert.alert('Success', 'Library scan started'),
    onError: () => Alert.alert('Error', 'Failed to start library scan'),
  });

  const restartServerMutation = useMutation({
    mutationFn: restartServer,
    onSuccess: () => Alert.alert('Success', 'Server is restarting...'),
    onError: () => Alert.alert('Error', 'Failed to restart server'),
  });

  const shutdownServerMutation = useMutation({
    mutationFn: shutdownServer,
    onSuccess: () => Alert.alert('Success', 'Server is shutting down...'),
    onError: () => Alert.alert('Error', 'Failed to shutdown server'),
  });

  const stopSessionMutation = useMutation({
    mutationFn: stopSession,
    onSuccess: () => refetchSessions(),
    onError: () => Alert.alert('Error', 'Failed to stop session'),
  });

  const enableUserMutation = useMutation({
    mutationFn: enableUser,
    onSuccess: () => {
      refetchUsers();
      Alert.alert('Success', 'User enabled');
    },
    onError: () => Alert.alert('Error', 'Failed to enable user'),
  });

  const disableUserMutation = useMutation({
    mutationFn: disableUser,
    onSuccess: () => {
      refetchUsers();
      Alert.alert('Success', 'User disabled');
    },
    onError: () => Alert.alert('Error', 'Failed to disable user'),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ oderId, password }: { oderId: string; password: string }) =>
      resetUserPassword(oderId, password),
    onSuccess: () => {
      setEditingUser(null);
      setNewPassword('');
      Alert.alert('Success', 'Password updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update password'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      refetchUsers();
      setEditingUser(null);
      Alert.alert('Success', 'User deleted');
    },
    onError: () => Alert.alert('Error', 'Failed to delete user'),
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ userId, policy }: { userId: string; policy: Partial<UserPolicy> }) =>
      updateUserPolicy(userId, policy),
    onSuccess: () => {
      refetchUsers();
      refetchFullUser();
      Alert.alert('Success', 'User settings updated');
    },
    onError: () => Alert.alert('Error', 'Failed to update user settings'),
  });

  const createUserMutation = useMutation({
    mutationFn: ({ name, password }: { name: string; password?: string }) =>
      createUser(name, password),
    onSuccess: () => {
      refetchUsers();
      setShowCreateUser(false);
      setNewUserName('');
      setNewUserPassword('');
      Alert.alert('Success', 'User created');
    },
    onError: () => Alert.alert('Error', 'Failed to create user'),
  });

  const runTaskMutation = useMutation({
    mutationFn: runScheduledTask,
    onSuccess: () => refetchTasks(),
    onError: () => Alert.alert('Error', 'Failed to run task'),
  });

  const stopTaskMutation = useMutation({
    mutationFn: stopScheduledTask,
    onSuccess: () => refetchTasks(),
    onError: () => Alert.alert('Error', 'Failed to stop task'),
  });

  const playMutation = useMutation({
    mutationFn: sendPlayCommand,
    onSuccess: () => refetchSessions(),
    onError: (err) => Alert.alert('Error', 'Failed to send play command'),
  });
  const pauseMutation = useMutation({
    mutationFn: sendPauseCommand,
    onSuccess: () => refetchSessions(),
    onError: (err) => Alert.alert('Error', 'Failed to send pause command'),
  });
  const stopPlayMutation = useMutation({
    mutationFn: sendStopCommand,
    onSuccess: () => refetchSessions(),
    onError: (err) => Alert.alert('Error', 'Failed to send stop command'),
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSystemInfo(),
      refetchSessions(),
      refetchItemCounts(),
      refetchActivityLog(),
    ]);
    setRefreshing(false);
  }, []);

  const handleKickDevice = (session: SessionInfo) => {
    Alert.alert(
      'Kick Device',
      `This will disconnect "${session.DeviceName}" and force ${session.UserName} to log in again.\n\nTo just stop playback, use the "Stop" button instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Kick Device', style: 'destructive', onPress: () => stopSessionMutation.mutate(session.DeviceId) },
      ]
    );
  };

  const handleRestartServer = () => {
    Alert.alert('Restart Server', 'All active streams will be interrupted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', style: 'destructive', onPress: () => restartServerMutation.mutate() },
    ]);
  };

  const handleShutdownServer = () => {
    Alert.alert('Shutdown Server', 'This will stop the Jellyfin server completely.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Shutdown', style: 'destructive', onPress: () => shutdownServerMutation.mutate() },
    ]);
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 8 }}>Access Denied</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
            Administrator privileges required.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={{ backgroundColor: accentColor, marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeSessions = sessions?.filter((s) => s.NowPlayingItem) ?? [];
  const idleSessions = sessions?.filter((s) => !s.NowPlayingItem) ?? [];

  const tabs: { id: TabType; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions', badge: activeSessions.length || undefined },
    { id: 'tasks', label: 'Tasks' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>Admin</Text>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>{systemInfo?.ServerName ?? 'Server'}</Text>
      </View>

      {/* Tab Bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: isActive ? '#fff' : colors.surface.default,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  color: isActive ? '#000' : 'rgba(255,255,255,0.6)',
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                  {tab.label}
                </Text>
                {tab.badge ? (
                  <View style={{
                    marginLeft: 6,
                    backgroundColor: isActive ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    borderRadius: 8,
                    minWidth: 18,
                    alignItems: 'center',
                  }}>
                    <Text style={{ color: isActive ? '#000' : '#fff', fontSize: 11, fontWeight: '700' }}>{tab.badge}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {activeTab === 'overview' && (
          <OverviewTab
            systemInfo={systemInfo}
            itemCounts={itemCounts}
            activityLog={activityLog?.Items}
            activeSessions={activeSessions.length}
            onRefreshLibrary={() => refreshLibraryMutation.mutate()}
            onRestartServer={handleRestartServer}
            onShutdownServer={handleShutdownServer}
            isRefreshing={refreshLibraryMutation.isPending}
            accentColor={accentColor}
          />
        )}

        {activeTab === 'sessions' && (
          <SessionsTab
            activeSessions={activeSessions}
            idleSessions={idleSessions}
            onKickDevice={handleKickDevice}
            onPlay={(s) => playMutation.mutate(s.Id)}
            onPause={(s) => pauseMutation.mutate(s.Id)}
            onStopPlayback={(s) => stopPlayMutation.mutate(s.Id)}
            accentColor={accentColor}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={scheduledTasks ?? []}
            onRun={(id) => runTaskMutation.mutate(id)}
            onStop={(id) => stopTaskMutation.mutate(id)}
            accentColor={accentColor}
          />
        )}

        {activeTab === 'users' && (
          <UsersTab
            users={users ?? []}
            accentColor={accentColor}
            onEnable={(id) => enableUserMutation.mutate(id)}
            onDisable={(id) => disableUserMutation.mutate(id)}
            onEdit={(user) => {
              setEditingUser(user);
              setEditedPolicy({});
            }}
            onCreateUser={() => setShowCreateUser(true)}
            currentUserId={userId}
          />
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit User Modal */}
      <Modal visible={!!editingUser} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <ScrollView style={{ flex: 1 }}>
              <View style={{ padding: 16 }}>
                {/* Header */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                  <View>
                    <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700' }}>Edit User</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, marginTop: 2 }}>{editingUser?.Name}</Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      setEditingUser(null);
                      setNewPassword('');
                      setEditedPolicy({});
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: accentColor, fontWeight: '600' }}>Done</Text>
                  </Pressable>
                </View>

                {/* Password Reset Section */}
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
                        resetPasswordMutation.mutate({ oderId: editingUser.Id, password: newPassword });
                      }
                    }}
                    disabled={!newPassword || resetPasswordMutation.isPending}
                    style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: accentColor, opacity: !newPassword || resetPasswordMutation.isPending ? 0.5 : 1 }}
                  >
                    {resetPasswordMutation.isPending ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Update Password</Text>
                    )}
                  </Pressable>
                </View>

                {/* Library Access Section */}
                <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Library Access</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Select which libraries this user can access</Text>

                  {/* All Libraries Toggle */}
                  <ToggleRow
                    label="Access All Libraries"
                    description="Automatically grant access to new libraries"
                    value={editedPolicy.EnableAllFolders ?? fullUserDetails?.Policy?.EnableAllFolders ?? true}
                    onToggle={(value) => setEditedPolicy(prev => ({ ...prev, EnableAllFolders: value }))}
                    accentColor={accentColor}
                  />

                  {/* Individual Libraries */}
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

                {/* Permissions Section */}
                <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Permissions</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Configure what this user can do</Text>

                  <ToggleRow
                    label="Administrator"
                    description="Full access to all features and settings"
                    value={editedPolicy.IsAdministrator ?? fullUserDetails?.Policy?.IsAdministrator ?? false}
                    onToggle={(value) => setEditedPolicy(prev => ({ ...prev, IsAdministrator: value }))}
                    accentColor={accentColor}
                    disabled={editingUser?.Id === userId}
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

                {/* Transcoding Section */}
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

                {/* Live TV Section */}
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

                {/* Save Button */}
                {Object.keys(editedPolicy).length > 0 && (
                  <Pressable
                    onPress={() => {
                      if (editingUser) {
                        updatePolicyMutation.mutate({ userId: editingUser.Id, policy: editedPolicy });
                      }
                    }}
                    disabled={updatePolicyMutation.isPending}
                    style={{ paddingVertical: 14, borderRadius: 8, backgroundColor: accentColor, marginBottom: 16 }}
                  >
                    {updatePolicyMutation.isPending ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>Save Changes</Text>
                    )}
                  </Pressable>
                )}

                {/* Account Status Section */}
                <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Account Status</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Enable or disable this account</Text>

                  <ToggleRow
                    label="Account Enabled"
                    description={editingUser?.Policy?.IsDisabled ? "Account is currently disabled" : "Account is active"}
                    value={!(editedPolicy.IsDisabled ?? fullUserDetails?.Policy?.IsDisabled ?? false)}
                    onToggle={(value) => {
                      if (editingUser?.Id === userId) {
                        Alert.alert('Error', 'You cannot disable yourself');
                        return;
                      }
                      setEditedPolicy(prev => ({ ...prev, IsDisabled: !value }));
                    }}
                    accentColor={accentColor}
                    disabled={editingUser?.Id === userId}
                  />
                  <ToggleRow
                    label="Hidden User"
                    description="Hide this user from the login screen"
                    value={editedPolicy.IsHidden ?? fullUserDetails?.Policy?.IsHidden ?? false}
                    onToggle={(value) => setEditedPolicy(prev => ({ ...prev, IsHidden: value }))}
                    accentColor={accentColor}
                  />
                </View>

                {/* Delete User Section */}
                {editingUser?.Id !== userId && !editingUser?.Policy.IsAdministrator && (
                  <View style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 32 }}>
                    <Text style={{ color: '#f87171', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>Danger Zone</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 16 }}>Permanently delete this user account</Text>
                    <Pressable
                      onPress={() => {
                        Alert.alert(
                          'Delete User',
                          `Are you sure you want to delete ${editingUser?.Name}? This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => editingUser && deleteUserMutation.mutate(editingUser.Id) },
                          ]
                        );
                      }}
                      disabled={deleteUserMutation.isPending}
                      style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.15)' }}
                    >
                      {deleteUserMutation.isPending ? (
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

      {/* Create User Modal */}
      <Modal visible={showCreateUser} transparent animationType="fade">
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
                  createUserMutation.mutate({ name: newUserName.trim(), password: newUserPassword || undefined });
                }
              }}
              disabled={!newUserName.trim() || createUserMutation.isPending}
              style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: accentColor, opacity: !newUserName.trim() || createUserMutation.isPending ? 0.5 : 1, marginBottom: 12 }}
            >
              {createUserMutation.isPending ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Create User</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                setShowCreateUser(false);
                setNewUserName('');
                setNewUserPassword('');
              }}
              style={{ paddingVertical: 12, borderRadius: 8, backgroundColor: colors.background.primary }}
            >
              <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '500' }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Overview Tab
interface OverviewTabProps {
  systemInfo?: SystemInfo;
  itemCounts?: ItemCounts;
  activityLog?: ActivityLogEntry[];
  activeSessions: number;
  onRefreshLibrary: () => void;
  onRestartServer: () => void;
  onShutdownServer: () => void;
  isRefreshing: boolean;
  accentColor: string;
}

function OverviewTab({
  systemInfo,
  itemCounts,
  activityLog,
  activeSessions,
  onRefreshLibrary,
  onRestartServer,
  onShutdownServer,
  isRefreshing,
  accentColor,
}: OverviewTabProps) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Server Status */}
      <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 17 }}>{systemInfo?.ServerName ?? 'Server'}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
            v{systemInfo?.Version ?? '-'} · {systemInfo?.OperatingSystem ?? '-'}
          </Text>
        </View>
        <View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Active Streams</Text>
          <Text style={{ color: '#fff', fontSize: 14 }}>{activeSessions}</Text>
        </View>
        {systemInfo?.HasUpdateAvailable && (
          <View style={{ backgroundColor: `${accentColor}20`, marginTop: 12, padding: 8, borderRadius: 8 }}>
            <Text style={{ color: accentColor, fontSize: 13 }}>Update available</Text>
          </View>
        )}
      </View>

      {/* Library Stats */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Movies', value: itemCounts?.MovieCount ?? 0 },
          { label: 'Series', value: itemCounts?.SeriesCount ?? 0 },
          { label: 'Episodes', value: itemCounts?.EpisodeCount ?? 0 },
          { label: 'Albums', value: itemCounts?.AlbumCount ?? 0 },
          { label: 'Songs', value: itemCounts?.SongCount ?? 0 },
          { label: 'Books', value: itemCounts?.BookCount ?? 0 },
        ].map((stat) => (
          <View key={stat.label} style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 12, minWidth: 95 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{stat.label}</Text>
            <Text style={{ color: accentColor, fontSize: 20, fontWeight: '700' }}>
              {stat.value.toLocaleString()}
            </Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Quick Actions</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <ActionButton label="Scan Library" onPress={onRefreshLibrary} loading={isRefreshing} color={accentColor} />
        <ActionButton label="Restart Server" onPress={onRestartServer} color="#f97316" />
        <ActionButton label="Shutdown" onPress={onShutdownServer} color="#ef4444" />
      </View>

      {/* Recent Activity */}
      <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>Recent Activity</Text>
      <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
        {activityLog?.slice(0, 8).map((activity, index) => (
          <View key={activity.Id} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: index < 7 ? 1 : 0, borderBottomColor: colors.background.primary }}>
            <Text style={{ color: '#fff', fontSize: 13 }} numberOfLines={1}>{activity.Name}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>{formatRelativeTime(activity.Date)}</Text>
          </View>
        ))}
        {(!activityLog || activityLog.length === 0) && (
          <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', paddingVertical: 24 }}>No recent activity</Text>
        )}
      </View>
    </View>
  );
}

// Sessions Tab
interface SessionsTabProps {
  activeSessions: SessionInfo[];
  idleSessions: SessionInfo[];
  onKickDevice: (session: SessionInfo) => void;
  onPlay: (session: SessionInfo) => void;
  onPause: (session: SessionInfo) => void;
  onStopPlayback: (session: SessionInfo) => void;
  accentColor: string;
}

function SessionsTab({
  activeSessions,
  idleSessions,
  onKickDevice,
  onPlay,
  onPause,
  onStopPlayback,
  accentColor,
}: SessionsTabProps) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      {activeSessions.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12 }}>
            Now Playing ({activeSessions.length})
          </Text>
          {activeSessions.map((session) => (
            <SessionCard
              key={session.Id}
              session={session}
              onKickDevice={() => onKickDevice(session)}
              onPlay={() => onPlay(session)}
              onPause={() => onPause(session)}
              onStopPlayback={() => onStopPlayback(session)}
              accentColor={accentColor}
            />
          ))}
        </>
      )}

      {idleSessions.length > 0 && (
        <>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15, marginBottom: 12, marginTop: 16 }}>
            Connected ({idleSessions.length})
          </Text>
          <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, overflow: 'hidden' }}>
            {idleSessions.map((session, index) => (
              <View
                key={session.Id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: index < idleSessions.length - 1 ? 1 : 0,
                  borderBottomColor: colors.background.primary,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{session.UserName}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  {session.Client} · {session.DeviceName}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}

      {activeSessions.length === 0 && idleSessions.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No active sessions</Text>
        </View>
      )}
    </View>
  );
}

interface SessionCardProps {
  session: SessionInfo;
  onKickDevice: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStopPlayback: () => void;
  accentColor: string;
}

function SessionCard({ session, onKickDevice, onPlay, onPause, onStopPlayback, accentColor }: SessionCardProps) {
  const nowPlaying = session.NowPlayingItem;
  const playState = session.PlayState;

  const progress =
    nowPlaying?.RunTimeTicks && playState?.PositionTicks
      ? (playState.PositionTicks / nowPlaying.RunTimeTicks) * 100
      : 0;

  const methodColor: Record<string, string> = {
    DirectPlay: '#22c55e',
    DirectStream: '#0ea5e9',
    Transcode: '#f97316',
  };

  return (
    <View style={{ backgroundColor: colors.surface.default, borderRadius: 16, padding: 16, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{session.UserName}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{session.Client} · {session.DeviceName}</Text>
        </View>
        {playState?.PlayMethod && (
          <View style={{ backgroundColor: methodColor[playState.PlayMethod] ?? colors.surface.default, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '500' }}>{playState.PlayMethod}</Text>
          </View>
        )}
      </View>

      {nowPlaying && (
        <View style={{ marginTop: 12, backgroundColor: colors.background.primary, borderRadius: 12, padding: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }} numberOfLines={1}>
            {nowPlaying.SeriesName ? `${nowPlaying.SeriesName}` : nowPlaying.Name}
          </Text>
          {nowPlaying.SeriesName && (
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
              S{nowPlaying.ParentIndexNumber}:E{nowPlaying.IndexNumber} · {nowPlaying.Name}
            </Text>
          )}

          {/* Progress bar */}
          <View style={{ height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: `${progress}%`, backgroundColor: accentColor, height: '100%' }} />
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
              {playState?.IsPaused ? 'Paused' : 'Playing'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {session.SupportsRemoteControl ? (
                <>
                  <SmallButton label={playState?.IsPaused ? 'Play' : 'Pause'} onPress={playState?.IsPaused ? onPlay : onPause} />
                  <SmallButton label="Stop" onPress={onStopPlayback} />
                </>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>No remote control</Text>
              )}
              <SmallButton label="Kick" onPress={onKickDevice} danger />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Tasks Tab
interface TasksTabProps {
  tasks: ScheduledTask[];
  onRun: (id: string) => void;
  onStop: (id: string) => void;
  accentColor: string;
}

function TasksTab({ tasks, onRun, onStop, accentColor }: TasksTabProps) {
  const visibleTasks = tasks.filter((t) => !t.IsHidden);

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {visibleTasks.map((task) => (
        <View key={task.Id} style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{task.Name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 4 }} numberOfLines={2}>
                {task.Description}
              </Text>
            </View>
            {task.State === 'Running' ? (
              <Pressable onPress={() => onStop(task.Id)} style={{ backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '500' }}>Stop</Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => onRun(task.Id)} style={{ backgroundColor: `${accentColor}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ color: accentColor, fontSize: 12, fontWeight: '500' }}>Run</Text>
              </Pressable>
            )}
          </View>

          {task.State === 'Running' && task.CurrentProgressPercentage !== undefined && (
            <View style={{ marginTop: 12 }}>
              <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${task.CurrentProgressPercentage}%`, backgroundColor: accentColor, height: '100%' }} />
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 4 }}>
                {Math.round(task.CurrentProgressPercentage)}%
              </Text>
            </View>
          )}

          {task.LastExecutionResult && (
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 8 }}>
              Last: {task.LastExecutionResult.Status} · {formatRelativeTime(task.LastExecutionResult.EndTimeUtc)}
            </Text>
          )}
        </View>
      ))}

      {visibleTasks.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No scheduled tasks</Text>
        </View>
      )}
    </View>
  );
}

// Users Tab
interface UsersTabProps {
  users: UserInfo[];
  accentColor: string;
  onEnable: (userId: string) => void;
  onDisable: (userId: string) => void;
  onEdit: (user: UserInfo) => void;
  onCreateUser: () => void;
  currentUserId: string;
}

function UsersTab({ users, accentColor, onEnable, onDisable, onEdit, onCreateUser, currentUserId }: UsersTabProps) {
  const handleToggleUser = (user: UserInfo) => {
    if (user.Id === currentUserId) {
      Alert.alert('Error', 'You cannot disable yourself');
      return;
    }
    if (user.Policy.IsDisabled) {
      Alert.alert('Enable User', `Enable ${user.Name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Enable', onPress: () => onEnable(user.Id) },
      ]);
    } else {
      Alert.alert('Disable User', `Disable ${user.Name}? They will not be able to log in.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disable', style: 'destructive', onPress: () => onDisable(user.Id) },
      ]);
    }
  };

  return (
    <View style={{ paddingHorizontal: 16 }}>
      {/* Create User Button */}
      <Pressable
        onPress={onCreateUser}
        style={{
          backgroundColor: accentColor,
          borderRadius: 12,
          padding: 16,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>+ Create New User</Text>
      </Pressable>

      {users.map((user) => (
        <View key={user.Id} style={{ backgroundColor: colors.surface.default, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{user.Name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={{ color: '#fff', fontWeight: '500', fontSize: 14 }}>{user.Name}</Text>
                {user.Policy.IsAdministrator && (
                  <View style={{ backgroundColor: `${accentColor}20`, marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: accentColor, fontSize: 11 }}>Admin</Text>
                  </View>
                )}
                {user.Policy.IsDisabled && (
                  <View style={{ backgroundColor: 'rgba(239,68,68,0.2)', marginLeft: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: '#f87171', fontSize: 11 }}>Disabled</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 }}>
                {user.LastActivityDate ? `Active ${formatRelativeTime(user.LastActivityDate)}` : 'Never active'}
              </Text>
            </View>
          </View>

          {/* User Actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.background.primary }}>
            <Pressable
              onPress={() => onEdit(user)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: 'rgba(255,255,255,0.1)',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>Edit</Text>
            </Pressable>
            {user.Id !== currentUserId && (
              <Pressable
                onPress={() => handleToggleUser(user)}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 6,
                  backgroundColor: user.Policy.IsDisabled ? `${accentColor}20` : 'rgba(239,68,68,0.15)',
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: user.Policy.IsDisabled ? accentColor : '#f87171', fontSize: 13, fontWeight: '500' }}>
                  {user.Policy.IsDisabled ? 'Enable' : 'Disable'}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      ))}

      {users.length === 0 && (
        <View style={{ alignItems: 'center', paddingVertical: 48 }}>
          <Text style={{ color: 'rgba(255,255,255,0.4)' }}>No users found</Text>
        </View>
      )}
    </View>
  );
}

// Toggle Row Component
interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  accentColor: string;
  disabled?: boolean;
}

function ToggleRow({ label, description, value, onToggle, accentColor, disabled }: ToggleRowProps) {
  return (
    <Pressable
      onPress={() => !disabled && onToggle(!value)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <View style={{ flex: 1, marginRight: 12 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>{label}</Text>
        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 }}>{description}</Text>
      </View>
      <View
        style={{
          width: 50,
          height: 28,
          borderRadius: 14,
          backgroundColor: value ? accentColor : 'rgba(255,255,255,0.15)',
          justifyContent: 'center',
          padding: 2,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: '#fff',
            alignSelf: value ? 'flex-end' : 'flex-start',
          }}
        />
      </View>
    </Pressable>
  );
}

// Helper Components
function ActionButton({
  label,
  onPress,
  loading,
  color,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  color: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={{
        backgroundColor: colors.surface.default,
        borderColor: color,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        opacity: loading ? 0.7 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : (
        <Text style={{ color: '#fff', fontWeight: '500', fontSize: 13 }}>{label}</Text>
      )}
    </Pressable>
  );
}

function SmallButton({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)',
      }}
    >
      <Text style={{ color: danger ? '#f87171' : '#fff', fontSize: 11, fontWeight: '500' }}>{label}</Text>
    </Pressable>
  );
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
