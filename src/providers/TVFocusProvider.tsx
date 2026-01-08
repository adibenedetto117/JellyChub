import { createContext, useContext, useCallback, useReducer, ReactNode } from 'react';
import { isTV } from '@/utils/platform';

// Focus area types
export type FocusArea = 'sidebar' | 'content' | 'modal' | 'player';

// State interface
interface TVFocusState {
  currentArea: FocusArea;
  previousArea: FocusArea | null;
  focusedRowIndex: number;
  focusedItemIndex: number;
  isModalOpen: boolean;
}

// Actions
type TVFocusAction =
  | { type: 'SET_FOCUS_AREA'; area: FocusArea }
  | { type: 'SET_ROW_INDEX'; index: number }
  | { type: 'SET_ITEM_INDEX'; index: number }
  | { type: 'SET_FOCUS_POSITION'; rowIndex: number; itemIndex: number }
  | { type: 'OPEN_MODAL' }
  | { type: 'CLOSE_MODAL' }
  | { type: 'RESTORE_PREVIOUS_AREA' };

// Initial state
const initialState: TVFocusState = {
  currentArea: 'content',
  previousArea: null,
  focusedRowIndex: 0,
  focusedItemIndex: 0,
  isModalOpen: false,
};

// Reducer
function tvFocusReducer(state: TVFocusState, action: TVFocusAction): TVFocusState {
  switch (action.type) {
    case 'SET_FOCUS_AREA':
      return {
        ...state,
        previousArea: state.currentArea,
        currentArea: action.area,
      };
    case 'SET_ROW_INDEX':
      return {
        ...state,
        focusedRowIndex: action.index,
      };
    case 'SET_ITEM_INDEX':
      return {
        ...state,
        focusedItemIndex: action.index,
      };
    case 'SET_FOCUS_POSITION':
      return {
        ...state,
        focusedRowIndex: action.rowIndex,
        focusedItemIndex: action.itemIndex,
      };
    case 'OPEN_MODAL':
      return {
        ...state,
        previousArea: state.currentArea,
        currentArea: 'modal',
        isModalOpen: true,
      };
    case 'CLOSE_MODAL':
      return {
        ...state,
        currentArea: state.previousArea || 'content',
        previousArea: null,
        isModalOpen: false,
      };
    case 'RESTORE_PREVIOUS_AREA':
      return {
        ...state,
        currentArea: state.previousArea || 'content',
        previousArea: null,
      };
    default:
      return state;
  }
}

// Context value interface
interface TVFocusContextValue {
  state: TVFocusState;
  setFocusArea: (area: FocusArea) => void;
  setRowIndex: (index: number) => void;
  setItemIndex: (index: number) => void;
  setFocusPosition: (rowIndex: number, itemIndex: number) => void;
  openModal: () => void;
  closeModal: () => void;
  restorePreviousArea: () => void;
  isSidebarFocused: boolean;
  isContentFocused: boolean;
  isModalFocused: boolean;
  isPlayerFocused: boolean;
}

// Create context
const TVFocusContext = createContext<TVFocusContextValue | null>(null);

// Provider component
interface TVFocusProviderProps {
  children: ReactNode;
}

export function TVFocusProvider({ children }: TVFocusProviderProps) {
  const [state, dispatch] = useReducer(tvFocusReducer, initialState);

  const setFocusArea = useCallback((area: FocusArea) => {
    dispatch({ type: 'SET_FOCUS_AREA', area });
  }, []);

  const setRowIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_ROW_INDEX', index });
  }, []);

  const setItemIndex = useCallback((index: number) => {
    dispatch({ type: 'SET_ITEM_INDEX', index });
  }, []);

  const setFocusPosition = useCallback((rowIndex: number, itemIndex: number) => {
    dispatch({ type: 'SET_FOCUS_POSITION', rowIndex, itemIndex });
  }, []);

  const openModal = useCallback(() => {
    dispatch({ type: 'OPEN_MODAL' });
  }, []);

  const closeModal = useCallback(() => {
    dispatch({ type: 'CLOSE_MODAL' });
  }, []);

  const restorePreviousArea = useCallback(() => {
    dispatch({ type: 'RESTORE_PREVIOUS_AREA' });
  }, []);

  const value: TVFocusContextValue = {
    state,
    setFocusArea,
    setRowIndex,
    setItemIndex,
    setFocusPosition,
    openModal,
    closeModal,
    restorePreviousArea,
    isSidebarFocused: state.currentArea === 'sidebar',
    isContentFocused: state.currentArea === 'content',
    isModalFocused: state.currentArea === 'modal',
    isPlayerFocused: state.currentArea === 'player',
  };

  // Only provide context on TV, return children directly on mobile
  if (!isTV) {
    return <>{children}</>;
  }

  return (
    <TVFocusContext.Provider value={value}>
      {children}
    </TVFocusContext.Provider>
  );
}

// Hook to use TV focus context
export function useTVFocus(): TVFocusContextValue {
  const context = useContext(TVFocusContext);

  // Return a no-op implementation on non-TV platforms
  if (!context) {
    return {
      state: initialState,
      setFocusArea: () => {},
      setRowIndex: () => {},
      setItemIndex: () => {},
      setFocusPosition: () => {},
      openModal: () => {},
      closeModal: () => {},
      restorePreviousArea: () => {},
      isSidebarFocused: false,
      isContentFocused: true,
      isModalFocused: false,
      isPlayerFocused: false,
    };
  }

  return context;
}

// Export types
export type { TVFocusState, TVFocusContextValue };
