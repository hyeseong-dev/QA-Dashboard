import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export function useAutoLogout() {
  const router = useRouter();
  const { logout, user } = useAuth();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const warningTimeoutRef = useRef<NodeJS.Timeout>();
  const lastActivityRef = useRef<Date>(new Date());
  
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000;  // 5 minutes before logout

  const handleLogout = useCallback(async () => {
    await logout();
    router.push('/login?reason=timeout');
    alert('세션이 만료되어 로그아웃되었습니다.');
  }, [logout, router]);

  const showWarning = useCallback(() => {
    const confirmContinue = confirm(
      '5분 후 자동 로그아웃됩니다.\n계속 작업하시려면 확인을 클릭하세요.'
    );
    
    if (confirmContinue) {
      resetTimer();
    }
  }, []);

  const resetTimer = useCallback(() => {
    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Only set timers if user is logged in
    if (!user) return;

    // Set warning timer (25 minutes)
    warningTimeoutRef.current = setTimeout(() => {
      showWarning();
    }, IDLE_TIMEOUT - WARNING_TIME);

    // Set logout timer (30 minutes)
    timeoutRef.current = setTimeout(() => {
      handleLogout();
    }, IDLE_TIMEOUT);

    // Update last activity time
    lastActivityRef.current = new Date();
  }, [user, handleLogout, showWarning]);

  const handleActivity = useCallback(() => {
    const now = new Date();
    const timeSinceLastActivity = now.getTime() - lastActivityRef.current.getTime();
    
    // Only reset timer if it's been more than 1 minute since last activity
    // This prevents excessive timer resets
    if (timeSinceLastActivity > 60000) {
      resetTimer();
    }
  }, [resetTimer]);

  useEffect(() => {
    // Only set up activity listeners if user is logged in
    if (!user) return;

    // Activity events to track
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Start initial timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [user, handleActivity, resetTimer]);

  return { resetTimer };
}