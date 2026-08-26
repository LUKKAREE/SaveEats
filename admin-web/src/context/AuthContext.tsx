/**
 * AuthContext ของ Admin Web
 * เก็บสถานะการ Login ไว้ที่เดียว ทุกหน้าเรียกใช้ผ่าน useAuth()
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PublicUser } from '@shared/index';
import authService from '../services/authService';

/** หน้าตาของค่าที่ useAuth() คืนกลับมา */
interface AuthContextValue {
  user: PublicUser | null;
  /** true = กำลังเช็คว่ามี session เดิมอยู่ไหม (ตอนเปิดเว็บ) */
  initializing: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(authService.getStoredUser());
  const [initializing, setInitializing] = useState(true);

  // ตอนเปิดเว็บ : เช็คว่า token ที่เก็บไว้ยังใช้ได้ไหม
  useEffect(() => {
    let mounted = true;

    void (async () => {
      if (!authService.getToken()) {
        if (mounted) setInitializing(false);
        return;
      }
      try {
        const fresh = await authService.me();
        if (mounted) setUser(fresh.role === 'admin' ? fresh : null);
      } catch {
        if (mounted) setUser(null);
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    initializing,
    isLoggedIn: user !== null,

    async login(email: string, password: string) {
      const loggedIn = await authService.login(email, password);
      setUser(loggedIn);
      return loggedIn;
    },

    logout() {
      authService.logout();
      setUser(null);
    },
  }), [user, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth ต้องอยู่ภายใต้ <AuthProvider> เท่านั้น');
  return ctx;
}
