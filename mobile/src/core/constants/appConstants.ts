/**
 * ค่าคงที่ทั่วไปของแอป
 *
 * *** ค่าที่เกี่ยวกับฐานข้อมูล (role, สถานะ) ย้ายไปอยู่ที่ shared/src/enums.ts แล้ว ***
 * ไฟล์นี้เหลือเฉพาะค่าที่ใช้เฉพาะฝั่งแอปมือถือ
 */
export const APP_NAME = 'SaveEats';
export const APP_TAGLINE = 'ช่วยอาหารดี ๆ ไม่ให้กลายเป็นขยะ';

/** รัศมีค้นหาร้านใกล้เคียง (กิโลเมตร) */
export const RADIUS = {
  MIN: 1,
  MAX: 20,
  DEFAULT: 5,
  OPTIONS: [1, 3, 5, 10, 20],
} as const;

/**
 * จำนวนสูงสุดที่จองได้ต่อครั้ง
 * *** ต้องตรงกับ MAX_QUANTITY_PER_RESERVATION ใน backend/.env ***
 */
export const MAX_RESERVATION_QUANTITY = 5;

/** จำนวนรายการต่อ 1 หน้า */
export const PAGE_SIZE = 20;

/** key ที่ใช้เก็บข้อมูลในเครื่อง */
export const STORAGE_KEYS = {
  TOKEN: '@saveeats/token',
  USER: '@saveeats/user',
  STORE: '@saveeats/store',
} as const;
