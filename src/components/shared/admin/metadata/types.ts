import type { BaseItem } from '@/types/jellyfin';
import type { RemoteSearchResult, RemoteSearchType } from '@/api/admin';

export type MetadataTab = 'edit' | 'identify' | 'refresh';

export interface MetadataEditorProps {
  visible: boolean;
  onClose: () => void;
  item: BaseItem;
  onUpdate?: () => void;
}

export interface MetadataFormProps {
  item: BaseItem;
  onSave: (updates: Partial<BaseItem>) => Promise<void>;
  isPending: boolean;
}

export interface IdentifyPanelProps {
  item: BaseItem;
  onApply: (result: RemoteSearchResult, replaceAll: boolean) => Promise<void>;
  isPending: boolean;
}

export interface RefreshPanelProps {
  item: BaseItem;
  onRefresh: (replaceMetadata: boolean, replaceImages: boolean) => Promise<void>;
  isPending: boolean;
}

export function getSearchTypeFromItem(item: BaseItem): RemoteSearchType {
  switch (item.Type) {
    case 'Movie':
      return 'Movie';
    case 'Series':
      return 'Series';
    case 'Episode':
      return 'Episode';
    case 'MusicAlbum':
      return 'MusicAlbum';
    case 'MusicArtist':
      return 'MusicArtist';
    case 'Person':
      return 'Person';
    case 'Book':
    case 'AudioBook':
      return 'Book';
    default:
      return 'Movie';
  }
}
