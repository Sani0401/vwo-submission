import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { User } from '../types';
import { authAPI } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin' | 'viewer';
    phone?: string;
    location?: string;
    website?: string;
    bio?: string;
  }) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start with loading true to check localStorage
    error: null,
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem('auth');
    if (savedAuth) {
      try {
        const parsedAuth = JSON.parse(savedAuth);
        console.log('🔄 Loading auth state from localStorage:', parsedAuth);
        setState(parsedAuth);
      } catch (error) {
        console.error('Failed to parse saved auth state:', error);
        localStorage.removeItem('auth');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      console.log('🔍 No saved auth state found in localStorage');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Save auth state to localStorage whenever it changes
  useEffect(() => {
    if (state.isAuthenticated && state.user && state.token) {
      console.log('💾 Saving auth state to localStorage:', state);
      localStorage.setItem('auth', JSON.stringify(state));
    } else if (!state.isAuthenticated) {
      console.log('🗑️ Removing auth state from localStorage');
      localStorage.removeItem('auth');
    }
  }, [state]);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await authAPI.login({ email, password });
      const result = response.data; // This is the transformed result from API service
      
      const newState = {
        user: {
          ...result.user,
          role: result.user.role.toLowerCase() as 'user' | 'admin' | 'viewer'
        },
        token: result.token, // Use the transformed token field
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
      console.log('🔐 Login successful, setting new state:', newState);
      setState(newState);
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
      }));
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'user' | 'admin' | 'viewer';
    phone?: string;
    location?: string;
    website?: string;
    bio?: string;
  }) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await authAPI.register(userData);
      const result = response.data; // This is the transformed result from API service
      
      setState({
        user: {
          ...result.user,
          role: result.user.role.toLowerCase() as 'user' | 'admin' | 'viewer'
        },
        token: result.token, // Use the transformed token field
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(() => {
    if (state.token) {
      authAPI.logout(state.token).catch(console.error);
    }
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  }, [state.token]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    register,
    logout,
    clearError,
  }), [state, login, register, logout, clearError]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
