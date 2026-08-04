import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  name: string;
  department_id: number;
  role?: string;
  role_name?: string;
  accessrules?: string;
  rmStatus?: string;
  priority?: string;
  departmentGroup?: number;
  teamId?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (usernameOrRole: string, password?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    // Configure axios defaults when token changes
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      
      // Safe UTF-8 decode for JWT payload
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        setUser({
          id: payload.sub,
          name: payload.name,
          department_id: payload.departmentId,
          role: payload.accessrules || 'user',
          role_name: payload.name,
          accessrules: payload.accessrules,
          rmStatus: payload.rmStatus,
          priority: payload.priority,
          departmentGroup: payload.departmentGroup,
          teamId: payload.teamId,
        });
      } catch (e) {
        console.error('Invalid token format');
        logout();
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
    }
  }, [token]);

  const login = async (usernameOrRole: string, password?: string) => {
    try {
      let response;
      if (password !== undefined) {
        response = await axios.post('http://localhost:3000/auth/login', {
          username: usernameOrRole,
          password
        });
      } else {
        response = await axios.post('http://localhost:3000/auth/mock-role', {
          role: usernameOrRole
        });
      }
      setToken(response.data.access_token);
      setUser(response.data.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
