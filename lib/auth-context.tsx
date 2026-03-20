'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { api, getToken, setToken, clearToken, isAuthenticated } from './api';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const [authed, setAuthed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loginInProgress = useRef(false);
  // Track if wallet has ever connected in this session (to distinguish
  // "not yet connected on mount" from "user disconnected")
  const hasConnectedRef = useRef(false);

  // Encode Uint8Array → base64 (browser-safe, no bs58 needed)
  function toBase64(bytes: Uint8Array): string {
    return btoa(String.fromCharCode(...Array.from(bytes)));
  }

  const login = useCallback(async () => {
    if (!publicKey || !signMessage || loginInProgress.current) return;
    loginInProgress.current = true;
    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = publicKey.toString();

      // 1. Request challenge
      const challengeRes = await api.challenge(walletAddress);
      if (!challengeRes.success) throw new Error(challengeRes.error);

      // 2. Sign message with wallet
      const msgBytes = new TextEncoder().encode(challengeRes.data.message);
      const sigBytes = await signMessage(msgBytes);

      // 3. Verify with API → get JWT
      const verifyRes = await api.verify(walletAddress, toBase64(sigBytes));
      if (!verifyRes.success) throw new Error(verifyRes.error);

      setToken(verifyRes.data.token);
      setAuthed(true);
    } catch (e) {
      setError((e as Error).message);
      setAuthed(false);
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
    }
  }, [publicKey, signMessage]);

  const logout = useCallback(() => {
    clearToken();
    setAuthed(false);
    disconnect();
  }, [disconnect]);

  // Auto-login when wallet connects; clear only on explicit disconnect
  useEffect(() => {
    if (connected && publicKey) {
      hasConnectedRef.current = true;
      if (!isAuthenticated()) {
        login();
      } else {
        // Token already in localStorage — trust it until the API rejects it
        setAuthed(true);
      }
    }
    // Only wipe token if the wallet was previously connected and is now gone
    // (i.e. user clicked Disconnect). NOT on initial page load where connected=false.
    if (!connected && hasConnectedRef.current) {
      clearToken();
      setAuthed(false);
    }
  }, [connected, publicKey, login]);

  // Sync state with token on mount (e.g. page refresh)
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  // Listen for auth-expired event dispatched by the API client on 401
  useEffect(() => {
    const handleAuthExpired = () => {
      setAuthed(false);
    };
    window.addEventListener('hatcher:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('hatcher:auth-expired', handleAuthExpired);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: authed, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { getToken };
