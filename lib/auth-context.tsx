'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken, isAuthenticated } from './api';
import type { AuthProfileData } from './api';
import { clearTerminalCredentialMounts } from './terminal-credentials';
import { logoutWithImmediateCleanup } from './logout';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  walletAddress: string | null;
  isAdmin: boolean;
  tier: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  user: null,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  clearError: () => {},
  refreshUser: async () => {},
});

function mapProfile(profile: AuthProfileData): UserProfile {
  return {
    id: profile.id,
    email: profile.email,
    username: profile.username,
    walletAddress: profile.walletAddress ?? null,
    isAdmin: profile.isAdmin ?? false,
    tier: profile.tier ?? 'free',
    avatarUrl: profile.avatarUrl ?? null,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true until initial auth check completes
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    clearTerminalCredentialMounts();

    try {
      const res = await api.login(email, password);
      if (!res.success) throw new Error(res.error);

      setToken(res.data.token);
      setAuthed(true);

      // Login response may not include tier — fetch full profile to get it
      const profile = await api.getProfile();
      if (profile.success) {
        setUser(mapProfile(profile.data));
      } else {
        // Fallback: use login response data (tier may default to 'free')
        setUser({
          id: res.data.user.id,
          email: res.data.user.email,
          username: res.data.user.username,
          walletAddress: res.data.user.walletAddress ?? null,
          isAdmin: res.data.user.isAdmin ?? false,
          tier: res.data.user.tier ?? 'free',
          avatarUrl: null,
        });
      }
    } catch (e) {
      setError((e as Error).message);
      setAuthed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, referralCode?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.register(email, username, password, referralCode);
      if (!res.success) throw new Error(res.error);

      // Don't set token or auth — user must verify email first
      // Token is only stored after login (which requires verified email)
    } catch (e) {
      setError((e as Error).message);
      setAuthed(false);
      // Re-throw so the caller can distinguish success (→ /verify-email)
      // from failure (→ stay on form, show inline error).
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const currentUserId = user?.id;
    await logoutWithImmediateCleanup({
      revoke: api.logout,
      cleanup: () => {
        clearTerminalCredentialMounts(currentUserId);
        clearToken();
        setAuthed(false);
        setUser(null);
      },
    });
  }, [user?.id]);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    const res = await api.getProfile();
    if (res.success) {
      setUser(mapProfile(res.data));
    }
  }, []);

  // Sync state with token on mount (e.g. page refresh)
  // Check both localStorage token AND httpOnly cookie via a non-error session probe.
  useEffect(() => {
    const hasLocalToken = isAuthenticated();

    api.getSession().then((res) => {
      if (res.success) {
        if (res.data.authenticated && res.data.user) {
          setAuthed(true);
          setUser(mapProfile(res.data.user));
        } else {
          // Server definitively says we're not signed in.
          if (hasLocalToken) clearToken();
          setAuthed(false);
          setUser(null);
        }
      }
      // else: the probe itself failed (network error / 5xx). Don't sign the
      // user out over a transient server hiccup — a valid cookie is still a
      // valid session. Leave the current state and let the next probe decide.
    }).finally(() => setIsLoading(false));
  }, []);

  // Listen for auth-expired event dispatched by the API client on 401
  useEffect(() => {
    const handleAuthExpired = () => {
      clearTerminalCredentialMounts(user?.id);
      clearToken();
      setAuthed(false);
      setUser(null);
    };
    window.addEventListener('hatcher:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('hatcher:auth-expired', handleAuthExpired);
    };
  }, [user?.id]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: authed, isLoading, error, user, login, register, logout, clearError, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { getToken };
