import type { RefObject } from 'react';
import type { WebView } from 'react-native-webview';
import type { BaseItem, DownloadItem } from '@/types';
import type { EbookHighlight, EbookBookmark, HighlightColor } from '@/stores/readingProgressStore';

export type ReaderTheme = 'dark' | 'light' | 'sepia';

export const THEMES: Record<ReaderTheme, { bg: string; text: string; name: string }> = {
  dark: { bg: '#121212', text: '#e0e0e0', name: 'Dark' },
  light: { bg: '#fafafa', text: '#1a1a1a', name: 'Light' },
  sepia: { bg: '#f4ecd8', text: '#5b4636', name: 'Sepia' },
};

export const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#fef08a',
  green: '#86efac',
  blue: '#93c5fd',
  pink: '#f9a8d4',
};

export interface TocItem {
  href: string;
  label: string;
  depth?: number;
}

export interface PendingHighlight {
  cfiRange: string;
  text: string;
}

export interface EpubReaderCore {
  item: BaseItem | undefined;
  itemId: string | undefined;

  status: 'downloading' | 'ready' | 'error';
  loadingStage: string;
  downloadProgress: number;
  errorMsg: string;

  fileUri: string | null;
  isReaderReady: boolean;
  isConfirmedEpub: boolean;
  locationsReady: boolean;
  isNavigating: boolean;

  showControls: boolean;
  setShowControls: (show: boolean | ((prev: boolean) => boolean)) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showToc: boolean;
  setShowToc: (show: boolean) => void;
  showBookmarks: boolean;
  setShowBookmarks: (show: boolean) => void;
  showHighlights: boolean;
  setShowHighlights: (show: boolean) => void;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  showNoteEditor: boolean;
  setShowNoteEditor: (show: boolean) => void;

  theme: ReaderTheme;
  fontSize: number;
  progress: number;

  toc: TocItem[];
  currentCfi: string | null;
  currentChapterHref: string | null;

  itemBookmarks: EbookBookmark[];
  handleAddBookmark: () => void;
  handleBookmarkPress: (cfi: string) => void;
  handleRemoveBookmark: (id: string) => void;

  itemHighlights: EbookHighlight[];
  pendingHighlight: PendingHighlight | null;
  setPendingHighlight: (h: PendingHighlight | null) => void;
  selectedHighlight: EbookHighlight | null;
  setSelectedHighlight: (h: EbookHighlight | null) => void;
  noteText: string;
  setNoteText: (text: string) => void;
  handleColorSelect: (color: HighlightColor) => void;
  handleSaveNote: () => void;
  handleDeleteHighlight: (highlight: EbookHighlight) => void;
  handleHighlightPress: (highlight: EbookHighlight) => void;

  handleThemeChange: (t: ReaderTheme) => void;
  handleFontSizeChange: (delta: number) => void;

  handleTocSelect: (href: string) => void;

  downloaded: DownloadItem | undefined;
  isDownloading: boolean;
  handleDownload: () => Promise<void>;

  webViewRef: RefObject<WebView | null>;
  handleMessage: (event: { nativeEvent: { data: string } }) => void;
  getReaderHtml: () => string;

  accentColor: string;
  hideMedia: boolean;
  themeColors: { bg: string; text: string; name: string };
  progressPercent: number;
}

export interface UseEpubReaderCoreOptions {
  itemId: string | undefined;
  startCfi?: string;
}
