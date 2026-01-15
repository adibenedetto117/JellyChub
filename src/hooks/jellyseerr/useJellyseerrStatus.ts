import { useEffect, useRef } from 'react';
import { useSettingsStore, selectHasJellyseerr } from '@/stores/settingsStore';
import { jellyseerrClient } from '@/api/external/jellyseerr';

function useJellyseerrInit() {
  const jellyseerrUrl = useSettingsStore((s) => s.jellyseerrUrl);
  const jellyseerrAuthToken = useSettingsStore((s) => s.jellyseerrAuthToken);
  const jellyseerrSessionCookie = useSettingsStore((s) => s.jellyseerrSessionCookie);
  const clearJellyseerrCredentials = useSettingsStore((s) => s.clearJellyseerrCredentials);

  const clearCredentialsRef = useRef(clearJellyseerrCredentials);
  clearCredentialsRef.current = clearJellyseerrCredentials;

  useEffect(() => {
    if (jellyseerrUrl && jellyseerrAuthToken && !jellyseerrClient.isInitialized()) {
      const isJellyfinAuth = jellyseerrAuthToken === 'jellyfin-auth';
      const isLocalAuth = jellyseerrAuthToken === 'local-auth';

      if (isJellyfinAuth && jellyseerrSessionCookie) {
        jellyseerrClient.initializeWithSession(jellyseerrUrl, jellyseerrSessionCookie);
      } else if (isJellyfinAuth || isLocalAuth) {
        jellyseerrClient.initialize(jellyseerrUrl);
      } else {
        jellyseerrClient.initialize(jellyseerrUrl, jellyseerrAuthToken);
      }
    }
  }, [jellyseerrUrl, jellyseerrAuthToken, jellyseerrSessionCookie]);
}

export function useJellyseerrStatus() {
  const isConfigured = useSettingsStore(selectHasJellyseerr);
  useJellyseerrInit();

  return {
    isConfigured,
    isReady: isConfigured && jellyseerrClient.isInitialized(),
  };
}
