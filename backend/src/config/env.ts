/**
 * รวมค่าจากไฟล์ .env ไว้ที่เดียว
 * ที่อื่นในโปรเจกต์ให้ import ไฟล์นี้ ห้ามอ่าน process.env ตรง ๆ กระจายทั้งโปรเจกต์
 *
 * ข้อดีของการทำเป็น TypeScript
 *   ค่าใน process.env มีชนิดเป็น string | undefined เสมอ
 *   ไฟล์นี้แปลงให้เป็น number / string ที่แน่นอนตั้งแต่ต้นทาง
 *   ที่อื่นจึงใช้ได้เลยโดยไม่ต้องเช็ค undefined ซ้ำ
 */
import dotenv from 'dotenv';

dotenv.config();

/** อ่านค่าเป็นข้อความ ถ้าไม่มีให้ใช้ค่าสำรอง */
function str(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

/** อ่านค่าเป็นตัวเลข ถ้าแปลงไม่ได้ให้ใช้ค่าสำรอง */
function num(key: string, fallback: number): number {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  PORT: num('PORT', 3000),
  NODE_ENV: str('NODE_ENV', 'development'),

  DB_HOST: str('DB_HOST', 'localhost'),
  DB_PORT: num('DB_PORT', 3306),
  DB_USER: str('DB_USER', 'root'),
  /** รหัสผ่าน MySQL ของ XAMPP ปกติเป็นค่าว่าง */
  DB_PASSWORD: process.env.DB_PASSWORD ?? '',
  DB_NAME: str('DB_NAME', 'saveeats'),

  JWT_SECRET: str('JWT_SECRET', 'saveeats_dev_secret_change_me'),
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '7d'),

  PUBLIC_BASE_URL: str('PUBLIC_BASE_URL', 'http://localhost:3000'),

  // ---- ส่งอีเมล (ใช้กับหน้า "ลืมรหัสผ่าน") ----
  // ถ้าไม่ได้ตั้ง SMTP_USER ไว้ ระบบจะไม่ส่งอีเมลจริง
  // แต่จะพิมพ์ลิงก์ออกมาที่หน้าต่าง cmd ของ backend แทน ซึ่งใช้ทดสอบได้เลย
  SMTP_HOST: str('SMTP_HOST', 'smtp.gmail.com'),
  SMTP_PORT: num('SMTP_PORT', 587),
  SMTP_USER: str('SMTP_USER', ''),
  SMTP_PASS: str('SMTP_PASS', ''),
  MAIL_FROM: str('MAIL_FROM', 'SaveEats <no-reply@saveeats.local>'),
  /** ลิงก์ตั้งรหัสผ่านใหม่หมดอายุในกี่นาที */
  RESET_TOKEN_MINUTES: num('RESET_TOKEN_MINUTES', 60),

  RESERVATION_GRACE_MINUTES: num('RESERVATION_GRACE_MINUTES', 30),
  MAX_QUANTITY_PER_RESERVATION: num('MAX_QUANTITY_PER_RESERVATION', 5),
  DEFAULT_SEARCH_RADIUS_KM: num('DEFAULT_SEARCH_RADIUS_KM', 5),
} as const;

if (env.NODE_ENV === 'production' && env.JWT_SECRET.includes('change')) {
  console.warn('!! คำเตือน: ยังไม่ได้เปลี่ยน JWT_SECRET ใน .env');
}

export default env;
