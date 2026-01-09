import { create } from 'zustand';

type ConnectionStatus = 'connected' | 'disconnected' | 'retrying';

// Number of consecutive API failures required before showing disconnected state
const FAILURE_THRESHOLD = 3;

interface ConnectionState {
  status: ConnectionStatus;
  lastChecked: number | null;
  consecutiveFailures: number;

  // Actions
  reportFailure: () => void;
  reportSuccess: () => void;
  startRetry: () => void;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: 'connected',
  lastChecked: null,
  consecutiveFailures: 0,

  reportFailure: () =>
    set((state) => {
      // Don't count failures while we're in retry mode (manual retry in progress)
      if (state.status === 'retrying') {
        return state;
      }

      const failures = state.consecutiveFailures + 1;
      // Only mark as disconnected after FAILURE_THRESHOLD consecutive failures
      // This avoids false positives from temporary network hiccups or slow API calls
      return {
        consecutiveFailures: failures,
        status: failures >= FAILURE_THRESHOLD ? 'disconnected' : state.status,
        lastChecked: Date.now(),
      };
    }),

  reportSuccess: () =>
    set({
      status: 'connected',
      consecutiveFailures: 0,
      lastChecked: Date.now(),
    }),

  // Called when user manually retries - shows visual feedback
  startRetry: () =>
    set({
      status: 'retrying',
      lastChecked: Date.now(),
    }),
}));

// Selectors
export const selectConnectionStatus = (state: ConnectionState) => state.status;
export const selectIsDisconnected = (state: ConnectionState) =>
  state.status === 'disconnected';
export const selectIsRetrying = (state: ConnectionState) =>
  state.status === 'retrying';
export const selectConsecutiveFailures = (state: ConnectionState) =>
  state.consecutiveFailures;
