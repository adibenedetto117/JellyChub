import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from '@/providers';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight, SlideInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import {
  useJellyseerrUser,
  useJellyseerrUsers,
  useJellyfinUsers,
  useCreateJellyseerrUser,
  useUpdateJellyseerrUser,
  useDeleteJellyseerrUser,
  useImportJellyfinUsers,
} from '@/hooks';
import {
  JELLYSEERR_PERMISSIONS,
  hasPermission,
  getUserTypeLabel,
  type JellyseerrUserDetails,
  type JellyseerrJellyfinUser,
} from '@/types/jellyseerr';
import { colors } from '@/theme';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

type TabType = 'users' | 'import';

interface PermissionToggle {
  key: keyof typeof JELLYSEERR_PERMISSIONS;
  label: string;
  description: string;
}

const PERMISSION_TOGGLES: PermissionToggle[] = [
  { key: 'ADMIN', label: 'Admin', description: 'Full access to all features' },
  { key: 'MANAGE_USERS', label: 'Manage Users', description: 'Add, edit, and remove users' },
  { key: 'MANAGE_REQUESTS', label: 'Manage Requests', description: 'Approve or decline requests' },
  { key: 'REQUEST', label: 'Request', description: 'Submit media requests' },
  { key: 'REQUEST_4K', label: 'Request 4K', description: 'Request 4K content' },
  { key: 'AUTO_APPROVE', label: 'Auto Approve', description: 'Requests are auto-approved' },
  { key: 'AUTO_APPROVE_4K', label: 'Auto Approve 4K', description: '4K requests are auto-approved' },
];

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[`${color}20`, `${color}08`]}
        style={styles.statCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={[styles.statIconContainer, { backgroundColor: `${color}25` }]}>
          <Ionicons name={icon as any} size={18} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </LinearGradient>
    </View>
  );
}

