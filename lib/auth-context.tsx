'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, getToken, setToken, clearToken, isAuthenticated } from './api';

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
  logout: () => void;
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
  logout: () => {},
  clearError: () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true until initial auth check completes
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(email, password);
      if (!res.success) throw new Error(res.error);

      setToken(res.data.token);
      setAuthed(true);

      // Login response may not include tier — fetch full profile to get it
      const profile = await api.getProfile();
      if (profile.success) {
        setUser({
          id: profile.data.id,
          email: profile.data.email,
          username: profile.data.username,
          walletAddress: profile.data.walletAddress ?? null,
          isAdmin: profile.data.isAdmin ?? false,
          tier: profile.data.tier ?? 'free',
          avatarUrl: profile.data.avatarUrl ?? null,
        });
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
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Clear the httpOnly cookie via the API (best-effort, don't block on failure)
    api.logout().catch(() => {});
    // Clear localStorage fallback
    clearToken();
    setAuthed(false);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const refreshUser = useCallback(async () => {
    const res = await api.getProfile();
    if (res.success) {
      setUser({
        id: res.data.id,
        email: res.data.email,
        username: res.data.username,
        walletAddress: res.data.walletAddress ?? null,
        isAdmin: res.data.isAdmin ?? false,
        tier: res.data.tier ?? 'free',
        avatarUrl: res.data.avatarUrl ?? null,
      });
    }
  }, []);

  // Sync state with token on mount (e.g. page refresh)
  // Check both localStorage token AND httpOnly cookie (via profile fetch)
  useEffect(() => {
    // Always attempt a profile fetch — the httpOnly cookie may authenticate
    // even if localStorage is empty (cookie-based session after migration)
    const hasLocalToken = isAuthenticated();
    
    api.getProfile().then((res) => {
      if (res.success) {
        setAuthed(true);
        setUser({
          id: res.data.id,
          email: res.data.email,
          username: res.data.username,
          walletAddress: res.data.walletAddress ?? null,
          isAdmin: res.data.isAdmin ?? false,
          tier: res.data.tier ?? 'free',
          avatarUrl: res.data.avatarUrl ?? null,
        });
      } else {
        // Neither cookie nor localStorage token is valid
        if (hasLocalToken) clearToken();
        setAuthed(false);
      }
    }).finally(() => setIsLoading(false));
  }, []);

  // Listen for auth-expired event dispatched by the API client on 401
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthed(false);
      setUser(null);
    };
    window.addEventListener('hatcher:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('hatcher:auth-expired', handleAuthExpired);
    };
  }, []);

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
