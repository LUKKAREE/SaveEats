/**
 * BadgeContext - เก็บ "ตัวเลขจุดแดง" ไว้ที่เดียว
 *
 * *** ทำไมต้องใช้ Context ***
 * จุดแดงต้องโผล่ 2 ที่ที่อยู่คนละชั้นกันในต้นไม้ของ Navigation
 *   - ไอคอนกระดิ่ง อยู่ในหัวของ HomeScreen
 *   - แท็บ "การจอง" อยู่ใน CustomerTabs ซึ่งเป็นตัวครอบ HomeScreen อีกที
 * ถ้าต่างคนต่างยิง API ตัวเลขจะไม่ตรงกัน (เช่นอ่านแจ้งเตือนแล้ว แต่แท็บยังค้างเลขเดิม)
 * เก็บไว้ที่เดียวแล้วให้ทุกที่อ่านจากก้อนเดียวกัน ตัวเลขจึงขยับพร้อมกันเสมอ
 *
 * *** เลขสองตัวนี้นับคนละอย่าง โดยตั้งใจ ***
 *   unreadNotifications = แจ้งเตือนที่ยังไม่ได้อ่าน        -> ติดที่กระดิ่ง
 *   pendingReservations = การจองที่ยัง "ต้องไปรับ"        -> ติดที่แท็บการจอง
 * ถ้าเอาเลขเดียวกันไปแปะทั้งสองที่ ผู้ใช้จะสับสนว่าตกลงต้องไปกดตรงไหน
 *
 * *** รีเฟรชตอนไหน ***
 *   1. ตอนล็อกอินเสร็จ
 *   2. ตอนสลับกลับเข้าแอปจากพื้นหลัง (AppState)
 *   3. ตอนหน้าจอที่เกี่ยวข้องเรียก refresh() เอง เช่น กดอ่านแจ้งเตือน / จองสำเร็จ
 * ไม่ได้ยิงถี่ ๆ ทุกวินาที เพราะเปลืองเน็ตของผู้ใช้และไม่ได้ทำให้ดีขึ้นจริง
 *
 * วิธีใช้
 *     const { unreadNotifications, pendingReservations, refresh } = useBadges();
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import notificationService from '../core/services/notificationService';
import reservationService from '../features/reservation/reservationService';
import { useAuth } from './AuthContext';

interface BadgeContextValue {
  /** จำนวนแจ้งเตือนที่ยังไม่ได้อ่าน (0 = ไม่ต้องแสดงจุดแดง) */
  unreadNotifications: number;
  /** จำนวนการจองที่ยังต้องไปรับ */
  pendingReservations: number;
  /** ดึงตัวเลขใหม่ทั้งสองตัว */
  refresh: () => Promise<void>;
  /**
   * ปรับเลขแจ้งเตือนทันทีโดยไม่ต้องรอ server
   * ใช้ตอนกด "อ่านทั้งหมด" เพื่อให้จุดแดงหายทันตา แล้วค่อยให้ refresh() ตามมายืนยัน
   */
  setUnreadNotifications: (count: number) => void;
}

const BadgeContext = createContext<BadgeContextValue | undefined>(undefined);

export function BadgeProvider({ children }: { children: ReactNode }): JSX.Element {
  const { isLoggedIn, isCustomer } = useAuth();

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [pendingReservations, setPendingReservations] = useState(0);

  /*
   * เก็บค่าล่าสุดของ isLoggedIn/isCustomer ไว้ใน ref ด้วย
   * เพื่อให้ refresh() มี dependency ว่างได้ ตัวฟังก์ชันจึงไม่เปลี่ยนตัวตนทุกครั้งที่ render
   * (ถ้าฟังก์ชันเปลี่ยนตัวตน useFocusEffect ในหน้าจอที่เรียกมันจะวนซ้ำไม่จบ)
   */
  const authRef = useRef({ isLoggedIn, isCustomer });
  authRef.current = { isLoggedIn, isCustomer };

  const refresh = useCallback(async (): Promise<void> => {
    if (!authRef.current.isLoggedIn) {
      setUnreadNotifications(0);
      setPendingReservations(0);
      return;
    }

    /*
     * ยิงพร้อมกันด้วย allSettled ไม่ใช่ all
     * ถ้าเส้นใดเส้นหนึ่งพัง (เช่นเน็ตหลุดกลางคัน) อีกเส้นต้องยังอัปเดตได้
     * และที่สำคัญคือห้าม throw ออกไป เพราะจุดแดงพังไม่ใช่เรื่องที่ควรทำให้ทั้งหน้าจอแดง
     */
    const [notiResult, reservationResult] = await Promise.allSettled([
      notificationService.unreadCount(),
      authRef.current.isCustomer ? reservationService.listMine('confirmed') : Promise.resolve([]),
    ]);

    if (notiResult.status === 'fulfilled') {
      setUnreadNotifications(notiResult.value);
    }
    if (reservationResult.status === 'fulfilled') {
      setPendingReservations(reservationResult.value.length);
    }
  }, []);

  // ล็อกอิน/ล็อกเอาต์แล้วดึงใหม่ทันที
  useEffect(() => {
    void refresh();
  }, [isLoggedIn, isCustomer, refresh]);

  // สลับกลับเข้าแอปจากพื้นหลัง = ตัวเลขอาจเก่าไปแล้ว ดึงใหม่
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const value = useMemo<BadgeContextValue>(
    () => ({ unreadNotifications, pendingReservations, refresh, setUnreadNotifications }),
    [unreadNotifications, pendingReservations, refresh]
  );

  return <BadgeContext.Provider value={value}>{children}</BadgeContext.Provider>;
}

export function useBadges(): BadgeContextValue {
  const ctx = useContext(BadgeContext);
  if (ctx === undefined) throw new Error('useBadges ต้องอยู่ภายใต้ BadgeProvider');
  return ctx;
}

/**
 * แปลงตัวเลขเป็นข้อความบนจุดแดง
 * เกิน 9 แสดงเป็น 9+ เพราะวงกลมเล็ก ๆ ใส่เลขสามหลักแล้วอ่านไม่ออก
 */
export function badgeLabel(count: number): string {
  return count > 9 ? '9+' : String(count);
}

export default BadgeContext;
