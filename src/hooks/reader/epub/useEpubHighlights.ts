import { useState, useMemo, useCallback } from 'react';
import type { WebView } from 'react-native-webview';
import { useReadingProgressStore, type HighlightColor, type EbookHighlight } from '@/stores/readingProgressStore';
import { HIGHLIGHT_COLORS, type PendingHighlight } from './types';

export interface EpubHighlightsState {
  showHighlights: boolean;
  setShowHighlights: (show: boolean) => void;
  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;
  showNoteEditor: boolean;
  setShowNoteEditor: (show: boolean) => void;
  itemHighlights: EbookHighlight[];
  pendingHighlight: PendingHighlight | null;
  setPendingHighlight: (h: PendingHighlight | null) => void;
  selectedHighlight: EbookHighlight | null;
  setSelectedHighlight: (h: EbookHighlight | null) => void;
  noteText: string;
  setNoteText: (t: string) => void;
  handleColorSelect: (color: HighlightColor) => void;
  handleSaveNote: () => void;
  handleDeleteHighlight: (highlight: EbookHighlight) => void;
  handleHighlightPress: (highlight: EbookHighlight) => void;
  injectHighlights: () => void;
}

export function useEpubHighlights(
  itemId: string | undefined,
  webViewRef: React.RefObject<WebView | null>
): EpubHighlightsState {
  const ebookHighlights = useReadingProgressStore((s) => s.ebookHighlights);
  const addHighlight = useReadingProgressStore((s) => s.addHighlight);
  const updateHighlight = useReadingProgressStore((s) => s.updateHighlight);
  const removeHighlight = useReadingProgressStore((s) => s.removeHighlight);

  const [showHighlights, setShowHighlights] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [pendingHighlight, setPendingHighlight] = useState<PendingHighlight | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<EbookHighlight | null>(null);
  const [noteText, setNoteText] = useState('');

  const itemHighlights = useMemo(() =>
    ebookHighlights.filter(h => h.itemId === itemId).sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
    [ebookHighlights, itemId]
  );

  const injectHighlights = useCallback(() => {
    if (itemHighlights.length === 0) return;
    const highlights = itemHighlights.map(h => ({
      cfi: h.cfiRange,
      color: HIGHLIGHT_COLORS[h.color],
      id: h.id,
    }));
    const json = JSON.stringify(highlights).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    webViewRef.current?.injectJavaScript(`addHighlightsBatch(${json}); true;`);
  }, [itemHighlights, webViewRef]);

  const handleColorSelect = useCallback((color: HighlightColor) => {
    if (!pendingHighlight || !itemId) return;
    const id = addHighlight({
      itemId,
      cfiRange: pendingHighlight.cfiRange,
      text: pendingHighlight.text,
      color,
    });
    const hexColor = HIGHLIGHT_COLORS[color];
    const escapedCfi = pendingHighlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`addHighlightAnnotation("${escapedCfi}", "${hexColor}", "${id}"); true;`);
    setPendingHighlight(null);
    setShowColorPicker(false);
  }, [pendingHighlight, itemId, addHighlight, webViewRef]);

  const handleSaveNote = useCallback(() => {
    if (!selectedHighlight) return;
    updateHighlight(selectedHighlight.id, { note: noteText });
    setSelectedHighlight(null);
    setNoteText('');
    setShowNoteEditor(false);
  }, [selectedHighlight, noteText, updateHighlight]);

  const handleDeleteHighlight = useCallback((highlight: EbookHighlight) => {
    const escapedCfi = highlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`removeHighlightAnnotation("${escapedCfi}"); true;`);
    removeHighlight(highlight.id);
    setSelectedHighlight(null);
    setShowNoteEditor(false);
  }, [removeHighlight, webViewRef]);

  const handleHighlightPress = useCallback((highlight: EbookHighlight) => {
    const escapedCfi = highlight.cfiRange.replace(/"/g, '\\"');
    webViewRef.current?.injectJavaScript(`goToCfi("${escapedCfi}"); true;`);
    setShowHighlights(false);
  }, [webViewRef]);

  return {
    showHighlights,
    setShowHighlights,
    showColorPicker,
    setShowColorPicker,
    showNoteEditor,
    setShowNoteEditor,
    itemHighlights,
    pendingHighlight,
    setPendingHighlight,
    selectedHighlight,
    setSelectedHighlight,
    noteText,
    setNoteText,
    handleColorSelect,
    handleSaveNote,
    handleDeleteHighlight,
    handleHighlightPress,
    injectHighlights,
  };
}
