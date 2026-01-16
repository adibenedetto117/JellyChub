import type { ValidatedJellyfinUser, ValidatedUserPolicy } from '@/domain/schemas/jellyfin';
import type { User, UserPermissions, DEFAULT_PERMISSIONS } from '@/domain/models';

export interface UserAdapterOptions {
  serverId: string;
  baseUrl?: string;
}

function adaptPermissions(policy?: ValidatedUserPolicy): UserPermissions {
  if (!policy) {
    return {
      canManageServer: false,
      canManageUsers: false,
      canManageMedia: false,
      canDownload: true,
      canSyncContent: true,
      canRemoteControl: true,
      canDeleteMedia: false,
      canEditMetadata: false,
    };
  }

  return {
    canManageServer: policy.IsAdministrator ?? false,
    canManageUsers: policy.IsAdministrator ?? false,
    canManageMedia: policy.EnableContentDeletion ?? false,
    canDownload: policy.EnableContentDownloading ?? true,
    canSyncContent: policy.EnableSyncTranscoding ?? true,
    canRemoteControl: policy.EnableSharedDeviceControl ?? true,
    canDeleteMedia: policy.EnableContentDeletion ?? false,
    canEditMetadata: policy.IsAdministrator ?? false,
    maxBitrate: policy.SimultaneousStreamLimit,
    allowedLibraries: policy.EnableAllFolders ? undefined : policy.EnabledFolders,
  };
}

export function adaptJellyfinUser(
  raw: ValidatedJellyfinUser,
  options: UserAdapterOptions
): User {
  const { baseUrl, serverId } = options;

  return {
    id: raw.Id,
    name: raw.Name,
    serverId: serverId,
    provider: 'jellyfin',

    imageUrl: raw.PrimaryImageTag && baseUrl
      ? `${baseUrl}/Users/${raw.Id}/Images/Primary?tag=${raw.PrimaryImageTag}`
      : undefined,

    isAdmin: raw.Policy?.IsAdministrator ?? false,
    isDisabled: raw.Policy?.IsDisabled ?? false,

    lastLoginAt: raw.LastLoginDate,
    lastActivityAt: raw.LastActivityDate,

    permissions: adaptPermissions(raw.Policy),
  };
}

export function adaptJellyfinUsers(
  users: ValidatedJellyfinUser[],
  options: UserAdapterOptions
): User[] {
  return users.map(user => adaptJellyfinUser(user, options));
}
