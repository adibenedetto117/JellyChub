import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { JellyfinServer, JellyfinUser } from '@/types/jellyfin';
import { authStorage } from './storage';

interface AuthState {
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Servers
  servers: JellyfinServer[];
  activeServerId: string | null;

  // Current session
  currentUser: JellyfinUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Quick Connect
  quickConnectSecret: string | null;
  quickConnectCode: string | null;

  // Actions
  addServer: (server: Omit<JellyfinServer, 'id'>) => string;
  updateServer: (id: string, updates: Partial<JellyfinServer>) => void;
  removeServer: (id: string) => void;
  setActiveServer: (id: string) => void;
  getActiveServer: () => JellyfinServer | null;

  setUser: (user: JellyfinUser, accessToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  setQuickConnect: (secret: string | null, code: string | null) => void;
  clearQuickConnect: () => void;

  // Custom headers for reverse proxy auth
  setCustomHeaders: (headers: Record<string, string>) => void;
  addCustomHeader: (name: string, value: string) => void;
  removeCustomHeader: (name: string) => void;
  clearCustomHeaders: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      // Initial state
      servers: [],
      activeServerId: null,
      currentUser: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      quickConnectSecret: null,
      quickConnectCode: null,

      // Server management
      addServer: (serverData) => {
        const id = `server_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const server: JellyfinServer = {
          ...serverData,
          id,
          isDefault: get().servers.length === 0,
        };

        set((state) => ({
          servers: [...state.servers, server],
          activeServerId: state.activeServerId ?? id,
        }));

        return id;
      },

      updateServer: (id, updates) => {
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      removeServer: (id) => {
        set((state) => {
          const newServers = state.servers.filter((s) => s.id !== id);
          const wasActive = state.activeServerId === id;

          return {
            servers: newServers,
            activeServerId: wasActive
              ? newServers.find((s) => s.isDefault)?.id ?? newServers[0]?.id ?? null
              : state.activeServerId,
            // Logout if removing active server
            ...(wasActive
              ? {
                  currentUser: null,
                  isAuthenticated: false,
                }
              : {}),
          };
        });
      },

      setActiveServer: (id) => {
        const server = get().servers.find((s) => s.id === id);
        if (server) {
          set({
            activeServerId: id,
            // Clear current session when switching servers
            currentUser: null,
            isAuthenticated: false,
            error: null,
          });
        }
      },

      getActiveServer: () => {
        const { servers, activeServerId } = get();
        return servers.find((s) => s.id === activeServerId) ?? null;
      },

      // Authentication
      setUser: (user, accessToken) => {
        const { activeServerId } = get();
        if (activeServerId) {
          set((state) => ({
            currentUser: user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            servers: state.servers.map((s) =>
              s.id === activeServerId
                ? { ...s, userId: user.Id, accessToken }
                : s
            ),
          }));
        }
      },

      logout: () => {
        const { activeServerId } = get();
        set((state) => ({
          currentUser: null,
          isAuthenticated: false,
          error: null,
          quickConnectSecret: null,
          quickConnectCode: null,
          servers: state.servers.map((s) =>
            s.id === activeServerId
              ? { ...s, userId: undefined, accessToken: undefined }
              : s
          ),
        }));
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      // Quick Connect
      setQuickConnect: (secret, code) =>
        set({ quickConnectSecret: secret, quickConnectCode: code }),

      clearQuickConnect: () =>
        set({ quickConnectSecret: null, quickConnectCode: null }),

      // Custom headers for reverse proxy auth
      setCustomHeaders: (headers) => {
        const { activeServerId } = get();
        if (activeServerId) {
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === activeServerId
                ? { ...s, customHeaders: headers }
                : s
            ),
          }));
        }
      },

      addCustomHeader: (name, value) => {
        const { activeServerId, servers } = get();
        if (activeServerId) {
          const server = servers.find((s) => s.id === activeServerId);
          const existingHeaders = server?.customHeaders ?? {};
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === activeServerId
                ? { ...s, customHeaders: { ...existingHeaders, [name]: value } }
                : s
            ),
          }));
        }
      },

      removeCustomHeader: (name) => {
        const { activeServerId, servers } = get();
        if (activeServerId) {
          const server = servers.find((s) => s.id === activeServerId);
          const existingHeaders = { ...(server?.customHeaders ?? {}) };
          delete existingHeaders[name];
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === activeServerId
                ? { ...s, customHeaders: existingHeaders }
                : s
            ),
          }));
        }
      },

      clearCustomHeaders: () => {
        const { activeServerId } = get();
        if (activeServerId) {
          set((state) => ({
            servers: state.servers.map((s) =>
              s.id === activeServerId
                ? { ...s, customHeaders: {} }
                : s
            ),
          }));
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => authStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        servers: state.servers,
        activeServerId: state.activeServerId,
        currentUser: state.currentUser,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Selectors
export const selectAuthHasHydrated = (state: AuthState) => state._hasHydrated;

export const selectActiveServer = (state: AuthState) =>
  state.servers.find((s) => s.id === state.activeServerId);

export const selectServerUrl = (state: AuthState) =>
  selectActiveServer(state)?.url ?? null;

export const selectAccessToken = (state: AuthState) =>
  selectActiveServer(state)?.accessToken ?? null;
