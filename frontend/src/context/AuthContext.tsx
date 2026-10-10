import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { apiFetch, setTokens, clearTokens, getAccessToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  register: (email: string, name: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoUser: (role: 'owner' | 'member' | 'viewer') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = async () => {
    try {
      const data = await apiFetch<User>('/auth/me/');
      setUser(data);
    } catch {
      setUser(null);
      clearTokens();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (getAccessToken()) {
      fetchMe();
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password = 'password123') => {
    const data = await apiFetch<{ access: string; refresh: string; user: User }>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
    setTokens(data.access, data.refresh);
    setUser(data.user);
  };

  const register = async (email: string, name: string, password = 'password123') => {
    await apiFetch('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), name, password }),
    });
    await login(email, password);
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    window.location.href = '/login';
  };

  const switchDemoUser = async (role: 'owner' | 'member' | 'viewer') => {
    const demoEmail = `${role}@projectflow.dev`;
    await login(demoEmail, 'password123');
    window.location.reload();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, switchDemoUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
