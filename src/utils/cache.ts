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
