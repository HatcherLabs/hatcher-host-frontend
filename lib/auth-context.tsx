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
  emailVerified: boolean;
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
      setUser({
        id: res.data.user.id,
        email: res.data.user.email,
        username: res.data.user.username,
        walletAddress: res.data.user.walletAddress ?? null,
        isAdmin: res.data.user.isAdmin ?? false,
        tier: (res.data.user as any).tier ?? 'free',
        emailVerified: (res.data.user as any).emailVerified ?? false,
      });
      setAuthed(true);
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

      setToken(res.data.token);
      setUser({
        id: res.data.user.id,
        email: res.data.user.email,
        username: res.data.user.username,
        walletAddress: null,
        isAdmin: false,
        tier: 'free',
        emailVerified: false,
      });
      setAuthed(true);
    } catch (e) {
      setError((e as Error).message);
      setAuthed(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAuthed(false);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // Sync state with token on mount (e.g. page refresh)
  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true);
      api.getProfile().then((res) => {
        if (res.success) {
          setUser({
            id: res.data.id,
            email: res.data.email,
            username: res.data.username,
            walletAddress: res.data.walletAddress ?? null,
            isAdmin: res.data.isAdmin ?? false,
            tier: (res.data as any).tier ?? 'free',
            emailVerified: (res.data as any).emailVerified ?? false,
          });
        } else {
          clearToken();
          setAuthed(false);
        }
      }).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
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
    <AuthContext.Provider value={{ isAuthenticated: authed, isLoading, error, user, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { getToken };
