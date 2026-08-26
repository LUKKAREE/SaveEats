/**
 * FilterContext - เก็บตัวกรอง Feed ไว้ที่เดียว
 *
 * *** ทำไมต้องใช้ Context ***
 * หน้าตัวกรอง (FilterScreen) กับหน้า Feed (HomeScreen) เป็นคนละหน้าจอ
 * ถ้าจะส่งค่ากลับด้วย navigation parameter จะยุ่งมาก เพราะ
 *   - React Navigation ไม่แนะนำให้ส่งฟังก์ชัน callback ผ่าน params
 *   - HomeScreen อยู่ในแท็บ ส่วน FilterScreen อยู่ใน stack คนละชั้นกัน
 *
 * เก็บไว้ใน Context แทน ใครอยากอ่านก็เรียก useFilter() ได้เลย
 * FilterScreen กดใช้ -> ค่าเปลี่ยน -> HomeScreen เห็นเองอัตโนมัติ
 *
 * วิธีใช้
 *     const { filters, setFilters, resetFilters, activeCount } = useFilter();
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { FeedSort } from '@shared/index';
import { RADIUS } from '../core/constants/appConstants';

/** ตัวกรองที่ผู้ใช้ปรับได้ */
export interface FeedFilters {
  /** null = ทุกหมวด */
  categoryId: number | null;
  /** null = ไม่จำกัดราคา */
  maxPrice: number | null;
  sort: FeedSort;
  /**
   * true  = แสดงเฉพาะร้านที่อยู่ในรัศมี radiusKm
   * false = แสดงโพสต์ทั้งหมด ไม่สนว่าร้านอยู่ไกลแค่ไหน
   *
   * *** ค่าตั้งต้นเป็น false โดยตั้งใจ ***
   * เดิม Feed กรองระยะทางให้อัตโนมัติเสมอ ผู้ใช้ที่อยู่ไกลจากทุกร้าน
   * จะเห็นหน้าว่างเปล่าโดยไม่รู้สาเหตุ นึกว่าแอปเสียหรือไม่มีของขายจริง ๆ
   * เปลี่ยนเป็นให้เห็นของทั้งหมดก่อน แล้วผู้ใช้ค่อยเลือกกรองเองถ้าอยากได้ร้านใกล้
   */
  nearbyOnly: boolean;
  /** ใช้ได้เมื่อเปิด nearbyOnly และผู้ใช้อนุญาตให้เข้าถึงตำแหน่งแล้วเท่านั้น */
  radiusKm: number;
}

/** ค่าตั้งต้น = ไม่กรองอะไรเลย เห็นโพสต์ทั้งหมด */
export const DEFAULT_FILTERS: FeedFilters = {
  categoryId: null,
  maxPrice: null,
  sort: 'newest',
  nearbyOnly: false,
  radiusKm: RADIUS.DEFAULT,
};

interface FilterContextValue {
  filters: FeedFilters;
  /** แก้ทีละ field ได้ ไม่ต้องส่งมาครบทุกตัว */
  setFilters: (patch: Partial<FeedFilters>) => void;
  /** ล้างกลับเป็นค่าตั้งต้น */
  resetFilters: () => void;
  /**
   * จำนวนตัวกรองที่กำลังใช้อยู่
   * เอาไปโชว์เป็นจุดแดงบนปุ่มตัวกรอง ให้ผู้ใช้รู้ว่ากรองอยู่กี่อย่าง
   */
  activeCount: number;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }): JSX.Element {
  const [filters, setFiltersState] = useState<FeedFilters>(DEFAULT_FILTERS);

  const setFilters = useCallback((patch: Partial<FeedFilters>): void => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
  }, []);

  const resetFilters = useCallback((): void => {
    setFiltersState(DEFAULT_FILTERS);
  }, []);

  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.categoryId !== null) n += 1;
    if (filters.maxPrice !== null) n += 1;
    if (filters.sort !== DEFAULT_FILTERS.sort) n += 1;
    // นับ "ใกล้ฉัน" เป็น 1 ตัวกรอง ส่วนเลขรัศมีไม่นับซ้ำ
    // เพราะถ้าปิดสวิตช์อยู่ เลขรัศมีไม่มีผลอะไรกับผลลัพธ์เลย
    if (filters.nearbyOnly) n += 1;
    return n;
  }, [filters]);

  const value = useMemo(
    () => ({ filters, setFilters, resetFilters, activeCount }),
    [filters, setFilters, resetFilters, activeCount]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (ctx === null) {
    throw new Error('useFilter ต้องอยู่ภายใน <FilterProvider> เท่านั้น');
  }
  return ctx;
}

export default FilterContext;
