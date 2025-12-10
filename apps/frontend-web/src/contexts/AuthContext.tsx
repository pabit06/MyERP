'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const handleLogout = React.useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCooperative(null);
    // Clear Sentry user context
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.setUser(null);
    }
  }, []);

  // Initialize API client with token getter and unauthorized handler
  useEffect(() => {
    // Set token getter
    apiClient.setTokenGetter(() => token);

    // Set unauthorized handler
    apiClient.setUnauthorizedHandler(() => {
      handleLogout();
    });
  }, [token, handleLogout]);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetchUserData(storedToken);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchUserData = async (_authToken: string) => {
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
  };

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
