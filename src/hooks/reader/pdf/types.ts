import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import type { BaseItem, DownloadItem } from '@/types';

export interface PdfReaderCore {
  item: BaseItem | undefined;
  itemId: string | undefined;

  status: 'downloading' | 'ready' | 'error';
  errorMsg: string;
  debugInfo: string;
  isLoading: boolean;

  pdfBase64: string | null;
  currentPage: number;
  totalPages: number;
  progressPercent: number;

  downloaded: DownloadItem | undefined;
  isDownloading: boolean;
  handleDownload: () => Promise<void>;

  goToPage: (page: number) => void;
  handleClose: () => void;

  webViewRef: RefObject<WebView | null>;
  handleMessage: (event: { nativeEvent: { data: string } }) => void;
  getPdfHtml: () => string;
  injectPdfData: () => void;

  accentColor: string;
}

export interface UsePdfReaderCoreOptions {
  itemId: string | undefined;
}
