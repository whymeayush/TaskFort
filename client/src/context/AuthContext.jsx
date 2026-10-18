import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_PERSONAS = [
  {
    id: 'alice',
    name: 'Alice Chen',
    email: 'alice.chen@newtonite.internal',
    role: 'Central Operations — Team Lead',
    team: 'OPS',
    badge: 'OPS LEAD',
    color: '#8b5cf6'
  },
  {
    id: 'bob',
    name: 'Bob Miller',
    email: 'bob.miller@newtonite.internal',
    role: 'Central Operations — Operator',
    team: 'OPS',
    badge: 'OPS MEMBER',
    color: '#3b82f6'
  },
  {
    id: 'david',
    name: 'David Kim',
    email: 'david.kim@newtonite.internal',
    role: 'Core Engineering — Lead Architect',
    team: 'ENG',
    badge: 'ENG LEAD',
    color: '#f59e0b'
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    email: 'elena.rostova@newtonite.internal',
    role: 'Regulatory Compliance — Lead Officer',
    team: 'COMPLIANCE',
    badge: 'COMPLIANCE LEAD',
    color: '#ec4899'
  },
  {
    id: 'marcus',
    name: 'Marcus Vance',
    email: 'marcus.vance@newtonite.internal',
    role: 'Payment Operations — Specialist',
    team: 'PAYMENTS',
    badge: 'PAYMENTS',
    color: '#10b981'
  },
  {
    id: 'admin',
    name: 'System Administrator',
    email: 'admin@newtonite.internal',
    role: 'Platform Owner — Full Override',
    team: 'ALL',
    badge: 'SYS ADMIN',
    color: '#64748b'
  }
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('newtonite_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = localStorage.getItem('newtonite_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to load profile:', err);
        localStorage.removeItem('newtonite_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('newtonite_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { token: newToken, user: userData } = res.data;
    localStorage.setItem('newtonite_token', newToken);
    setToken(newToken);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('newtonite_token');
    localStorage.removeItem('newtonite_active_user_id');
    setToken(null);
    setUser(null);
  };

  const switchPersona = async (persona) => {
    setLoading(true);
    try {
      const password = persona.id === 'admin' ? 'AdminSecret2026!' : 'Password123!';
      const res = await api.post('/auth/login', {
        email: persona.email,
        password
      });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem('newtonite_token', newToken);
      setToken(newToken);
      setUser(userData);
    } catch (err) {
      console.error('Persona switch error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      switchPersona
    }}>
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
