import { View, Text, ScrollView, RefreshControl, TextInput, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { useState, useCallback, useMemo } from 'react';
import { SafeAreaView } from '@/providers';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight, SlideInUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { useSettingsStore, selectHasJellyseerr } from '@/stores/settingsStore';
import {
  useJellyseerrUser,
  useTrending,
  usePopularMovies,
  usePopularTv,
  useUpcomingMovies,
  useJellyseerrSearch,
  useAllRequests,
  usePendingRequests,
  useApproveRequest,
  useDeclineRequest,
  useDeleteRequest,
  useJellyseerrServerStatus,
  useJellyseerrAbout,
  useJellyseerrCacheStats,
  useFlushCache,
  useJellyseerrJobs,
  useRunJob,
  useCancelJob,
  useJellyfinSyncStatus,
  useStartJellyfinSync,
  useCancelJellyfinSync,
  useJellyseerrUsers,
  useJellyfinUsers,
  useCreateJellyseerrUser,
  useUpdateJellyseerrUser,
  useDeleteJellyseerrUser,
  useImportJellyfinUsers,
} from '@/hooks';
import { JellyseerrPosterCard, RequestCard } from '@/components/jellyseerr';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors } from '@/theme';
import type { JellyseerrDiscoverItem, JellyseerrMediaRequest, JellyseerrJob, JellyseerrUserDetails, JellyseerrJellyfinUser } from '@/types/jellyseerr';
import { hasPermission, JELLYSEERR_PERMISSIONS, REQUEST_STATUS, MEDIA_STATUS, getUserTypeLabel } from '@/types/jellyseerr';

const JELLYSEERR_PURPLE = '#6366f1';
const JELLYSEERR_PURPLE_DARK = '#4f46e5';

function isItemInLibrary(item: JellyseerrDiscoverItem): boolean {
  const status = item?.mediaInfo?.status;
  return status === MEDIA_STATUS.AVAILABLE || status === MEDIA_STATUS.PARTIALLY_AVAILABLE;
}

type TabType = 'discover' | 'requests' | 'users' | 'admin';
type FilterType = 'all' | 'pending' | 'approved' | 'available';
type UserTabType = 'users' | 'import';

function SettingsSection({
  title,
  children,
  delay = 0,
}: {
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.settingsSection}>
      <Text style={styles.settingsSectionTitle}>{title}</Text>
      {children}
    </Animated.View>
  );
}

