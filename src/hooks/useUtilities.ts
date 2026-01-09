import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Simple boolean toggle hook
 * @param initialValue - Initial boolean value (default: false)
 */
export function useToggle(initialValue = false) {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);

  return [value, { toggle, setTrue, setFalse, setValue }] as const;
}

/**
 * Disclosure pattern hook (open/close/toggle)
 * Common pattern for modals, drawers, dropdowns
 */
export function useDisclosure(initialOpen = false) {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  return { isOpen, open, close, toggle };
}

/**
 * Modal state management hook
 * Supports multiple modal types with type safety
 */
export type ModalType = string;

export function useModal<T extends ModalType = string>(initialModal: T | null = null) {
  const [current, setCurrent] = useState<T | null>(initialModal);

  const open = useCallback((modal: T) => setCurrent(modal), []);
  const close = useCallback(() => setCurrent(null), []);
  const isOpen = useCallback((modal: T) => current === modal, [current]);
  const toggle = useCallback((modal: T) => {
    setCurrent((prev) => (prev === modal ? null : modal));
  }, []);

  return {
    current,
    open,
    close,
    toggle,
    isOpen,
    isAnyOpen: current !== null,
  };
}

/**
 * Track previous value of a variable
 * Useful for comparing current vs previous in effects
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Debounced callback hook
 * Unlike useDebounce (which debounces a value), this debounces a function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Update callback ref on every render
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  );
}

/**
 * Force component re-render
 * Useful when you need to trigger a re-render without state change
 */
export function useForceUpdate() {
  const [, setTick] = useState(0);
  return useCallback(() => setTick((t) => t + 1), []);
}

/**
 * Check if component is mounted
 * Useful for async operations to avoid setting state on unmounted components
 */
export function useIsMounted() {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Run effect only on updates (skip first render)
 */
export function useUpdateEffect(effect: React.EffectCallback, deps?: React.DependencyList) {
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
