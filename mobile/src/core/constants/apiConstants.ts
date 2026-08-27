/**
 * ที่อยู่ของ Backend และรายชื่อ Endpoint ทั้งหมด
 *
 * ==========================================================
 *  *** จุดที่ต้องแก้บ่อยที่สุดในโปรเจกต์นี้ อ่านให้ดี ***
 * ==========================================================
 *
 * ปัญหา: มือถือเรียก http://localhost:3000 ไม่ได้
 *        เพราะคำว่า localhost บนมือถือ หมายถึงตัวมือถือเอง ไม่ใช่คอมของเรา
 *
 * วิธีแก้:
 *   1. เปิด Command Prompt บนคอมที่รัน Backend แล้วพิมพ์  ipconfig
 *   2. ดูบรรทัด IPv4 Address จะได้เลขประมาณ 192.168.1.35
 *   3. เอาเลขนั้นมาใส่ที่ DEV_HOST ข้างล่าง
 *   4. มือถือกับคอมต้องต่อ Wi-Fi วงเดียวกัน
 *
 * เช็คว่าใช้ได้ไหม: เปิดเบราว์เซอร์บนมือถือ พิมพ์
 *   http://192.168.1.35:3000/api/health
 * ถ้าเห็นข้อความ JSON แปลว่าต่อได้แล้ว
 *
 * *** IP เปลี่ยนทุกครั้งที่ย้ายที่ / เปลี่ยน Wi-Fi ต้องมาแก้ใหม่ ***
 */

// <<<< แก้เลข IP ตรงนี้ >>>>
const DEV_HOST = '192.168.10.79';
const DEV_PORT = 3000;

export const BASE_URL = `http://${DEV_HOST}:${DEV_PORT}`;
export const API_URL = `${BASE_URL}/api`;

/** timeout ของการเรียก API (มิลลิวินาที) */
export const API_TIMEOUT = 15000;

/** โฟลเดอร์รูปที่ backend เก็บไว้ */
export type ImageFolder = 'food' | 'store' | 'profile';

/**
 * แปลงชื่อไฟล์รูปในฐานข้อมูล ให้เป็น URL เต็มที่แอปโหลดได้
 * @param filename ชื่อไฟล์ เช่น '1723-abc.jpg' (เป็น null ได้)
 */
export function imageUrl(filename: string | null | undefined, folder: ImageFolder = 'food'): string | null {
  if (!filename) return null;
  if (filename.startsWith('http')) return filename; // เผื่อกรณีเก็บ URL เต็มมาแล้ว
  return `${BASE_URL}/uploads/${folder}/${filename}`;
}

/** รายชื่อ Endpoint ทั้งหมด รวมไว้ที่เดียว จะได้ไม่พิมพ์ URL ผิด */
export const ENDPOINTS = {
  // Auth
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  UPDATE_PROFILE: '/auth/me',   // PUT ที่ path เดียวกับ GET /auth/me
  CHANGE_PASSWORD: '/auth/password',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',

  // หมวดหมู่
  CATEGORIES: '/categories',

  // Feed / โพสต์
  POSTS: '/posts',
  MY_POSTS: '/posts/my',
  POST_DETAIL: (id: number): string => `/posts/${id}`,

  // ร้านโปรด
  FAVORITES: '/favorites',
  FAVORITE_IDS: '/favorites/ids',
  FAVORITE_ONE: (storeId: number): string => `/favorites/${storeId}`,

  // ร้านค้า
  STORES: '/stores',
  STORES_NEARBY: '/stores/nearby',
  MY_STORE: '/stores/me',
  STORE_DETAIL: (id: number): string => `/stores/${id}`,
  STORE_REVIEWS: (id: number): string => `/stores/${id}/reviews`,

  // เมนูอาหาร
  FOODS: '/foods',
  MY_FOODS: '/foods/my',
  FOOD_DETAIL: (id: number): string => `/foods/${id}`,

  // การจอง
  RESERVATIONS: '/reservations',
  MY_RESERVATIONS: '/reservations/my',
  RESERVATION_DETAIL: (id: number): string => `/reservations/${id}`,
  CANCEL_RESERVATION: (id: number): string => `/reservations/${id}/cancel`,
  VERIFY_RESERVATION: '/reservations/verify',
  STORE_RESERVATIONS: '/store/reservations',

  // รีวิว
  REVIEWS: '/reviews',
  MY_REVIEWS: '/reviews/my',

  // แจ้งปัญหา
  REPORTS: '/reports',
  MY_REPORTS: '/reports/my',

  // แจ้งเตือน
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_ONE: (id: number): string => `/notifications/${id}`,
  UNREAD_COUNT: '/notifications/unread-count',
  READ_NOTIFICATION: (id: number): string => `/notifications/${id}/read`,
  READ_ALL: '/notifications/read-all',

  // สุขภาพระบบ (ใช้ทดสอบว่าต่อ Backend ได้ไหม)
  HEALTH: '/health',
} as const;
