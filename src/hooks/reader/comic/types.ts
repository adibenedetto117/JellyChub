import type { RefObject } from 'react';
import type { FlatList } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { ComposedGesture } from 'react-native-gesture-handler';
import type { BaseItem, DownloadItem } from '@/types';
import type { useResponsive } from '@/hooks/useResponsive';

export type PageMode = 'single' | 'double' | 'webtoon';
export type ReadDirection = 'ltr' | 'rtl';
export type FitMode = 'contain' | 'width' | 'height' | 'cover';
export type PageAnimation = 'none' | 'slide' | 'fade';

export interface ComicPage {
  index: number;
  filename: string;
  uri: string;
  width?: number;
  height?: number;
}

export interface ComicReaderCore {
  item: BaseItem | undefined;
  itemId: string | undefined;

  status: 'downloading' | 'extracting' | 'ready' | 'error' | 'unsupported';
  downloadProgress: number;
  extractProgress: number;
  errorMsg: string;

  pages: ComicPage[];
  totalPages: number;
  currentPage: number;
  progressPercent: number;

  showControls: boolean;
  setShowControls: (show: boolean) => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  showThumbnails: boolean;
  setShowThumbnails: (show: boolean) => void;

  pageMode: PageMode;
  setPageMode: (mode: PageMode) => void;
  readDirection: ReadDirection;
  setReadDirection: (dir: ReadDirection) => void;
  fitMode: FitMode;
  setFitMode: (mode: FitMode) => void;
  pageAnimation: PageAnimation;
  setPageAnimation: (anim: PageAnimation) => void;

  goToPage: (page: number, animated?: boolean) => void;
  handlePrevPage: () => void;
  handleNextPage: () => void;
  toggleControls: () => void;

  downloaded: DownloadItem | undefined;
  isDownloading: boolean;
  handleDownload: () => Promise<void>;

  controlsOpacity: SharedValue<number>;
  scale: SharedValue<number>;
  savedScale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
  fadeOpacity: SharedValue<number>;

  composedGestures: ComposedGesture;

  flatListRef: RefObject<FlatList | null>;

  isDoublePageMode: boolean;
  doublePageData: ComicPage[] | ComicPage[][];

  responsive: ReturnType<typeof useResponsive>;

  accentColor: string;
  handleClose: () => void;
  handleScrollEnd: (index: number) => void;

  getContentFit: () => 'contain' | 'cover' | 'fill';
  getImageStyle: () => { width: number; height: number } | { width: number; height: undefined } | { width: undefined; height: number };
}

export interface UseComicReaderCoreOptions {
  itemId: string | undefined;
}

export const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

export function isImageFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

export function sortPagesByFilename(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function isCbrFile(path: string): boolean {
  const lower = path.toLowerCase();
  return lower.endsWith('.cbr') || lower.endsWith('.rar');
}
