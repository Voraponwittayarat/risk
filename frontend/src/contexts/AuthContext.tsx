import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

export type UserRole = 'admin' | 'rm_committee' | 'head' | 'staff';

export interface User {
  id: number;
  username?: string;
  name: string;
  department_id: number;
  department_id2?: number;
  role: UserRole;
  accessrules?: string;
  rmStatus?: string;
  priority?: string;
  departmentGroup?: number;
  teamId?: number;
  require_password_change?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function decodeToken(token: string): User {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((character) => `%${(`00${character.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join(''),
  );
  const payload = JSON.parse(jsonPayload);
  if (payload.exp && payload.exp * 1000 <= Date.now()) {
    throw new Error('Token expired');
  }
  return {
    id: payload.sub,
    username: payload.username,
    name: payload.name,
    department_id: payload.departmentId,
    department_id2: payload.departmentId2,
    role: payload.role || (payload.accessrules === '1' ? 'admin' : 'staff'),
    accessrules: payload.accessrules,
    rmStatus: payload.rmStatus,
    priority: payload.priority,
    departmentGroup: payload.departmentGroup,
    teamId: payload.teamId,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return null;
    try { return decodeToken(storedToken); } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => {
    const storedToken = localStorage.getItem('token');
    if (!storedToken) return null;
    try { decodeToken(storedToken); return storedToken; } catch { localStorage.removeItem('token'); return null; }
  });

  useEffect(() => {
    if (!token) {
      delete axios.defaults.headers.common.Authorization;
      localStorage.removeItem('token');
      setUser(null);
      return;
    }

    try {
      axios.defaults.headers.common.Authorization = `Bearer ${token}`;
      localStorage.setItem('token', token);
      setUser(decodeToken(token));
    } catch {
      delete axios.defaults.headers.common.Authorization;
      localStorage.removeItem('token');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const login = async (username: string, password: string) => {
    const response = await axios.post('/auth/login', { username, password });
    setToken(response.data.access_token);
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => setToken(null);
  const isAdmin = user?.role === 'admin' || user?.accessrules === '1';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
