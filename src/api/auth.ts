import { jellyfinClient } from './client';
import type { AuthenticationResult, JellyfinUser, QuickConnectResult } from '@/types/jellyfin';

export interface ServerInfo {
  ServerName: string;
  Version: string;
  Id: string;
  LocalAddress?: string;
  ProductName?: string;
  OperatingSystem?: string;
  StartupWizardCompleted?: boolean;
}

export interface ServerPublicInfo extends ServerInfo {
  // Extended public info from /System/Info/Public
}

export async function getServerPublicInfo(
  serverUrl: string,
  customHeaders?: Record<string, string>
): Promise<ServerInfo | null> {
  try {
    const normalizedUrl = serverUrl.replace(/\/$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Add custom headers for reverse proxy authentication
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([name, value]) => {
        if (name && value) {
          headers[name] = value;
        }
      });
    }

    const response = await fetch(`${normalizedUrl}/System/Info/Public`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export async function getServerInfo(): Promise<ServerInfo> {
  const response = await jellyfinClient.api.get<ServerInfo>('/System/Info/Public');
  return response.data;
}

export async function getPublicUsers(): Promise<JellyfinUser[]> {
  const response = await jellyfinClient.api.get<JellyfinUser[]>('/Users/Public');
  return response.data;
}

export async function authenticateByName(
  username: string,
  password: string
): Promise<AuthenticationResult> {
  const response = await jellyfinClient.api.post<AuthenticationResult>(
    '/Users/AuthenticateByName',
    {
      Username: username,
      Pw: password,
    }
  );
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await jellyfinClient.api.post('/Sessions/Logout');
  } catch {
    // Ignore logout errors
  }
}

export async function initiateQuickConnect(): Promise<QuickConnectResult> {
  const response = await jellyfinClient.api.post<QuickConnectResult>(
    '/QuickConnect/Initiate'
  );
  return response.data;
}

export async function checkQuickConnectStatus(
  secret: string
): Promise<QuickConnectResult> {
  const response = await jellyfinClient.api.get<QuickConnectResult>(
    `/QuickConnect/Connect?secret=${secret}`
  );
  return response.data;
}

export async function authenticateWithQuickConnect(
  secret: string
): Promise<AuthenticationResult> {
  const response = await jellyfinClient.api.post<AuthenticationResult>(
    '/Users/AuthenticateWithQuickConnect',
    { Secret: secret }
  );
  return response.data;
}

export async function getCurrentUser(): Promise<JellyfinUser> {
  const response = await jellyfinClient.api.get<JellyfinUser>('/Users/Me');
  return response.data;
}

export async function validateServerUrl(
  url: string,
  customHeaders?: Record<string, string>
): Promise<ServerInfo | null> {
  try {
    const normalizedUrl = url.replace(/\/$/, '');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    // Add custom headers for reverse proxy authentication
    if (customHeaders) {
      Object.entries(customHeaders).forEach(([name, value]) => {
        if (name && value) {
          headers[name] = value;
        }
      });
    }

    const response = await fetch(`${normalizedUrl}/System/Info/Public`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