function UserCard({
  user,
  onPress,
  onDelete,
  isCurrentUser,
  index,
}: {
  user: JellyseerrUserDetails;
  onPress: () => void;
  onDelete: () => void;
  isCurrentUser: boolean;
  index: number;
}) {
  const isAdmin = hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.ADMIN);

  return (
    <Animated.View entering={FadeInRight.delay(index * 50).duration(300)}>
      <Pressable
        style={({ pressed }) => [styles.userCard, pressed && { opacity: 0.9 }]}
        onPress={onPress}
      >
        <View style={styles.userCardContent}>
          <View style={styles.avatarContainer}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} contentFit="cover" />
            ) : (
              <LinearGradient
                colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                style={styles.avatarPlaceholder}
              >
                <Text style={styles.avatarInitial}>
                  {(user.displayName || user.username || user.email || 'U')[0].toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            {isAdmin && (
              <View style={styles.adminBadge}>
                <Ionicons name="shield" size={10} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <View style={styles.userNameRow}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.displayName || user.username || user.email}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>You</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.userMeta}>
              <View style={styles.userTypeBadge}>
                <Ionicons
                  name={user.userType === 3 ? 'server-outline' : 'person-outline'}
                  size={10}
                  color={colors.text.tertiary}
                />
                <Text style={styles.userTypeText}>{getUserTypeLabel(user.userType)}</Text>
              </View>
              <Text style={styles.requestCount}>
                {user.requestCount} request{user.requestCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          <View style={styles.userActions}>
            {!isCurrentUser && !isAdmin && (
              <Pressable
                style={styles.deleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                hitSlop={8}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </Pressable>
            )}
            <Ionicons name="chevron-forward" size={18} color={colors.text.muted} />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function JellyfinUserCard({
  user,
  isImported,
  isSelected,
  onToggle,
  index,
}: {
  user: JellyseerrJellyfinUser;
  isImported: boolean;
  isSelected: boolean;
  onToggle: () => void;
  index: number;
}) {
  return (
    <Animated.View entering={FadeInRight.delay(index * 30).duration(300)}>
      <Pressable
        style={({ pressed }) => [
          styles.jellyfinUserCard,
          isImported && styles.jellyfinUserCardImported,
          isSelected && styles.jellyfinUserCardSelected,
          pressed && { opacity: 0.9 },
        ]}
        onPress={onToggle}
        disabled={isImported}
      >
        <View style={styles.jellyfinUserContent}>
          <View
            style={[
              styles.jellyfinCheckbox,
              isImported && styles.jellyfinCheckboxDisabled,
              isSelected && styles.jellyfinCheckboxSelected,
            ]}
          >
            {isImported ? (
              <Ionicons name="checkmark" size={14} color={colors.text.muted} />
            ) : isSelected ? (
              <Ionicons name="checkmark" size={14} color="#fff" />
            ) : null}
          </View>
          <View style={styles.jellyfinUserInfo}>
            <Text style={[styles.jellyfinUserName, isImported && { color: colors.text.muted }]}>
              {user.name}
            </Text>
            {isImported && <Text style={styles.importedLabel}>Already imported</Text>}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function EditUserModal({
  visible,
  user,
  onClose,
  onSave,
  isSaving,
}: {
  visible: boolean;
  user: JellyseerrUserDetails | null;
  onClose: () => void;
  onSave: (permissions: number, quotas: { movieLimit?: number; movieDays?: number; tvLimit?: number; tvDays?: number }) => void;
  isSaving: boolean;
}) {
  const [permissions, setPermissions] = useState(user?.permissions ?? 0);
  const [movieQuotaLimit, setMovieQuotaLimit] = useState(user?.movieQuotaLimit?.toString() ?? '');
  const [movieQuotaDays, setMovieQuotaDays] = useState(user?.movieQuotaDays?.toString() ?? '');
  const [tvQuotaLimit, setTvQuotaLimit] = useState(user?.tvQuotaLimit?.toString() ?? '');
  const [tvQuotaDays, setTvQuotaDays] = useState(user?.tvQuotaDays?.toString() ?? '');

  const togglePermission = (perm: number) => {
    if (permissions & perm) {
      setPermissions(permissions & ~perm);
    } else {
      setPermissions(permissions | perm);
    }
  };

  const handleSave = () => {
    onSave(permissions, {
      movieLimit: movieQuotaLimit ? parseInt(movieQuotaLimit, 10) : undefined,
      movieDays: movieQuotaDays ? parseInt(movieQuotaDays, 10) : undefined,
      tvLimit: tvQuotaLimit ? parseInt(tvQuotaLimit, 10) : undefined,
      tvDays: tvQuotaDays ? parseInt(tvQuotaDays, 10) : undefined,
    });
  };

  if (!user) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={SlideInUp.springify()} style={styles.modalContent}>
          <LinearGradient
            colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
            style={styles.modalGradient}
          />
          <SafeAreaView style={styles.modalSafeArea} edges={['bottom']}>
            <View style={styles.modalHeader}>
              <Pressable onPress={onClose} style={styles.modalCloseButton}>
                <BlurView intensity={30} style={styles.blurButton}>
                  <Ionicons name="close" size={24} color="#fff" />
                </BlurView>
              </Pressable>
              <Text style={styles.modalTitle}>Edit User</Text>
              <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalUserHeader}>
                <View style={styles.modalAvatarContainer}>
                  {user.avatar ? (
                    <Image source={{ uri: user.avatar }} style={styles.modalAvatar} contentFit="cover" />
                  ) : (
                    <LinearGradient
                      colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                      style={styles.modalAvatarPlaceholder}
                    >
                      <Text style={styles.modalAvatarInitial}>
                        {(user.displayName || user.username || user.email || 'U')[0].toUpperCase()}
                      </Text>
                    </LinearGradient>
                  )}
                </View>
                <Text style={styles.modalUserName}>{user.displayName || user.username || user.email}</Text>
                <Text style={styles.modalUserEmail}>{user.email}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Permissions</Text>
                {PERMISSION_TOGGLES.map((perm) => {
                  const permValue = JELLYSEERR_PERMISSIONS[perm.key];
                  const isEnabled = (permissions & permValue) === permValue;
                  return (
                    <Pressable
                      key={perm.key}
                      style={styles.permissionRow}
                      onPress={() => togglePermission(permValue)}
                    >
                      <View style={styles.permissionInfo}>
                        <Text style={styles.permissionLabel}>{perm.label}</Text>
                        <Text style={styles.permissionDescription}>{perm.description}</Text>
                      </View>
                      <View
                        style={[
                          styles.permissionToggle,
                          isEnabled && { backgroundColor: JELLYSEERR_PURPLE },
                        ]}
                      >
                        {isEnabled && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Request Quotas</Text>
                <Text style={styles.sectionSubtitle}>Leave empty for unlimited</Text>

                <View style={styles.quotaRow}>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaLabel}>Movie Limit</Text>
                    <TextInput
                      style={styles.quotaInput}
                      value={movieQuotaLimit}
                      onChangeText={setMovieQuotaLimit}
                      placeholder="Unlimited"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaLabel}>Per Days</Text>
                    <TextInput
                      style={styles.quotaInput}
                      value={movieQuotaDays}
                      onChangeText={setMovieQuotaDays}
                      placeholder="7"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <View style={styles.quotaRow}>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaLabel}>TV Limit</Text>
                    <TextInput
                      style={styles.quotaInput}
                      value={tvQuotaLimit}
                      onChangeText={setTvQuotaLimit}
                      placeholder="Unlimited"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                  <View style={styles.quotaItem}>
                    <Text style={styles.quotaLabel}>Per Days</Text>
                    <TextInput
                      style={styles.quotaInput}
                      value={tvQuotaDays}
                      onChangeText={setTvQuotaDays}
                      placeholder="7"
                      placeholderTextColor={colors.text.muted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: 100 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </Pressable>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function CreateUserModal({
  visible,
  onClose,
  onCreate,
  isCreating,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (email: string, username?: string) => void;
  isCreating: boolean;
}) {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');

  const handleCreate = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Email is required');
      return;
    }
    onCreate(email.trim(), username.trim() || undefined);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <Animated.View entering={SlideInUp.springify()} style={styles.createModalContent}>
          <View style={styles.modalHeader}>
            <Pressable onPress={onClose} style={styles.modalCloseButton}>
              <View style={styles.closeButtonCircle}>
                <Ionicons name="close" size={20} color="#fff" />
              </View>
            </Pressable>
            <Text style={styles.modalTitle}>Create Local User</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.createForm}>
            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Optional"
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
            />
          </View>

          <Pressable
            style={[styles.createButton, isCreating && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={isCreating}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>Create User</Text>
            )}
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function JellyseerrUsersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<JellyseerrUserDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJellyfinUsers, setSelectedJellyfinUsers] = useState<Set<string>>(new Set());

  const { data: currentUser } = useJellyseerrUser();
  const {
    data: usersData,
    refetch: refetchUsers,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingUsers,
  } = useJellyseerrUsers();
  const { data: jellyfinUsers, refetch: refetchJellyfinUsers, isLoading: isLoadingJellyfin } = useJellyfinUsers();

  const createUser = useCreateJellyseerrUser();
  const updateUser = useUpdateJellyseerrUser();
  const deleteUser = useDeleteJellyseerrUser();
  const importUsers = useImportJellyfinUsers();

  const users = useMemo(
    () => usersData?.pages.flatMap((p) => p.results) ?? [],
    [usersData]
  );

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const importedJellyfinUserIds = useMemo(() => {
    const ids = new Set<string>();
    users.forEach((u) => {
      if (u.jellyfinUserId) {
        ids.add(u.jellyfinUserId);
      }
    });
    return ids;
  }, [users]);

  const canManageUsers = currentUser
    ? hasPermission(currentUser.permissions, JELLYSEERR_PERMISSIONS.MANAGE_USERS)
    : false;

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => hasPermission(u.permissions, JELLYSEERR_PERMISSIONS.ADMIN)).length;
    const jellyfinCount = users.filter((u) => u.userType === 3).length;
    const localCount = users.filter((u) => u.userType === 2).length;
    return { total, admins, jellyfinCount, localCount };
  }, [users]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchUsers(), refetchJellyfinUsers()]);
    setRefreshing(false);
  }, [refetchUsers, refetchJellyfinUsers]);

  const handleEditUser = (user: JellyseerrUserDetails) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async (
    permissions: number,
    quotas: { movieLimit?: number; movieDays?: number; tvLimit?: number; tvDays?: number }
  ) => {
    if (!selectedUser) return;

    try {
      await updateUser.mutateAsync({
        userId: selectedUser.id,
        body: {
          permissions,
          movieQuotaLimit: quotas.movieLimit,
          movieQuotaDays: quotas.movieDays,
          tvQuotaLimit: quotas.tvLimit,
          tvQuotaDays: quotas.tvDays,
        },
      });
      setShowEditModal(false);
      setSelectedUser(null);
      Alert.alert('Success', 'User updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to update user');
    }
  };

  const handleDeleteUser = (user: JellyseerrUserDetails) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.displayName || user.username || user.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser.mutateAsync(user.id);
              Alert.alert('Success', 'User deleted');
            } catch (error: any) {
              Alert.alert('Error', error?.message ?? 'Failed to delete user');
            }
          },
        },
      ]
    );
  };

  const handleCreateUser = async (email: string, username?: string) => {
    try {
      await createUser.mutateAsync({ email, username });
      setShowCreateModal(false);
      Alert.alert('Success', 'User created successfully');
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to create user');
    }
  };

  const handleToggleJellyfinUser = (userId: string) => {
    setSelectedJellyfinUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleImportUsers = async () => {
    if (selectedJellyfinUsers.size === 0) {
      Alert.alert('Error', 'Please select at least one user to import');
      return;
    }

    try {
      const imported = await importUsers.mutateAsync(Array.from(selectedJellyfinUsers));
      setSelectedJellyfinUsers(new Set());
      Alert.alert('Success', `Imported ${imported.length} user(s)`);
    } catch (error: any) {
      Alert.alert('Error', error?.message ?? 'Failed to import users');
    }
  };

  const tabs = [
    { id: 'users' as const, label: 'Users', count: stats.total },
    { id: 'import' as const, label: 'Import', icon: 'download-outline' },
  ];

  const renderUsersContent = () => (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={colors.text.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor={colors.text.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.text.muted} />
            </Pressable>
          )}
        </View>
        {canManageUsers && (
          <Pressable style={styles.addButton} onPress={() => setShowCreateModal(true)}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.addButtonGradient}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
      </Animated.View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsContainer}
      >
        <StatCard icon="people" label="Total" value={stats.total} color={JELLYSEERR_PURPLE} />
        <StatCard icon="shield" label="Admins" value={stats.admins} color="#ef4444" />
        <StatCard icon="server" label="Jellyfin" value={stats.jellyfinCount} color="#22c55e" />
        <StatCard icon="person" label="Local" value={stats.localCount} color="#3b82f6" />
      </ScrollView>

      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <UserCard
            user={item}
            onPress={() => canManageUsers && handleEditUser(item)}
            onDelete={() => handleDeleteUser(item)}
            isCurrentUser={currentUser?.id === item.id}
            index={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
        }
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={JELLYSEERR_PURPLE} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoadingUsers ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={JELLYSEERR_PURPLE} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'No users in Jellyseerr'}
              </Text>
            </View>
          )
        }
      />
    </View>
  );

  const renderImportContent = () => (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(300)} style={styles.importHeader}>
        <View style={styles.importHeaderIcon}>
          <Ionicons name="cloud-download" size={20} color={JELLYSEERR_PURPLE} />
        </View>
        <View style={styles.importHeaderText}>
          <Text style={styles.importTitle}>Import from Jellyfin</Text>
          <Text style={styles.importSubtitle}>
            Select users from your Jellyfin server to import into Jellyseerr
          </Text>
        </View>
      </Animated.View>

      <FlatList
        data={jellyfinUsers ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <JellyfinUserCard
            user={item}
            isImported={importedJellyfinUserIds.has(item.id)}
            isSelected={selectedJellyfinUsers.has(item.id)}
            onToggle={() => handleToggleJellyfinUser(item.id)}
            index={index}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
        }
        ListEmptyComponent={
          isLoadingJellyfin ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={JELLYSEERR_PURPLE} size="large" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="server-outline" size={48} color={colors.text.muted} />
              <Text style={styles.emptyTitle}>No Jellyfin Users</Text>
              <Text style={styles.emptySubtitle}>
                Could not fetch users from Jellyfin server
              </Text>
            </View>
          )
        }
      />

      {selectedJellyfinUsers.size > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.importFooter}>
          <Pressable
            style={[styles.importButton, importUsers.isPending && { opacity: 0.7 }]}
            onPress={handleImportUsers}
            disabled={importUsers.isPending}
          >
            {importUsers.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="download" size={18} color="#fff" />
                <Text style={styles.importButtonText}>
                  Import {selectedJellyfinUsers.size} User{selectedJellyfinUsers.size > 1 ? 's' : ''}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'User Management',
          headerStyle: { backgroundColor: colors.background.primary },
          headerTintColor: '#fff',
          headerBackTitle: 'Jellyseerr',
        }}
      />

      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
        style={styles.headerGradient}
      />

      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
              <View style={styles.tabContent}>
                {tab.icon && (
                  <Ionicons
                    name={tab.icon as any}
                    size={16}
                    color={isActive ? JELLYSEERR_PURPLE : colors.text.tertiary}
                  />
                )}
                <Text style={[styles.tabText, { color: isActive ? JELLYSEERR_PURPLE : colors.text.tertiary }]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && (
                  <View style={[styles.tabBadge, { backgroundColor: JELLYSEERR_PURPLE }]}>
                    <Text style={styles.tabBadgeText}>{tab.count}</Text>
                  </View>
                )}
              </View>
              {isActive && (
                <LinearGradient
                  colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                  style={styles.tabIndicator}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'users' && renderUsersContent()}
      {activeTab === 'import' && renderImportContent()}

      <EditUserModal
        visible={showEditModal}
        user={selectedUser}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        onSave={handleSaveUser}
        isSaving={updateUser.isPending}
      />

      <CreateUserModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateUser}
        isCreating={createUser.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tabIndicator: {
    height: 3,
    borderRadius: 1.5,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  statCard: {
    width: 90,
  },
  statCardGradient: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
    flexGrow: 1,
  },
  userCard: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    overflow: 'hidden',
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  adminBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background.primary,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  youBadge: {
    backgroundColor: `${JELLYSEERR_PURPLE}30`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  youBadgeText: {
    color: JELLYSEERR_PURPLE,
    fontSize: 10,
    fontWeight: '600',
  },
  userEmail: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 2,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 10,
  },
  userTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface.elevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  userTypeText: {
    color: colors.text.tertiary,
    fontSize: 11,
    fontWeight: '500',
  },
  requestCount: {
    color: colors.text.muted,
    fontSize: 12,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtitle: {
    color: colors.text.muted,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  importHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${JELLYSEERR_PURPLE}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importHeaderText: {
    flex: 1,
  },
  importTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  importSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 2,
  },
  jellyfinUserCard: {
    backgroundColor: colors.surface.default,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  jellyfinUserCardImported: {
    opacity: 0.5,
  },
  jellyfinUserCardSelected: {
    borderColor: JELLYSEERR_PURPLE,
    backgroundColor: `${JELLYSEERR_PURPLE}10`,
  },
  jellyfinUserContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  jellyfinCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jellyfinCheckboxDisabled: {
    backgroundColor: colors.surface.elevated,
    borderColor: colors.surface.elevated,
  },
  jellyfinCheckboxSelected: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderColor: JELLYSEERR_PURPLE,
  },
  jellyfinUserInfo: {
    flex: 1,
  },
  jellyfinUserName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  importedLabel: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  importFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: JELLYSEERR_PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  createModalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  modalSafeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeButtonCircle: {
    flex: 1,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: 20,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalUserHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  modalAvatarContainer: {
    marginBottom: 12,
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  modalAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarInitial: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '600',
  },
  modalUserName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  modalUserEmail: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  permissionDescription: {
    color: colors.text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  permissionToggle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quotaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quotaItem: {
    flex: 1,
  },
  quotaLabel: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginBottom: 6,
  },
  quotaInput: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  modalFooter: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  saveButton: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createForm: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputLabel: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.surface.elevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  createButton: {
    backgroundColor: JELLYSEERR_PURPLE,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
