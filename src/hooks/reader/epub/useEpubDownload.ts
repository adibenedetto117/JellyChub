import { useState, useEffect } from 'react';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import { useDownloadStore } from '@/stores';
import { encryptionService } from '@/services';
import { getBookDownloadUrl } from '@/api';

export interface EpubDownloadState {
  status: 'downloading' | 'ready' | 'error';
  loadingStage: string;
  downloadProgress: number;
  errorMsg: string;
  fileUri: string | null;
}

export function useEpubDownload(itemId: string | undefined): EpubDownloadState {
  const getDownloadedItem = useDownloadStore((s) => s.getDownloadedItem);

  const [status, setStatus] = useState<'downloading' | 'ready' | 'error'>('downloading');
  const [loadingStage, setLoadingStage] = useState('Connecting...');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileUri, setFileUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const download = async () => {
      if (!itemId) return;

      try {
        setStatus('downloading');
        setDownloadProgress(0);

        let localUri: string;

        const downloaded = getDownloadedItem(itemId);
        if (downloaded?.localPath) {
          const fileInfo = await FileSystem.getInfoAsync(downloaded.localPath);
          if (fileInfo.exists) {
            setLoadingStage('Loading downloaded book...');
            setDownloadProgress(1);
            if (downloaded.localPath.endsWith('.enc')) {
              localUri = await encryptionService.getDecryptedUri(downloaded.localPath);
            } else {
              localUri = downloaded.localPath;
            }
          } else {
            localUri = await downloadToCache();
          }
        } else {
          localUri = await downloadToCache();
        }

        async function downloadToCache(): Promise<string> {
          const downloadUrl = getBookDownloadUrl(itemId!);
          const cacheUri = `${FileSystem.cacheDirectory}book_${itemId}`;

          const fileInfo = await FileSystem.getInfoAsync(cacheUri);
          if (!fileInfo.exists) {
            setLoadingStage('Downloading...');

            const downloadResumable = FileSystem.createDownloadResumable(
              downloadUrl,
              cacheUri,
              {},
              (progress) => {
                const pct = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
                setDownloadProgress(pct);
              }
            );

            const result = await downloadResumable.downloadAsync();
            if (!result || result.status !== 200) {
              throw new Error(`Download failed: ${result?.status}`);
            }
          } else {
            setLoadingStage('Loading from cache...');
            setDownloadProgress(1);
          }

          return cacheUri;
        }

        if (cancelled) return;

        setLoadingStage('Reading file...');
        const base64 = await FileSystem.readAsStringAsync(localUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (cancelled) return;

        if (base64.startsWith('JVBERi')) {
          router.replace(`/reader/pdf?itemId=${itemId}`);
          return;
        }

        setLoadingStage('Opening book...');
        setFileUri(base64);
        setStatus('ready');
      } catch (err) {
        if (!cancelled) {
          setErrorMsg(err instanceof Error ? err.message : 'Download failed');
          setStatus('error');
        }
      }
    };

    download();
    return () => { cancelled = true; };
  }, [itemId, getDownloadedItem]);

  return {
    status,
    loadingStage,
    downloadProgress,
    errorMsg,
    fileUri,
  };
}
