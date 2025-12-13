'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import * as Sentry from '@sentry/nextjs';
import { apiClient } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId?: string;
  role?: {
    id: string;
    name: string;
  };
  isSystemAdmin?: boolean;
}

interface Cooperative {
  id: string;
  name: string;
  subdomain: string;
  logoUrl?: string | null;
  enabledModules: string[];
}

interface AuthContextType {
  user: User | null;
  cooperative: Cooperative | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSystemAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasModule: (moduleName: string) => boolean;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Handle logout (defined early for use in useEffect)
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCooperative(null);
    // Clear Sentry user context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.setUser(null);
    }
  }, []);

  // Fetch user data function (wrapped in useCallback to avoid stale closures)
  const fetchUserData = useCallback(
    async (_authToken: string) => {
      try {
        const data = await apiClient.get<{ user: User; cooperative: Cooperative }>('/auth/me', {
          skipErrorToast: true, // Don't show toast for auth check failures
        });
        setUser(data.user);
        setCooperative(data.cooperative);

        // Set Sentry user context
        if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
          Sentry.setUser({
            id: data.user.id,
            email: data.user.email,
            username: `${data.user.firstName} ${data.user.lastName}`,
            tenantId: data.cooperative.id,
          });
        }
      } catch {
        // Token invalid, clear auth
        handleLogout();
      } finally {
        setIsLoading(false);
      }
    },
    [handleLogout]
  );

  // Initialize API client with token getter and unauthorized handler on mount
  useEffect(() => {
    // Set token getter with localStorage fallback for initial load
    // This ensures token is available even before state is updated
    apiClient.setTokenGetter(() => {
      // Use state token if available, otherwise fallback to localStorage
      if (token) return token;
      if (typeof window !== 'undefined') {
        return localStorage.getItem('token');
      }
      return null;
    });

    // Set unauthorized handler
    apiClient.setUnauthorizedHandler(() => {
      handleLogout();
    });
  }, [token, handleLogout]);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      // Set token state
      setToken(storedToken);
      // fetchUserData will use the token getter which has localStorage fallback
      // This ensures the API call has the token even if state hasn't updated yet
      fetchUserData(storedToken);
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  const login = async (email: string, password: string) => {
    const data = await apiClient.post<{
      token: string;
      user: User;
      cooperative: Cooperative;
    }>('/auth/login', { email, password }, { skipAuth: true });

    const authToken = data.token;
    localStorage.setItem('token', authToken);
    setToken(authToken);
    setUser(data.user);
    setCooperative(data.cooperative);

    // Set Sentry user context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.setUser({
        id: data.user.id,
        email: data.user.email,
        username: `${data.user.firstName} ${data.user.lastName}`,
        tenantId: data.cooperative.id,
      });
    }
  };

  const logout = () => {
    handleLogout();
  };

  const refreshAuth = async () => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      await fetchUserData(storedToken);
    }
  };

  const hasModule = (moduleName: string): boolean => {
    return cooperative?.enabledModules?.includes(moduleName) || false;
  };

  const value: AuthContextType = {
    user,
    cooperative,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    isSystemAdmin: user?.isSystemAdmin || false,
    login,
    logout,
    hasModule,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
