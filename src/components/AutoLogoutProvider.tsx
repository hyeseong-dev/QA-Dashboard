'use client';

import { useAutoLogout } from '@/hooks/useAutoLogout';
import { ReactNode } from 'react';

interface AutoLogoutProviderProps {
  children: ReactNode;
}

export function AutoLogoutProvider({ children }: AutoLogoutProviderProps) {
  useAutoLogout();
  return <>{children}</>;
}