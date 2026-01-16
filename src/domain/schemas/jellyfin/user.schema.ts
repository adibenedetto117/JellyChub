import { z } from 'zod';

export const UserPolicySchema = z.object({
  IsAdministrator: z.boolean().optional(),
  IsHidden: z.boolean().optional(),
  IsDisabled: z.boolean().optional(),
  EnableRemoteAccess: z.boolean().optional(),
  EnableSharedDeviceControl: z.boolean().optional(),
  EnableAllFolders: z.boolean().optional(),
  EnabledFolders: z.array(z.string()).optional(),
  MaxParentalRating: z.number().optional(),
  EnableUserPreferenceAccess: z.boolean().optional(),
  EnableContentDeletion: z.boolean().optional(),
  EnableContentDownloading: z.boolean().optional(),
  EnableSyncTranscoding: z.boolean().optional(),
  EnableMediaPlayback: z.boolean().optional(),
  EnableLiveTvAccess: z.boolean().optional(),
  EnableLiveTvManagement: z.boolean().optional(),
  EnableAllDevices: z.boolean().optional(),
  EnabledDevices: z.array(z.string()).optional(),
  EnableAllChannels: z.boolean().optional(),
  EnabledChannels: z.array(z.string()).optional(),
  SimultaneousStreamLimit: z.number().optional(),
}).passthrough();

export const JellyfinUserSchema = z.object({
  Id: z.string(),
  Name: z.string(),
  ServerId: z.string(),
}).extend({
  PrimaryImageTag: z.string().optional(),
  HasPassword: z.boolean().optional(),
  HasConfiguredPassword: z.boolean().optional(),
  HasConfiguredEasyPassword: z.boolean().optional(),
  EnableAutoLogin: z.boolean().optional(),
  LastLoginDate: z.string().optional(),
  LastActivityDate: z.string().optional(),
  Policy: UserPolicySchema.optional(),
}).passthrough();

export const AuthenticationResultSchema = z.object({
  User: JellyfinUserSchema,
  AccessToken: z.string(),
  ServerId: z.string(),
}).passthrough();

export type ValidatedJellyfinUser = z.infer<typeof JellyfinUserSchema>;
export type ValidatedUserPolicy = z.infer<typeof UserPolicySchema>;
export type ValidatedAuthenticationResult = z.infer<typeof AuthenticationResultSchema>;
