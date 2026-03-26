'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type UserRole = 'admin' | 'caller';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  initials: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => void;
  logout: () => void;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<UserRole, User> = {
  admin: {
    id: '1',
    name: 'Dmitry Loukine',
    email: 'dmitry@leadflow.com',
    role: 'admin',
    initials: 'DL',
  },
  caller: {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah@leadflow.com',
    role: 'caller',
    initials: 'SJ',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('leadflow-auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser(parsed.user);
        setHasCompletedOnboarding(parsed.onboarded ?? false);
      } catch {
        // ignore corrupt data
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (user) {
      localStorage.setItem(
        'leadflow-auth',
        JSON.stringify({ user, onboarded: hasCompletedOnboarding }),
      );
    } else {
      localStorage.removeItem('leadflow-auth');
    }
  }, [user, hasCompletedOnboarding, mounted]);

  const login = (_email: string, _password: string, role: UserRole) => {
    setUser(DEMO_USERS[role]);
  };

  const logout = () => {
    setUser(null);
    setHasCompletedOnboarding(false);
  };

  const completeOnboarding = () => setHasCompletedOnboarding(true);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
        hasCompletedOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
