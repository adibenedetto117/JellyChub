export type AuthMethod = 'apikey' | 'jellyfin' | 'local';
export const DEFAULT_PORT = '5055';
export const JELLYSEERR_PURPLE = '#6366f1';
export const JELLYSEERR_PURPLE_DARK = '#4f46e5';

export const parseUrl = (urlStr: string | null) => {
  if (!urlStr) return { protocol: 'http' as const, host: '', port: DEFAULT_PORT };
  try {
    const match = urlStr.match(/^(https?):\/\/([^:/]+)(?::(\d+))?/);
    if (match) {
      return {
        protocol: (match[1] as 'http' | 'https') || 'http',
        host: match[2] || '',
        port: match[3] || DEFAULT_PORT,
      };
    }
  } catch {}
  return { protocol: 'http' as const, host: '', port: DEFAULT_PORT };
};
