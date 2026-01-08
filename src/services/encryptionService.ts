import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

const ENCRYPTION_KEY_ALIAS = 'jellychub_encryption_key';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

class EncryptionService {
  private encryptionKey: Uint8Array | null = null;

  async initialize(): Promise<void> {
    if (this.encryptionKey) return;
    this.encryptionKey = await this.getOrCreateKey();
  }

  private async getOrCreateKey(): Promise<Uint8Array> {
    try {
      const storedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_ALIAS);
      if (storedKey) {
        return this.hexToBytes(storedKey);
      }
    } catch {}

    const keyBytes = Crypto.getRandomBytes(KEY_LENGTH);
    const keyHex = this.bytesToHex(keyBytes);
    await SecureStore.setItemAsync(ENCRYPTION_KEY_ALIAS, keyHex);
    return keyBytes;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return bytes;
  }

  private xorEncrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const result = new Uint8Array(data.length);
    const expandedKey = new Uint8Array(data.length);

    for (let i = 0; i < data.length; i++) {
      expandedKey[i] = key[i % key.length] ^ iv[i % iv.length];
    }

    for (let i = 0; i < data.length; i++) {
      result[i] = data[i] ^ expandedKey[i];
    }

    return result;
  }

  async encryptFile(sourcePath: string, destPath: string): Promise<void> {
    await this.initialize();
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const iv = Crypto.getRandomBytes(IV_LENGTH);
    const fileContent = await FileSystem.readAsStringAsync(sourcePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const dataBytes = this.base64ToBytes(fileContent);
    const encryptedData = this.xorEncrypt(dataBytes, this.encryptionKey, iv);

    const combined = new Uint8Array(IV_LENGTH + encryptedData.length);
    combined.set(iv, 0);
    combined.set(encryptedData, IV_LENGTH);

    const encryptedBase64 = this.bytesToBase64(combined);
    await FileSystem.writeAsStringAsync(destPath, encryptedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async decryptFile(encryptedPath: string, destPath: string): Promise<void> {
    await this.initialize();
    if (!this.encryptionKey) throw new Error('Encryption key not initialized');

    const encryptedContent = await FileSystem.readAsStringAsync(encryptedPath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const combined = this.base64ToBytes(encryptedContent);
    const iv = combined.slice(0, IV_LENGTH);
    const encryptedData = combined.slice(IV_LENGTH);

    const decryptedData = this.xorEncrypt(encryptedData, this.encryptionKey, iv);
    const decryptedBase64 = this.bytesToBase64(decryptedData);

    await FileSystem.writeAsStringAsync(destPath, decryptedBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  async getDecryptedUri(encryptedPath: string): Promise<string> {
    const tempDir = `${FileSystem.cacheDirectory}decrypted/`;
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }

    const filename = encryptedPath.split('/').pop() || 'temp';
    const decryptedPath = `${tempDir}${filename}`;

    const existingFile = await FileSystem.getInfoAsync(decryptedPath);
    if (existingFile.exists) {
      return decryptedPath;
    }

    await this.decryptFile(encryptedPath, decryptedPath);
    return decryptedPath;
  }

  async clearDecryptedCache(): Promise<void> {
    const tempDir = `${FileSystem.cacheDirectory}decrypted/`;
    try {
      await FileSystem.deleteAsync(tempDir, { idempotent: true });
    } catch {}
  }

  private base64ToBytes(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  private bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export const encryptionService = new EncryptionService();
