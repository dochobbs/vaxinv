import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const WARN_MS = 25 * 60 * 1000;    // warn at 25 minutes

export default function SessionTimeout() {
  const { user, logout } = useAuth();
  const timerRef = useRef(null);
  const warnRef = useRef(null);

  const resetTimers = useCallback(() => {
    clearTimeout(timerRef.current);
    clearTimeout(warnRef.current);
    if (!user) return;

    warnRef.current = setTimeout(() => {
      if (window.confirm('Session expiring in 5 minutes. Continue?')) {
        resetTimers();
      }
    }, WARN_MS);

    timerRef.current = setTimeout(() => {
      logout();
    }, TIMEOUT_MS);
  }, [user, logout]);

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetTimers();

    events.forEach(e => window.addEventListener(e, handleActivity));
    resetTimers();

    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimeout(timerRef.current);
      clearTimeout(warnRef.current);
    };
  }, [user, resetTimers]);

  return null;
}
