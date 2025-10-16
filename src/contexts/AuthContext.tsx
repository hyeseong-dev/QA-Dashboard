'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (userData: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  user_name: string;
  role: 'Admin' | 'Tester';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async (skipLoading = false) => {
    try {
      if (!skipLoading) setLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setUser(null);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        // 폴링 시에는 사용자 정보가 실제로 변경된 경우에만 업데이트
        if (!skipLoading || JSON.stringify(userData) !== JSON.stringify(user)) {
          setUser(userData);
        }
      } else {
        // 세션이 만료되었거나 로그아웃된 경우
        localStorage.removeItem('auth_token');
        
        // 폴링 중 세션이 만료된 경우 사용자에게 알림
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (!skipLoading) {
        localStorage.removeItem('auth_token');
        setUser(null);
      }
    } finally {
      if (!skipLoading) setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || '로그인에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: '로그인 요청 중 오류가 발생했습니다.' };
    }
  };

  const signup = async (userData: SignupData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('auth_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || '회원가입에 실패했습니다.' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: '회원가입 요청 중 오류가 발생했습니다.' };
    }
  };


  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        // Call logout API to deactivate session
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear all authentication and session data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('saved_email');
      localStorage.removeItem('saved_password');
      
      // Clear QA Environment data
      localStorage.removeItem('qa_environment');
      
      // Clear any other application-specific data
      localStorage.removeItem('project_preferences');
      
      setUser(null);
    }
  };

  useEffect(() => {
    // 초기 인증 체크
    checkAuth();
  }, []);
  

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}