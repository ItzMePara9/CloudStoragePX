import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, BrandingSettings } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  branding: BrandingSettings | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  login: (loginText: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  setupOwner: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfigured, setIsConfigured] = useState(true);

  const initAuth = useCallback(async () => {
    try {
      // Check setup status first
      const setupRes = await api.getSetupStatus();
      setIsConfigured(setupRes.isConfigured);

      if (!setupRes.isConfigured) {
        setIsLoading(false);
        return;
      }

      // Check current session
      const meRes = await api.getMe();
      if (meRes.authenticated && meRes.user) {
        setUser(meRes.user);
      } else {
        setUser(null);
      }
      setBranding(meRes.branding);
    } catch (err) {
      console.error('Failed to initialize authentication:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  const login = async (loginText: string, password: string) => {
    const res = await api.login({ login: loginText, password });
    if (res.success && res.user) {
      setUser(res.user);
      const meRes = await api.getMe();
      setBranding(meRes.branding);
    }
  };

  const register = async (username: string, email: string, password: string) => {
    const res = await api.register({ username, email, password });
    if (res.success && res.user) {
      setUser(res.user);
      const meRes = await api.getMe();
      setBranding(meRes.branding);
    }
  };

  const setupOwner = async (username: string, email: string, password: string) => {
    const res = await api.setupOwner({ username, email, password });
    if (res.success && res.user) {
      setUser(res.user);
      setIsConfigured(true);
      const meRes = await api.getMe();
      setBranding(meRes.branding);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const meRes = await api.getMe();
      if (meRes.authenticated && meRes.user) {
        setUser(meRes.user);
      }
      if (meRes.branding) {
        setBranding(meRes.branding);
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        branding,
        isAuthenticated: !!user,
        isLoading,
        isConfigured,
        login,
        register,
        setupOwner,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
