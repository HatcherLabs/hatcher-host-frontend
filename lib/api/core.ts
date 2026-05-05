// ============================================================
// API Core — token management and request wrapper
// ============================================================
// 
// Auth strategy:
// - Browser sessions rely on httpOnly cookies and credentials: 'include'
// - API keys (hk_*) may still be sent via Authorization for explicit tooling flows
// ============================================================

import { API_URL } from '@/lib/config';

const API_BASE = API_URL;
const TOKEN_KEY = 'hatcher_token';

// ─── Token helpers ───────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  if (token.startsWith('hk_')) return token;
  localStorage.removeItem(TOKEN_KEY);
  return null;
}

/**
 * Store only explicit API keys in localStorage. JWT browser sessions are
 * cookie-only; if a login/refresh response passes a JWT here, clear the
 * legacy fallback instead of persisting it.
 */
export function setToken(token: string) {
  if (token.startsWith('hk_')) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * Clear token from localStorage.
 * Called on logout alongside the /auth/logout endpoint (which clears the cookie).
 */
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  // With cookies, we can't know for sure from JS if the cookie exists (httpOnly).
  // So we check localStorage as a hint, or rely on /auth/me succeeding.
  return !!getToken();
}

// ─── Token refresh (internal — never retries on 401 to avoid loops) ─
async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send cookie
      // No Content-Type — Fastify rejects empty body with JSON content-type
    });
    if (!res.ok) return false;
    const json = (await res.json()) as { success: boolean; data?: { token: string } };
    if (json.success && json.data?.token) {
      setToken(json.data.token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Request wrapper ─────────────────────────────────────────
export async function req<T>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<{ success: true; data: T } | { success: false; error: string; code?: string }> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only set Content-Type: application/json when there's actually a body to send.
  // Fastify rejects POST requests with JSON content-type but no body.
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  // Send only explicit API keys as Authorization. Browser JWTs are cookie-only.
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Always send httpOnly cookie
    });

    // Parse JSON safely — non-JSON responses (HTML error pages, etc.) return null
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      // 429 Too Many Requests — return a meaningful error immediately
      if (res.status === 429) {
        return { success: false, error: 'Rate limit exceeded. Please wait before trying again.' };
      }

      if (res.status === 401) {
        if (!_isRetry) {
          // Try to refresh the token once, then retry the original request
          const refreshed = await attemptRefresh();
          if (refreshed) {
            return req<T>(path, options, true);
          }
        }
        // Refresh failed or already retried — clear session
        clearToken();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('hatcher:auth-expired'));
        }
      }
    }

    // If JSON parsing failed and response was not ok, return a generic error
    if (json === null && !res.ok) {
      return { success: false, error: `Request failed with status ${res.status}` };
    }

    return (json ?? { success: false, error: 'Empty response' }) as { success: true; data: T } | { success: false; error: string; code?: string };
  } catch {
    return { success: false, error: 'Network error — is the API running?' };
  }
}
