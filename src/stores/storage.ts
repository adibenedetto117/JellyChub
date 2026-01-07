/**
 * Centralized MMKV Storage Configuration
 *
 * This module consolidates MMKV storage instances to reduce native binding overhead
 * during app startup. MMKV is extremely fast, but each instance creates native bindings.
 *
 * Storage Architecture:
 * =====================
 *
 * 1. AUTH_STORAGE ('auth-storage')
 *    - Isolated for security: contains access tokens, server credentials
 *    - Used by: authStore.ts
 *    - Data: servers[], activeServerId, currentUser, isAuthenticated
 *
 * 2. APP_STORAGE ('app-storage')
 *    - Consolidated general app data storage
 *    - Used by: settingsStore.ts, downloadStore.ts, readingProgressStore.ts, client.ts
 *    - Data isolation via Zustand persist keys (each store has its own key)
 *    - Contains:
 *      * User preferences and settings
 *      * Download queue and completed downloads
 *      * Reading progress and bookmarks
 *      * Device ID for Jellyfin client identification
 *
 * 3. QUERY_CACHE ('query-cache')
 *    - Separate for React Query: different lifecycle and serialization
 *    - Managed by @tanstack/react-query-persist-client
 *    - Used by: QueryProvider.tsx
 *
 * Why this architecture?
 * ----------------------
 * - Auth storage is isolated for security (tokens shouldn't mix with general data)
 * - Query cache is separate because React Query manages its own persistence lifecycle
 * - All other stores are consolidated because:
 *   - They share the same Zustand persist pattern
 *   - Each store uses unique persistence keys, so data doesn't collide
 *   - Reduces native binding overhead from 6 instances to 3
 *
 * Migration note:
 * ---------------
 * When upgrading from separate instances, existing data will be preserved because:
 * - Auth storage key unchanged ('auth-storage')
 * - Query cache key unchanged ('query-cache')
 * - Zustand stores use their own persistence keys within the MMKV instance
 *   (e.g., 'settings-storage', 'download-storage' keys exist within 'app-storage' instance)
 */

import { MMKV } from 'react-native-mmkv';

/**
 * Authentication storage - isolated for security
 * Contains sensitive data: access tokens, server credentials, user info
 */
export const AUTH_STORAGE = new MMKV({ id: 'auth-storage' });

/**
 * General app storage - consolidated instance for non-sensitive app data
 * Used by multiple Zustand stores, each with their own persistence key
 */
export const APP_STORAGE = new MMKV({ id: 'app-storage' });

/**
 * React Query cache storage - separate instance for query persistence
 * Managed by @tanstack/react-query-persist-client with its own lifecycle
 */
export const QUERY_CACHE_STORAGE = new MMKV({ id: 'query-cache' });

/**
 * Creates a Zustand-compatible storage adapter for the given MMKV instance.
 * This adapter implements the interface required by zustand/middleware persist.
 */
export function createZustandStorage(mmkv: MMKV) {
  return {
    getItem: (name: string): string | null => {
      return mmkv.getString(name) ?? null;
    },
    setItem: (name: string, value: string): void => {
      mmkv.set(name, value);
    },
    removeItem: (name: string): void => {
      mmkv.delete(name);
    },
  };
}

/**
 * Pre-configured storage adapters for common use cases
 */
export const authStorage = createZustandStorage(AUTH_STORAGE);
export const appStorage = createZustandStorage(APP_STORAGE);
export const queryCacheStorage = createZustandStorage(QUERY_CACHE_STORAGE);
