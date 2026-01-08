/**
 * Consistent cache strategy for React Query staleTime values
 * All times are in milliseconds
 */

// Static data that rarely changes
export const STALE_TIME = {
  // User/auth data - short cache
  AUTH: 1000 * 60 * 5, // 5 minutes

  // Library metadata - medium cache
  LIBRARIES: 1000 * 60 * 10, // 10 minutes
  LIBRARY_ITEMS: 1000 * 60 * 5, // 5 minutes

  // Item details - medium cache
  ITEM_DETAILS: 1000 * 60 * 5, // 5 minutes
  ITEM_SIMILAR: 1000 * 60 * 10, // 10 minutes

  // Images and static content - long cache
  IMAGES: 1000 * 60 * 60, // 1 hour

  // Dynamic content - short cache
  CONTINUE_WATCHING: 1000 * 30, // 30 seconds
  NEXT_UP: 1000 * 30, // 30 seconds
  LATEST_ITEMS: 1000 * 60, // 1 minute

  // Search results - very short cache
  SEARCH: 1000 * 30, // 30 seconds

  // Server info - long cache
  SERVER_INFO: 1000 * 60 * 30, // 30 minutes

  // Jellyseerr data - medium cache
  JELLYSEERR: 1000 * 60 * 2, // 2 minutes
  JELLYSEERR_DISCOVER: 1000 * 60 * 5, // 5 minutes
} as const;

// Cache time (how long to keep in cache after becoming stale)
export const CACHE_TIME = {
  DEFAULT: 1000 * 60 * 10, // 10 minutes
  LONG: 1000 * 60 * 30, // 30 minutes
  SHORT: 1000 * 60 * 2, // 2 minutes
} as const;
