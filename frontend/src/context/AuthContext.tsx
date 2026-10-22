import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { api, clearStoredAuth, getStoredToken } from '../api/client';
import { getMe } from '../api/auth';
import type { AuthResponse, Role, User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (data: AuthResponse, rememberMe?: boolean) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Sync token in Axios common header
  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  const signOut = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const signIn = useCallback((data: AuthResponse, rememberMe = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    const altStorage = rememberMe ? sessionStorage : localStorage;

    altStorage.removeItem('token');
    altStorage.removeItem('user');

    storage.setItem('token', data.token);
    storage.setItem('user', JSON.stringify(data.user));

    api.defaults.headers.common.Authorization = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const activeToken = getStoredToken();
    if (!activeToken) {
      setLoading(false);
      return;
    }
    try {
      const { user: freshUser } = await getMe();
      setUser(freshUser);
      const isLocal = !!localStorage.getItem('token');
      (isLocal ? localStorage : sessionStorage).setItem('user', JSON.stringify(freshUser));
    } catch {
      // If error occurs, client interceptor will handle 401s
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch me on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Session expired event handler
  useEffect(() => {
    const handleExpired = () => {
      signOut();
    };
    window.addEventListener('hirelens:session-expired', handleExpired);
    return () => window.removeEventListener('hirelens:session-expired', handleExpired);
  }, [signOut]);

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
