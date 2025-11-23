'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setCooperative(data.cooperative);
      } else {
        // Token invalid, clear auth
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setCooperative(null);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
      setCooperative(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const authToken = data.token;

      localStorage.setItem('token', authToken);
      setToken(authToken);
      setUser(data.user);
      setCooperative(data.cooperative);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setCooperative(null);
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
