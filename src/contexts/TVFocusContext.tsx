import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from 'react';
import { findNodeHandle, UIManager, Platform } from 'react-native';
import { isTV } from '@/utils/platform';

interface FocusableElement {
  ref: React.RefObject<any>;
  row: number;
  column: number;
  onFocus?: () => void;
}

interface TVFocusContextValue {
  registerFocusable: (id: string, element: FocusableElement) => void;
  unregisterFocusable: (id: string) => void;
  setFocus: (id: string) => void;
  currentFocusId: string | null;
  setCurrentFocusId: (id: string | null) => void;
  focusedRow: number;
  setFocusedRow: (row: number) => void;
  lastFocusedPerRow: Map<number, string>;
  setLastFocusedInRow: (row: number, id: string) => void;
}

const TVFocusContext = createContext<TVFocusContextValue | null>(null);

export function TVFocusProvider({ children }: { children: React.ReactNode }) {
  const [currentFocusId, setCurrentFocusId] = useState<string | null>(null);
  const [focusedRow, setFocusedRow] = useState(0);
  const focusablesRef = useRef<Map<string, FocusableElement>>(new Map());
  const lastFocusedPerRowRef = useRef<Map<number, string>>(new Map());

  const registerFocusable = useCallback((id: string, element: FocusableElement) => {
    focusablesRef.current.set(id, element);
  }, []);

  const unregisterFocusable = useCallback((id: string) => {
    focusablesRef.current.delete(id);
  }, []);

  const setFocus = useCallback((id: string) => {
    if (!isTV) return;

    const element = focusablesRef.current.get(id);
    if (element?.ref.current) {
      const handle = findNodeHandle(element.ref.current);
      if (handle && Platform.OS === 'android') {
        try {
          (UIManager as any).updateView(handle, 'RCTView', { hasTVPreferredFocus: true });
        } catch (e) {
        }
      }
      element.onFocus?.();
      setCurrentFocusId(id);
      setFocusedRow(element.row);
      lastFocusedPerRowRef.current.set(element.row, id);
    }
  }, []);

  const setLastFocusedInRow = useCallback((row: number, id: string) => {
    lastFocusedPerRowRef.current.set(row, id);
  }, []);

  const value = useMemo(() => ({
    registerFocusable,
    unregisterFocusable,
    setFocus,
    currentFocusId,
    setCurrentFocusId,
    focusedRow,
    setFocusedRow,
    lastFocusedPerRow: lastFocusedPerRowRef.current,
    setLastFocusedInRow,
  }), [
    registerFocusable,
    unregisterFocusable,
    setFocus,
    currentFocusId,
    focusedRow,
    setLastFocusedInRow,
  ]);

  return (
    <TVFocusContext.Provider value={value}>
      {children}
    </TVFocusContext.Provider>
  );
}

export function useTVFocus() {
  const context = useContext(TVFocusContext);
  if (!context) {
    return {
      registerFocusable: () => {},
      unregisterFocusable: () => {},
      setFocus: () => {},
      currentFocusId: null,
      setCurrentFocusId: () => {},
      focusedRow: 0,
      setFocusedRow: () => {},
      lastFocusedPerRow: new Map(),
      setLastFocusedInRow: () => {},
    };
  }
  return context;
}