function SettingsCard({
  icon,
  iconColor,
  title,
  subtitle,
  value,
  action,
  onAction,
  isLoading,
}: {
  icon: string;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string | number;
  action?: string;
  onAction?: () => void;
  isLoading?: boolean;
}) {
  return (
    <View style={styles.settingsCard}>
      <View style={[styles.settingsCardIcon, { backgroundColor: `${iconColor || JELLYSEERR_PURPLE}20` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor || JELLYSEERR_PURPLE} />
      </View>
      <View style={styles.settingsCardContent}>
        <Text style={styles.settingsCardTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingsCardSubtitle}>{subtitle}</Text>}
      </View>
      {value !== undefined && (
        <Text style={styles.settingsCardValue}>{value}</Text>
      )}
      {action && onAction && (
        <Pressable onPress={onAction} disabled={isLoading} style={styles.settingsCardAction}>
          {isLoading ? (
            <ActivityIndicator size="small" color={JELLYSEERR_PURPLE} />
          ) : (
            <Text style={styles.settingsCardActionText}>{action}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function JobCard({
  job,
  onRun,
  onCancel,
  isRunning,
}: {
  job: JellyseerrJob;
  onRun: () => void;
  onCancel: () => void;
  isRunning: boolean;
}) {
  const nextRun = new Date(job.nextExecutionTime);
  const isValidDate = !isNaN(nextRun.getTime());
  const nextRunText = isValidDate
    ? nextRun.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
    : 'N/A';

  return (
    <View style={styles.jobCard}>
      <View style={styles.jobCardHeader}>
        <View style={[styles.jobCardIcon, { backgroundColor: job.running ? '#22c55e20' : `${JELLYSEERR_PURPLE}20` }]}>
          <Ionicons
            name={job.running ? 'sync' : 'time-outline'}
            size={18}
            color={job.running ? '#22c55e' : JELLYSEERR_PURPLE}
          />
        </View>
        <View style={styles.jobCardContent}>
          <Text style={styles.jobCardTitle}>{job.name}</Text>
          <Text style={styles.jobCardSubtitle}>
            {job.running ? 'Running...' : `Next: ${nextRunText}`}
          </Text>
        </View>
        <Pressable
          onPress={job.running ? onCancel : onRun}
          disabled={isRunning}
          style={[styles.jobCardButton, job.running && styles.jobCardButtonCancel]}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={job.running ? 'stop' : 'play'}
                size={14}
                color="#fff"
              />
              <Text style={styles.jobCardButtonText}>
                {job.running ? 'Stop' : 'Run'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

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

function MediaRow({
  title,
  items,
  onItemPress,
  isLoading,
  delay = 0,
}: {
  title: string;
  items: JellyseerrDiscoverItem[];
  onItemPress: (item: JellyseerrDiscoverItem) => void;
  isLoading?: boolean;
  delay?: number;
}) {
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <View key={i} style={{ marginRight: 12 }}>
              <Skeleton width={130} height={195} borderRadius={12} />
            </View>
          ))
        ) : (
          items.slice(0, 15).map((item, index) => (
            <JellyseerrPosterCard
              key={`${item.mediaType}-${item.id}`}
              item={item}
              onPress={() => onItemPress(item)}
            />
          ))
        )}
      </ScrollView>
    </Animated.View>
  );
}

function FilterPill({
  label,
  isActive,
  count,
  onPress,
}: {
  label: string;
  isActive: boolean;
  count?: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={isActive ? [JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK] : ['transparent', 'transparent']}
        style={[styles.filterPill, !isActive && styles.filterPillInactive]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[styles.filterBadge, isActive && styles.filterBadgeActive]}>
            <Text style={styles.filterBadgeText}>{count}</Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  subtitle: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.emptyStateContainer}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
        style={styles.emptyStateGradient}
      >
        <View style={styles.emptyStateIconContainer}>
          <Ionicons name={icon as any} size={48} color={JELLYSEERR_PURPLE} />
        </View>
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>
        {action && onAction && (
          <Pressable onPress={onAction}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.emptyStateButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.emptyStateButtonText}>{action}</Text>
            </LinearGradient>
          </Pressable>
        )}
      </LinearGradient>
    </Animated.View>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  delay?: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(400)} style={styles.statCard}>
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
    </Animated.View>
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

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Permissions</Text>
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

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Request Quotas</Text>
                <Text style={styles.modalSectionSubtitle}>Leave empty for unlimited</Text>

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
              style={styles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder="user@example.com"
              placeholderTextColor={colors.text.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.formInput}
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

export default function RequestsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('discover');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [requestFilter, setRequestFilter] = useState<FilterType>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [activeUserTab, setActiveUserTab] = useState<UserTabType>('users');
  const [selectedUser, setSelectedUser] = useState<JellyseerrUserDetails | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedJellyfinUsers, setSelectedJellyfinUsers] = useState<Set<string>>(new Set());

  const hasJellyseerr = useSettingsStore(selectHasJellyseerr);
  const hideAvailable = useSettingsStore((s) => s.jellyseerrHideAvailable);
  const setHideAvailable = useSettingsStore((s) => s.setJellyseerrHideAvailable);

  const { data: user, refetch: refetchUser } = useJellyseerrUser();

  const { data: trending, refetch: refetchTrending, isLoading: loadingTrending } = useTrending();
  const { data: popularMovies, refetch: refetchPopularMovies, isLoading: loadingPopularMovies } = usePopularMovies();
  const { data: popularTv, refetch: refetchPopularTv, isLoading: loadingPopularTv } = usePopularTv();
  const { data: upcoming, refetch: refetchUpcoming, isLoading: loadingUpcoming } = useUpcomingMovies();
  const { data: searchResults, isLoading: isSearching } = useJellyseerrSearch(searchQuery);

  const {
    data: allRequests,
    refetch: refetchAllRequests,
    fetchNextPage: fetchNextAllRequests,
    hasNextPage: hasNextAllRequests,
    isFetchingNextPage: isFetchingNextAllRequests,
  } = useAllRequests(requestFilter);
  const { data: pendingRequests } = usePendingRequests();

  const {
    data: usersData,
    refetch: refetchUsers,
    fetchNextPage: fetchNextUsers,
    hasNextPage: hasNextUsers,
    isFetchingNextPage: isFetchingNextUsers,
    isLoading: isLoadingUsers,
  } = useJellyseerrUsers();
  const { data: jellyfinUsers, refetch: refetchJellyfinUsers, isLoading: isLoadingJellyfin } = useJellyfinUsers();

  const createUser = useCreateJellyseerrUser();
  const updateUser = useUpdateJellyseerrUser();
  const deleteJellyseerrUser = useDeleteJellyseerrUser();
  const importUsers = useImportJellyfinUsers();

  const allRequestsList = useMemo(
    () => allRequests?.pages.flatMap((p) => p.results) ?? [],
    [allRequests]
  );

  const users = useMemo(
    () => usersData?.pages.flatMap((p) => p.results) ?? [],
    [usersData]
  );

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return users;
    const query = userSearchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(query) ||
        u.username?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
    );
  }, [users, userSearchQuery]);

  const importedJellyfinUserIds = useMemo(() => {
    const ids = new Set<string>();
    users.forEach((u) => {
      if (u.jellyfinUserId) {
        ids.add(u.jellyfinUserId);
      }
    });
    return ids;
  }, [users]);

  const approveRequest = useApproveRequest();
  const declineRequest = useDeclineRequest();
  const deleteRequest = useDeleteRequest();

  const canManageRequests = user
    ? hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.MANAGE_REQUESTS)
    : false;

  const canManageUsers = user
    ? hasPermission(user.permissions, JELLYSEERR_PERMISSIONS.MANAGE_USERS)
    : false;

  const stats = useMemo(() => {
    const all = allRequests?.pages.flatMap((p) => p.results) ?? [];
    const pending = all.filter((r) => r.status === REQUEST_STATUS.PENDING).length;
    const approved = all.filter((r) => r.status === REQUEST_STATUS.APPROVED).length;
    const available = all.filter((r) => r.status === REQUEST_STATUS.AVAILABLE || r.status === REQUEST_STATUS.PARTIALLY_AVAILABLE).length;
    const processing = all.filter((r) => r.status === REQUEST_STATUS.APPROVED && r.media?.status === 3).length;
    return { pending, approved, available, processing };
  }, [allRequests]);

  const pendingCount = pendingRequests?.results?.length ?? stats.pending;

  const userStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => hasPermission(u.permissions, JELLYSEERR_PERMISSIONS.ADMIN)).length;
    const jellyfinCount = users.filter((u) => u.userType === 3).length;
    const localCount = users.filter((u) => u.userType === 2).length;
    return { total, admins, jellyfinCount, localCount };
  }, [users]);

  const tabs: { id: TabType; label: string; visible: boolean; badge?: number }[] = useMemo(() => [
    { id: 'discover', label: 'Discover', visible: true },
    { id: 'requests', label: 'Requests', visible: true, badge: pendingCount > 0 && canManageRequests ? pendingCount : undefined },
    { id: 'users', label: 'Users', visible: canManageUsers },
  ], [canManageRequests, canManageUsers, pendingCount]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refetchUser(),
      refetchTrending(),
      refetchPopularMovies(),
      refetchPopularTv(),
      refetchUpcoming(),
      refetchAllRequests(),
      refetchUsers(),
      refetchJellyfinUsers(),
    ]);
    setRefreshing(false);
  }, [refetchUser, refetchTrending, refetchPopularMovies, refetchPopularTv, refetchUpcoming, refetchAllRequests, refetchUsers, refetchJellyfinUsers]);

  const handleItemPress = (item: JellyseerrDiscoverItem) => {
    router.push(`/(tabs)/jellyseerr/${item.mediaType}/${item.id}?from=${encodeURIComponent('/(tabs)/requests')}`);
  };

  const handleRequestPress = (request: JellyseerrMediaRequest) => {
    router.push(`/(tabs)/jellyseerr/${request.type}/${request.media.tmdbId}?from=${encodeURIComponent('/(tabs)/requests')}`);
  };

  const handleApprove = (requestId: number) => {
    approveRequest.mutate(requestId);
  };

  const handleDelete = (requestId: number) => {
    deleteRequest.mutate(requestId);
  };

  const handleDecline = (requestId: number) => {
    declineRequest.mutate(requestId);
  };

  const handleEditUser = (userToEdit: JellyseerrUserDetails) => {
    setSelectedUser(userToEdit);
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

  const handleDeleteUser = (userToDelete: JellyseerrUserDetails) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userToDelete.displayName || userToDelete.username || userToDelete.email}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJellyseerrUser.mutateAsync(userToDelete.id);
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

  const filterItems = useCallback((items: JellyseerrDiscoverItem[]) => {
    if (!hideAvailable) return items;
    return items.filter((item) => !isItemInLibrary(item));
  }, [hideAvailable]);

  if (!hasJellyseerr) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={[`${JELLYSEERR_PURPLE}15`, 'transparent']}
          style={styles.headerGradient}
        />
        <View style={styles.notConnectedContainer}>
          <View style={styles.notConnectedIconContainer}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.notConnectedIconGradient}
            >
              <Ionicons name="film" size={48} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={styles.notConnectedTitle}>Jellyseerr</Text>
          <Text style={styles.notConnectedSubtitle}>
            Discover and request movies and TV shows from your media server
          </Text>
          <Pressable onPress={() => router.push('/settings/jellyseerr')}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.connectButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="link" size={18} color="#fff" />
              <Text style={styles.connectButtonText}>Connect Server</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const renderDiscoverContent = () => (
    <ScrollView
      style={{ flex: 1 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)} style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="rgba(255,255,255,0.4)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies and TV shows..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <View style={styles.clearButton}>
                <Ionicons name="close" size={14} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => setHideAvailable(!hideAvailable)}
          style={styles.filterToggle}
          hitSlop={8}
        >
          <Ionicons
            name={hideAvailable ? 'eye-off' : 'eye'}
            size={18}
            color={hideAvailable ? JELLYSEERR_PURPLE : 'rgba(255,255,255,0.4)'}
          />
          <Text style={[styles.filterToggleText, hideAvailable && styles.filterToggleTextActive]}>
            Hide Available
          </Text>
        </Pressable>
      </Animated.View>

      {searchQuery.length >= 2 ? (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Search Results</Text>
          {isSearching ? (
            <View style={styles.gridContainer}>
              {Array.from({ length: 6 }).map((_, i) => (
                <View key={i} style={{ marginRight: 12, marginBottom: 12 }}>
                  <Skeleton width={130} height={195} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : filterItems(searchResults?.results ?? []).length === 0 ? (
            <EmptyState
              icon="search-outline"
              title="No Results"
              subtitle={hideAvailable ? `No unavailable content found for "${searchQuery}"` : `No movies or shows found for "${searchQuery}"`}
            />
          ) : (
            <View style={styles.gridContainer}>
              {filterItems(searchResults?.results ?? []).map((item) => (
                <JellyseerrPosterCard
                  key={`${item.mediaType}-${item.id}`}
                  item={item}
                  onPress={() => handleItemPress(item)}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <>
          <MediaRow
            title="Trending Now"
            items={filterItems(trending?.results ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingTrending}
            delay={100}
          />

          <MediaRow
            title="Popular Movies"
            items={filterItems(popularMovies?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingPopularMovies}
            delay={200}
          />

          <MediaRow
            title="Popular TV Shows"
            items={filterItems(popularTv?.results?.map(item => ({ ...item, mediaType: 'tv' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingPopularTv}
            delay={300}
          />

          <MediaRow
            title="Coming Soon"
            items={filterItems(upcoming?.results?.map(item => ({ ...item, mediaType: 'movie' as const })) ?? [])}
            onItemPress={handleItemPress}
            isLoading={loadingUpcoming}
            delay={400}
          />
        </>
      )}

      <View style={{ height: 100 }} />
    </ScrollView>
  );

  const renderRequestsContent = () => (
    <View style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(300)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterPill
            label="All"
            isActive={requestFilter === 'all'}
            onPress={() => setRequestFilter('all')}
          />
          <FilterPill
            label="Pending"
            isActive={requestFilter === 'pending'}
            count={stats.pending}
            onPress={() => setRequestFilter('pending')}
          />
          <FilterPill
            label="Approved"
            isActive={requestFilter === 'approved'}
            onPress={() => setRequestFilter('approved')}
          />
          <FilterPill
            label="Available"
            isActive={requestFilter === 'available'}
            onPress={() => setRequestFilter('available')}
          />
        </ScrollView>
      </Animated.View>

      <FlatList
        data={allRequestsList}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(Math.min(index, 10) * 30).duration(300)}>
            <RequestCard
              request={item}
              onPress={() => handleRequestPress(item)}
              onDelete={() => handleDelete(item.id)}
              showActions={canManageRequests}
              userPermissions={user?.permissions ?? 0}
              onApprove={() => handleApprove(item.id)}
              onDecline={() => handleDecline(item.id)}
              isOwnRequest={item.requestedBy?.id === user?.id}
              isApproving={approveRequest.isPending && approveRequest.variables === item.id}
              isDeclining={declineRequest.isPending && declineRequest.variables === item.id}
              isDeleting={deleteRequest.isPending && deleteRequest.variables === item.id}
            />
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
        }
        onEndReached={() => {
          if (hasNextAllRequests && !isFetchingNextAllRequests) {
            fetchNextAllRequests();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextAllRequests ? (
            <View style={styles.loadingFooter}>
              <ActivityIndicator color={JELLYSEERR_PURPLE} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="film-outline"
            title="No Requests"
            subtitle={requestFilter === 'all' ? "No requests yet" : "No requests match this filter"}
            action={requestFilter === 'all' ? "Browse Content" : undefined}
            onAction={requestFilter === 'all' ? () => setActiveTab('discover') : undefined}
          />
        }
      />
    </View>
  );

  const renderUsersContent = () => {
    const userTabs = [
      { id: 'users' as const, label: 'Users', count: userStats.total },
      { id: 'import' as const, label: 'Import', icon: 'download-outline' },
    ];

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.userTabBar}>
          {userTabs.map((tab) => {
            const isActive = activeUserTab === tab.id;
            return (
              <Pressable key={tab.id} onPress={() => setActiveUserTab(tab.id)} style={styles.userTab}>
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

        {activeUserTab === 'users' && (
          <View style={{ flex: 1 }}>
            <Animated.View entering={FadeInDown.duration(300)} style={styles.userSearchContainer}>
              <View style={styles.userSearchInputContainer}>
                <Ionicons name="search" size={18} color={colors.text.muted} />
                <TextInput
                  style={styles.userSearchInput}
                  placeholder="Search users..."
                  placeholderTextColor={colors.text.muted}
                  value={userSearchQuery}
                  onChangeText={setUserSearchQuery}
                />
                {userSearchQuery.length > 0 && (
                  <Pressable onPress={() => setUserSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color={colors.text.muted} />
                  </Pressable>
                )}
              </View>
              <Pressable style={styles.addUserButton} onPress={() => setShowCreateModal(true)}>
                <LinearGradient
                  colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                  style={styles.addUserButtonGradient}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.userStatsContainer}
            >
              <StatCard icon="people" label="Total" value={userStats.total} color={JELLYSEERR_PURPLE} />
              <StatCard icon="shield" label="Admins" value={userStats.admins} color="#ef4444" />
              <StatCard icon="server" label="Jellyfin" value={userStats.jellyfinCount} color="#22c55e" />
              <StatCard icon="person" label="Local" value={userStats.localCount} color="#3b82f6" />
            </ScrollView>

            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item, index }) => (
                <UserCard
                  user={item}
                  onPress={() => handleEditUser(item)}
                  onDelete={() => handleDeleteUser(item)}
                  isCurrentUser={user?.id === item.id}
                  index={index}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={JELLYSEERR_PURPLE} />
              }
              onEndReached={() => {
                if (hasNextUsers && !isFetchingNextUsers) {
                  fetchNextUsers();
                }
              }}
              onEndReachedThreshold={0.5}
              ListFooterComponent={
                isFetchingNextUsers ? (
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
                  <EmptyState
                    icon="people-outline"
                    title="No Users Found"
                    subtitle={userSearchQuery ? 'Try a different search term' : 'No users in Jellyseerr'}
                  />
                )
              }
            />
          </View>
        )}

        {activeUserTab === 'import' && (
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
                  <EmptyState
                    icon="server-outline"
                    title="No Jellyfin Users"
                    subtitle="Could not fetch users from Jellyfin server"
                  />
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
        )}

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
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={[`${JELLYSEERR_PURPLE}20`, `${JELLYSEERR_PURPLE}05`, 'transparent']}
        style={styles.headerGradient}
      />

      <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
              style={styles.logoGradient}
            >
              <Ionicons name="film" size={16} color="#fff" />
            </LinearGradient>
          </View>
          <View>
            <Text style={styles.headerTitle}>Jellyseerr</Text>
            {user && (
              <Text style={styles.headerSubtitle}>Welcome, {user.displayName || user.username || 'User'}</Text>
            )}
          </View>
        </View>
      </Animated.View>

      <View style={styles.tabBar}>
        {tabs.filter((t) => t.visible).map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tab}>
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabText,
                    { color: isActive ? JELLYSEERR_PURPLE : colors.text.tertiary },
                  ]}
                >
                  {tab.label}
                </Text>
                {tab.badge !== undefined && (
                  <View style={[styles.tabBadge, { backgroundColor: JELLYSEERR_PURPLE }]}>
                    <Text style={styles.tabBadgeText}>{tab.badge}</Text>
                  </View>
                )}
              </View>
              {isActive && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <LinearGradient
                    colors={[JELLYSEERR_PURPLE, JELLYSEERR_PURPLE_DARK]}
                    style={styles.tabIndicator}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>
              )}
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'discover' && renderDiscoverContent()}
      {activeTab === 'requests' && renderRequestsContent()}
      {activeTab === 'users' && renderUsersContent()}
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
    height: 200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  logoGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.elevated,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 15,
  },
  clearButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
  },
  filterToggleText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13,
    fontWeight: '500',
  },
  filterToggleTextActive: {
    color: JELLYSEERR_PURPLE,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  horizontalScroll: {
    paddingHorizontal: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  filterPillInactive: {
    backgroundColor: colors.surface.default,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  filterPillTextActive: {
    color: '#fff',
  },
  filterBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
    flexGrow: 1,
  },
  loadingFooter: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateGradient: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 24,
    width: '100%',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: `${JELLYSEERR_PURPLE}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyStateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  notConnectedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  notConnectedIconContainer: {
    marginBottom: 24,
  },
  notConnectedIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notConnectedTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  notConnectedSubtitle: {
    color: colors.text.tertiary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 12,
  },
  connectButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  statCard: {
    minWidth: 78,
  },
  statCardGradient: {
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 2,
  },
  userTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 24,
  },
  userTab: {
    paddingBottom: 8,
  },
  userSearchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  userSearchInputContainer: {
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
  userSearchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  addUserButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addUserButtonGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userStatsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
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
  modalSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  modalSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalSectionSubtitle: {
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
  formInput: {
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
