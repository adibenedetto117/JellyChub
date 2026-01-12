import * as FileSystem from 'expo-file-system/legacy';

class EncryptionService {
  async initialize(): Promise<void> {}

  async encryptFile(sourcePath: string, destPath: string): Promise<void> {
    const fileInfo = await FileSystem.getInfoAsync(sourcePath);
    if (!fileInfo.exists) throw new Error('Source file does not exist');
    await FileSystem.moveAsync({ from: sourcePath, to: destPath });
  }

  async decryptFile(encryptedPath: string, destPath: string): Promise<void> {
    await FileSystem.copyAsync({ from: encryptedPath, to: destPath });
  }

  async getDecryptedUri(filePath: string): Promise<string> {
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('File not found');
    }
    return filePath;
  }

  async clearDecryptedCache(): Promise<void> {
    const tempDir = `${FileSystem.cacheDirectory}decrypted/`;
    try {
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
    } catch {}
  }
}

export const encryptionService = new EncryptionService();
