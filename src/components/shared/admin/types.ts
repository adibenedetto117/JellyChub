import type { SystemInfo, SessionInfo, ItemCounts, ActivityLogEntry, ScheduledTask, UserInfo, UserPolicy, MediaFolder } from '@/api/admin';

export type TabType = 'dashboard' | 'streams' | 'tasks' | 'users';

export interface ServerHealth {
  activeSessions: number;
  activeTranscodes: number;
  totalBandwidth: number;
  directPlayCount: number;
  directStreamCount: number;
  transcodeCount: number;
}

export interface DashboardTabProps {
  systemInfo?: SystemInfo;
  itemCounts?: ItemCounts;
  activityLog?: ActivityLogEntry[];
  serverHealth: ServerHealth;
  runningTasks: ScheduledTask[];
  libraryScanTask?: ScheduledTask;
  activeSessions: SessionInfo[];
  onRefreshLibrary: () => void;
  onRestartServer: () => void;
  onShutdownServer: () => void;
  isRefreshing: boolean;
  accentColor: string;
  hideMedia: boolean;
}

export interface NowPlayingRowProps {
  session: SessionInfo;
  hideMedia: boolean;
  userIndex: number;
  accentColor: string;
  isLast: boolean;
}

export interface StreamsTabProps {
  activeSessions: SessionInfo[];
  idleSessions: SessionInfo[];
  onKillStream: (session: SessionInfo) => void;
  onStopPlayback: (session: SessionInfo) => void;
  onPlay: (session: SessionInfo) => void;
  onPause: (session: SessionInfo) => void;
  accentColor: string;
  hideMedia: boolean;
}

export interface StreamCardProps {
  session: SessionInfo;
  onKillStream: () => void;
  onStopPlayback: () => void;
  onPlay: () => void;
  onPause: () => void;
  accentColor: string;
  hideMedia: boolean;
  userIndex: number;
}

export interface TasksTabProps {
  tasks: ScheduledTask[];
  onRun: (id: string) => void;
  onStop: (id: string) => void;
  accentColor: string;
}

export interface TaskCardProps {
  task: ScheduledTask;
  onRun: () => void;
  onStop: () => void;
  accentColor: string;
}

export interface UsersTabProps {
  users: UserInfo[];
  accentColor: string;
  onEnable: (userId: string) => void;
  onDisable: (userId: string) => void;
  onEdit: (user: UserInfo) => void;
  onCreateUser: () => void;
  currentUserId: string;
  hideMedia: boolean;
}

export interface ToggleRowProps {
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  accentColor: string;
  disabled?: boolean;
}

export interface StatBoxProps {
  label: string;
  value: number;
  color: string;
}

export interface ActionButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  color: string;
  disabled?: boolean;
}

export interface TranscodeDetailProps {
  label: string;
  value: string;
  direct?: boolean;
}

export interface EditUserModalProps {
  visible: boolean;
  editingUser: UserInfo | null;
  fullUserDetails: UserInfo | null;
  editedPolicy: Partial<UserPolicy>;
  setEditedPolicy: React.Dispatch<React.SetStateAction<Partial<UserPolicy>>>;
  newPassword: string;
  setNewPassword: (password: string) => void;
  onClose: () => void;
  onResetPassword: (userId: string, password: string) => void;
  onUpdatePolicy: (userId: string, policy: Partial<UserPolicy>) => void;
  onDeleteUser: (userId: string) => void;
  isResetPasswordPending: boolean;
  isUpdatePolicyPending: boolean;
  isDeleteUserPending: boolean;
  mediaFolders: MediaFolder[];
  currentUserId: string;
  accentColor: string;
  users: UserInfo[];
  hideMedia: boolean;
}

export interface CreateUserModalProps {
  visible: boolean;
  newUserName: string;
  setNewUserName: (name: string) => void;
  newUserPassword: string;
  setNewUserPassword: (password: string) => void;
  onClose: () => void;
  onCreate: (name: string, password?: string) => void;
  isPending: boolean;
  accentColor: string;
}
