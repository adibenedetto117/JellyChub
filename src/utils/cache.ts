import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';

export interface CacheInfo {
  imageCache: number;
  downloadCache: number;
  total: number;
}

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}jellychub/downloads/`;

export async function getCacheSize(): Promise<CacheInfo> {
  let downloadCache = 0;

  // Calculate download directory size
  try {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (dirInfo.exists) {
      const files = await FileSystem.readDirectoryAsync(DOWNLOAD_DIR);
      for (const file of files) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(`${DOWNLOAD_DIR}${file}`);
          if (fileInfo.exists && 'size' in fileInfo) {
            downloadCache += fileInfo.size ?? 0;
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // expo-image doesn't expose cache size directly, estimate based on typical usage
  // The actual cache is managed by the native layer
  const imageCache = 0; // Will be shown as "Managed by system"

  return {
    imageCache,
    downloadCache,
    total: downloadCache,
  };
}

export async function clearImageCache(): Promise<void> {
  try {
    await Image.clearDiskCache();
    await Image.clearMemoryCache();
  } catch {
    // Silently handle cache clearing errors
  }
}

export async function clearDownloadCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(DOWNLOAD_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
    }
  } catch {
    // Silently handle cache clearing errors
  }
}

export async function clearAllCache(): Promise<void> {
  await Promise.all([clearImageCache(), clearDownloadCache()]);
}

// API Response Cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ApiCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTTL,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // Helper to wrap async functions with caching
  async cached<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

export const apiCache = new ApiCache();
