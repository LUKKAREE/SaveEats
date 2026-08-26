/**
 * AuthContext - เก็บสถานะการ Login ไว้ที่เดียว
 *
 * ทุกหน้าจอเรียกใช้ได้ด้วย
 *   const { user, store, login, logout, isSeller } = useAuth();
 *
 * ตัว RootNavigator จะดูค่าจากที่นี่แล้วตัดสินว่าจะพาไปหน้าไหน
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthPayload, MePayload, PublicUser, Store } from '@shared/index';
import { UserRole } from '@shared/index';
import authService from '../features/auth/authService';
import type { RegisterFormData } from '../features/auth/authService';
import { setUnauthorizedHandler } from '../core/services/apiClient';

/** หน้าตาของค่าที่ useAuth() คืนกลับมา */
interface AuthContextValue {
  user: PublicUser | null;
  store: Store | null;
  /** true = กำลังเช็คว่ามี session เดิมอยู่ไหม (ตอนเปิดแอป) */
  initializing: boolean;
  isLoggedIn: boolean;
  isCustomer: boolean;
  isSeller: boolean;
  /** identifier กรอกได้ทั้งอีเมลและเบอร์โทรศัพท์ */
  login: (identifier: string, password: string) => Promise<AuthPayload>;
  register: (form: RegisterFormData) => Promise<AuthPayload>;
  logout: () => Promise<void>;
  refresh: () => Promise<MePayload>;
  /**
   * true = เพิ่งสมัครสมาชิกเสร็จ ต้องพาดูหน้าแนะนำแอปก่อนเข้าใช้งาน
   *
   * เก็บไว้ในหน่วยความจำอย่างเดียว ไม่ได้บันทึกลงเครื่อง
   * เพราะเป็นสถานะชั่วคราวของ "รอบนี้" เท่านั้น
   * คนที่ login ตามปกติจะไม่โดนหน้าแนะนำขวางเด็ดขาด
   */
  showOnboarding: boolean;
  /** ดูหน้าแนะนำจบแล้ว เข้าแอปได้ */
  completeOnboarding: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // ตอนเปิดแอป : อ่าน token ที่เก็บไว้ แล้วเช็คกับ server ว่ายังใช้ได้ไหม
  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const session = await authService.loadSession();
        if (session.token === null) return;

        // มี token ในเครื่อง -> แสดงข้อมูลเดิมไปก่อน ผู้ใช้จะได้ไม่ต้องรอ
        if (mounted) {
          setUser(session.user);
          setStore(session.store);
        }
        // แล้วค่อยเช็คกับ server เงียบ ๆ ว่ายังใช้ได้จริงไหม
        const fresh = await authService.fetchMe();
        if (mounted) {
          setUser(fresh.user);
          setStore(fresh.store);
        }
      } catch {
        // token ใช้ไม่ได้แล้ว -> ถือว่ายังไม่ login
        if (mounted) {
          setUser(null);
          setStore(null);
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // ถ้า token หมดอายุระหว่างใช้งาน apiClient จะเรียกฟังก์ชันนี้
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStore(null);
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    store,
    initializing,
    isLoggedIn: user !== null,
    isCustomer: user?.role === UserRole.CUSTOMER,
    isSeller: user?.role === UserRole.SELLER,
    showOnboarding,

    async login(identifier: string, password: string) {
      const result = await authService.login(identifier, password);
      setUser(result.user);
      setStore(result.store);
      return result;
    },

    async register(form: RegisterFormData) {
      const result = await authService.register(form);
      setUser(result.user);
      setStore(result.store);
      // สมัครใหม่ = ยังไม่รู้จักแอป พาดูหน้าแนะนำก่อนเข้าใช้งาน
      setShowOnboarding(true);
      return result;
    },

    completeOnboarding() {
      setShowOnboarding(false);
    },

    async logout() {
      await authService.logout();
      setUser(null);
      setStore(null);
      // เผื่อกดออกจากระบบระหว่างดูหน้าแนะนำอยู่ จะได้ไม่ค้างข้ามไปหน้า Login
      setShowOnboarding(false);
    },

    /** เรียกหลังจากร้านแก้ไขข้อมูลตัวเอง เพื่ออัปเดตข้อมูลใน context */
    async refresh() {
      const fresh = await authService.fetchMe();
      setUser(fresh.user);
      setStore(fresh.store);
      return fresh;
    },
  }), [user, store, initializing, showOnboarding]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error('useAuth ต้องอยู่ภายใต้ <AuthProvider> เท่านั้น');
  return ctx;
}

export default AuthContext;
