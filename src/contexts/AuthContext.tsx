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
  realtimeStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
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
  const [realtimeStatus, setRealtimeStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  
  // SSE 관련 ref
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

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
        if (skipLoading && user) {
          console.log('Session expired - logged out automatically');
          setUser(null);
        } else if (!skipLoading) {
          setUser(null);
        }
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

  // SSE 연결 함수
  const connectToRealtime = () => {
    const token = localStorage.getItem('auth_token');
    if (!token || !user) {
      return;
    }
    
    // 기존 연결 정리
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    
    setRealtimeStatus('connecting');
    
    try {
      const eventSource = new EventSource(`/api/realtime?token=${encodeURIComponent(token)}`);
      
      eventSource.onopen = () => {
        console.log('SSE 연결됨');
        setRealtimeStatus('connected');
        reconnectAttempts.current = 0;
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'session_change' || data.type === 'user_status_change') {
            // 세션 변경 시 인증 상태 재확인
            checkAuth(true);
            
            // 사용자 페이지에 실시간 업데이트 알림
            window.dispatchEvent(new CustomEvent('sse_session_change', { 
              detail: data 
            }));
          } else if (data.type === 'ping') {
            // Keep-alive ping
            console.log('SSE ping received');
          } else if (data.type === 'connected') {
            console.log('SSE 초기 연결:', data.message);
          }
        } catch (error) {
          console.error('SSE 메시지 파싱 오류:', error);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE 오류:', error);
        setRealtimeStatus('error');
        eventSource.close();
        
        // 재연결 시도
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log(`SSE 재연결 시도 ${reconnectAttempts.current}/${maxReconnectAttempts}`);
            connectToRealtime();
          }, delay);
        } else {
          console.log('SSE 재연결 포기 - 폴링으로 전환');
          setRealtimeStatus('disconnected');
        }
      };
      
      eventSourceRef.current = eventSource;
      
    } catch (error) {
      console.error('SSE 연결 생성 오류:', error);
      setRealtimeStatus('error');
    }
  };
  
  // SSE 연결 해제
  const disconnectFromRealtime = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    setRealtimeStatus('disconnected');
    reconnectAttempts.current = 0;
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
      // SSE 연결 해제
      disconnectFromRealtime();
      
      // Always clear local storage and state
      localStorage.removeItem('auth_token');
      localStorage.removeItem('saved_email');
      localStorage.removeItem('saved_password');
      setUser(null);
    }
  };

  useEffect(() => {
    // 초기 인증 체크
    checkAuth();
  }, []);
  
  // 사용자 상태 변경 시 SSE 연결 관리
  useEffect(() => {
    if (user) {
      // 로그인된 경우 SSE 연결 시도
      connectToRealtime();
    } else {
      // 로그아웃된 경우 SSE 연결 해제
      disconnectFromRealtime();
    }
    
    return () => {
      disconnectFromRealtime();
    };
  }, [user]);
  
  // SSE 실패 시 폴백 폴링
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (user && realtimeStatus === 'disconnected') {
      console.log('SSE 연결 실패 - 폴링으로 폴백');
      interval = setInterval(() => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          checkAuth(true);
        }
      }, 10000); // SSE 실패 시 10초 폴링
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, realtimeStatus]);

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    checkAuth,
    realtimeStatus
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