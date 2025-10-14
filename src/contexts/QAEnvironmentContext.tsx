'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@/types';

interface QAEnvironment {
  userId: string;
  userName: string;
  env: {
    os: string;
    device: string;
    version: string;
  };
}

interface QAEnvironmentContextType {
  qaEnvironment: QAEnvironment | null;
  isQAEnvironmentConfigured: boolean;
  setQAEnvironment: (environment: QAEnvironment) => void;
  clearQAEnvironment: () => void;
}

const QAEnvironmentContext = createContext<QAEnvironmentContextType | undefined>(undefined);

interface QAEnvironmentProviderProps {
  children: ReactNode;
}

export function QAEnvironmentProvider({ children }: QAEnvironmentProviderProps) {
  const [qaEnvironment, setQAEnvironmentState] = useState<QAEnvironment | null>(null);

  // 로컬 스토리지에서 QA 환경 정보 로드
  useEffect(() => {
    const savedEnvironment = localStorage.getItem('qa_environment');
    if (savedEnvironment) {
      try {
        const parsed = JSON.parse(savedEnvironment);
        setQAEnvironmentState(parsed);
      } catch (error) {
        console.error('Failed to parse saved QA environment:', error);
        localStorage.removeItem('qa_environment');
      }
    }
  }, []);

  const setQAEnvironment = (environment: QAEnvironment) => {
    setQAEnvironmentState(environment);
    localStorage.setItem('qa_environment', JSON.stringify(environment));
  };

  const clearQAEnvironment = () => {
    setQAEnvironmentState(null);
    localStorage.removeItem('qa_environment');
  };

  const isQAEnvironmentConfigured = qaEnvironment !== null && 
    qaEnvironment.userId !== '' && 
    qaEnvironment.env.os !== '';

  const value = {
    qaEnvironment,
    isQAEnvironmentConfigured,
    setQAEnvironment,
    clearQAEnvironment
  };

  return (
    <QAEnvironmentContext.Provider value={value}>
      {children}
    </QAEnvironmentContext.Provider>
  );
}

export function useQAEnvironment() {
  const context = useContext(QAEnvironmentContext);
  if (context === undefined) {
    throw new Error('useQAEnvironment must be used within a QAEnvironmentProvider');
  }
  return context;
}