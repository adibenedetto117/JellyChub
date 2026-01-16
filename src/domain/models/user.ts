import type { MediaProvider } from './media';

export interface User {
  id: string;
  name: string;
  serverId: string;
  provider: MediaProvider;

  imageUrl?: string;
  email?: string;

  isAdmin: boolean;
  isDisabled: boolean;

  lastLoginAt?: string;
  lastActivityAt?: string;

  permissions: UserPermissions;
}

export interface UserPermissions {
  canManageServer: boolean;
  canManageUsers: boolean;
  canManageMedia: boolean;
  canDownload: boolean;
  canSyncContent: boolean;
  canRemoteControl: boolean;
  canDeleteMedia: boolean;
  canEditMetadata: boolean;
  maxBitrate?: number;
  allowedLibraries?: string[];
}

export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  deviceName: string;
  clientName: string;
  clientVersion?: string;

  remoteAddress?: string;
  lastActivityAt: string;

  nowPlayingItem?: {
    id: string;
    name: string;
    type: string;
  };
  playState?: {
    positionMs: number;
    isPaused: boolean;
    isMuted: boolean;
    volumePercent?: number;
  };
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  canManageServer: false,
  canManageUsers: false,
  canManageMedia: false,
  canDownload: true,
  canSyncContent: true,
  canRemoteControl: true,
  canDeleteMedia: false,
  canEditMetadata: false,
};
