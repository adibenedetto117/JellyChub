import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { SafeAreaView } from '@/providers';
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
import type { SessionInfo, UserInfo, UserPolicy } from '@/api/admin';
import { colors } from '@/theme';
import {
  TabType,
  ServerHealth,
  AccessDenied,
  AdminHeader,
  AdminTabBar,
  DashboardTab,
  StreamsTab,
  TasksTab,
  UsersTab,
  EditUserModal,
  CreateUserModal,
  getHiddenUserName,
} from '@/components/shared/admin';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [editedPolicy, setEditedPolicy] = useState<Partial<UserPolicy>>({});
  const [newPassword, setNewPassword] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');

  const currentUser = useAuthStore((state) => state.currentUser);
  const userId = currentUser?.Id ?? '';
  const accentColor = useSettingsStore((s) => s.accentColor);
  const hideMedia = useSettingsStore((s) => s.hideMedia);
  const isAdmin = currentUser?.Policy?.IsAdministrator;

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
    enabled: !!isAdmin,
    refetchInterval: 3000,
    staleTime: 0,
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: !!isAdmin && activeTab === 'users',
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: mediaFolders } = useQuery({
    queryKey: ['mediaFolders'],
    queryFn: getMediaFolders,
    enabled: !!isAdmin,
  });

  const { data: fullUserDetails, refetch: refetchFullUser } = useQuery({
    queryKey: ['fullUser', editingUser?.Id],
    queryFn: () => (editingUser ? getUserById(editingUser.Id) : null),
    enabled: !!editingUser?.Id,
  });

  useEffect(() => {
    if (activeTab === 'users' && isAdmin) {
      refetchUsers();
    }
  }, [activeTab, isAdmin, refetchUsers]);

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
    mutationFn: ({ oderId, policy }: { oderId: string; policy: Partial<UserPolicy> }) =>
      updateUserPolicy(oderId, policy),
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
    onError: () => Alert.alert('Error', 'Failed to send play command'),
  });

  const pauseMutation = useMutation({
    mutationFn: sendPauseCommand,
    onSuccess: () => refetchSessions(),
    onError: () => Alert.alert('Error', 'Failed to send pause command'),
  });

  const stopPlayMutation = useMutation({
    mutationFn: sendStopCommand,
    onSuccess: () => refetchSessions(),
    onError: () => Alert.alert('Error', 'Failed to send stop command'),
  });

  const activeSessions = useMemo(
    () => sessions?.filter((s) => s.NowPlayingItem) ?? [],
    [sessions]
  );

  const idleSessions = useMemo(
    () => sessions?.filter((s) => !s.NowPlayingItem) ?? [],
    [sessions]
  );

  const serverHealth = useMemo((): ServerHealth => {
    let directPlayCount = 0;
    let directStreamCount = 0;
    let transcodeCount = 0;
    let totalBandwidth = 0;

    activeSessions.forEach((session) => {
      const method = session.PlayState?.PlayMethod;
      if (method === 'DirectPlay') directPlayCount++;
      else if (method === 'DirectStream') directStreamCount++;
      else if (method === 'Transcode') transcodeCount++;

      if (session.TranscodingInfo?.Bitrate) {
        totalBandwidth += session.TranscodingInfo.Bitrate;
      }
    });

    return {
      activeSessions: activeSessions.length,
      activeTranscodes: transcodeCount,
      totalBandwidth,
      directPlayCount,
      directStreamCount,
      transcodeCount,
    };
  }, [activeSessions]);

  const runningTasks = useMemo(
    () => scheduledTasks?.filter((t) => t.State === 'Running') ?? [],
    [scheduledTasks]
  );

  const libraryScanTask = useMemo(
    () =>
      scheduledTasks?.find(
        (t) =>
          t.Key === 'RefreshLibrary' ||
          t.Name.toLowerCase().includes('scan') ||
          t.Name.toLowerCase().includes('library')
      ),
    [scheduledTasks]
  );

  const tabs = useMemo(
    () => [
      { id: 'dashboard' as TabType, label: 'Dashboard' },
      { id: 'streams' as TabType, label: 'Streams', badge: activeSessions.length || undefined },
      { id: 'tasks' as TabType, label: 'Tasks', badge: runningTasks.length || undefined },
      { id: 'users' as TabType, label: 'Users' },
    ],
    [activeSessions.length, runningTasks.length]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchSystemInfo(),
      refetchSessions(),
      refetchItemCounts(),
      refetchActivityLog(),
      refetchTasks(),
      activeTab === 'users' ? refetchUsers() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }, [refetchSystemInfo, refetchSessions, refetchItemCounts, refetchActivityLog, refetchTasks, activeTab, refetchUsers]);

  const handleKillStream = useCallback(
    (session: SessionInfo) => {
      Alert.alert(
        'Kill Stream',
        `Stop ${hideMedia ? getHiddenUserName(0) : session.UserName}'s playback and disconnect their device?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Kill Stream',
            style: 'destructive',
            onPress: () => stopSessionMutation.mutate(session.DeviceId),
          },
        ]
      );
    },
    [hideMedia, stopSessionMutation]
  );

  const handleRestartServer = useCallback(() => {
    Alert.alert('Restart Server', 'All active streams will be interrupted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', style: 'destructive', onPress: () => restartServerMutation.mutate() },
    ]);
  }, [restartServerMutation]);

  const handleShutdownServer = useCallback(() => {
    Alert.alert('Shutdown Server', 'This will stop the Jellyfin server completely.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Shutdown', style: 'destructive', onPress: () => shutdownServerMutation.mutate() },
    ]);
  }, [shutdownServerMutation]);

  const handleEditUser = useCallback((user: UserInfo) => {
    setEditingUser(user);
    setEditedPolicy({});
  }, []);

  const handleCloseEditUser = useCallback(() => {
    setEditingUser(null);
    setNewPassword('');
    setEditedPolicy({});
  }, []);

  const handleCloseCreateUser = useCallback(() => {
    setShowCreateUser(false);
    setNewUserName('');
    setNewUserPassword('');
  }, []);

  if (!isAdmin) {
    return <AccessDenied accentColor={accentColor} />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.primary }} edges={['top']}>
      <AdminHeader serverName={systemInfo?.ServerName} />

      <AdminTabBar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accentColor={accentColor}
      />

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            systemInfo={systemInfo}
            itemCounts={itemCounts}
            activityLog={activityLog?.Items}
            serverHealth={serverHealth}
            runningTasks={runningTasks}
            libraryScanTask={libraryScanTask}
            activeSessions={activeSessions}
            onRefreshLibrary={() => refreshLibraryMutation.mutate()}
            onRestartServer={handleRestartServer}
            onShutdownServer={handleShutdownServer}
            isRefreshing={refreshLibraryMutation.isPending}
            accentColor={accentColor}
            hideMedia={hideMedia}
          />
        )}

        {activeTab === 'streams' && (
          <StreamsTab
            activeSessions={activeSessions}
            idleSessions={idleSessions}
            onKillStream={handleKillStream}
            onStopPlayback={(s) => stopPlayMutation.mutate(s.Id)}
            onPlay={(s) => playMutation.mutate(s.Id)}
            onPause={(s) => pauseMutation.mutate(s.Id)}
            accentColor={accentColor}
            hideMedia={hideMedia}
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
            onEdit={handleEditUser}
            onCreateUser={() => setShowCreateUser(true)}
            currentUserId={userId}
            hideMedia={hideMedia}
          />
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <EditUserModal
        visible={!!editingUser}
        editingUser={editingUser}
        fullUserDetails={fullUserDetails ?? null}
        editedPolicy={editedPolicy}
        setEditedPolicy={setEditedPolicy}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        onClose={handleCloseEditUser}
        onResetPassword={(id, password) => resetPasswordMutation.mutate({ oderId: id, password })}
        onUpdatePolicy={(id, policy) => updatePolicyMutation.mutate({ oderId: id, policy })}
        onDeleteUser={(id) => deleteUserMutation.mutate(id)}
        isResetPasswordPending={resetPasswordMutation.isPending}
        isUpdatePolicyPending={updatePolicyMutation.isPending}
        isDeleteUserPending={deleteUserMutation.isPending}
        mediaFolders={mediaFolders ?? []}
        currentUserId={userId}
        accentColor={accentColor}
        users={users ?? []}
        hideMedia={hideMedia}
      />

      <CreateUserModal
        visible={showCreateUser}
        newUserName={newUserName}
        setNewUserName={setNewUserName}
        newUserPassword={newUserPassword}
        setNewUserPassword={setNewUserPassword}
        onClose={handleCloseCreateUser}
        onCreate={(name, password) => createUserMutation.mutate({ name, password })}
        isPending={createUserMutation.isPending}
        accentColor={accentColor}
      />
    </SafeAreaView>
  );
}
