'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getToken, setToken, clearToken, login as apiLogin, getMe } from '@/lib/api';

interface User { userId: string; name: string; role: string; department?: string; email?: string; }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, login: async () => ({ userId:'', name:'', role:'' }), logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tok = getToken();
    if (tok) {
      getMe().then(u => { setUser(u); setLoading(false); }).catch(() => { clearToken(); setLoading(false); });
    } else setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<User> => {
    const data = await apiLogin(username, password);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;           // ← return user so login page can read role for routing
  };

  const logout = () => { clearToken(); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
