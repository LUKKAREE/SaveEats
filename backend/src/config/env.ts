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

/*
 * *** ตั้งเขตเวลาให้เป็นไทยก่อนอย่างอื่นทั้งหมด ***
 *
 * เซิร์ฟเวอร์บนคลาวด์เกือบทุกเจ้าตั้งเวลาเป็น UTC ซึ่งช้ากว่าไทย 7 ชั่วโมง
 * ถ้าไม่ตั้งค่านี้ ทุกอย่างที่คำนวณจากเวลาปัจจุบันจะเพี้ยนหมด เช่น
 *   - เวลาหมดอายุของคิว (คำนวณจาก new Date())
 *   - การเช็คว่าเลยเวลารับอาหารหรือยัง
 *   - งานตามเวลาที่ปิดคิวหมดอายุ
 * บนเครื่องที่ตั้งเวลาไทยอยู่แล้วจะไม่เห็นปัญหานี้เลย จึงพลาดได้ง่ายมาก
 *
 * ต้องตั้งก่อน import โมดูลอื่น เพราะ Node อ่านค่านี้ครั้งเดียวตอนสร้าง Date ตัวแรก
 */
process.env['TZ'] = process.env['TZ'] ?? 'Asia/Bangkok';

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

/** อ่านค่าเป็นจริง/เท็จ รับได้ทั้ง true / 1 / yes */
function bool(key: string, fallback: boolean): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
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
  /**
   * ต่อฐานข้อมูลแบบเข้ารหัสหรือไม่
   *
   * XAMPP ในเครื่องไม่ต้องใช้ (ค่าเริ่มต้นจึงเป็น false)
   * แต่ฐานข้อมูลบนคลาวด์ส่วนใหญ่ เช่น Aiven บังคับให้ต่อแบบเข้ารหัสเท่านั้น
   * ตอนขึ้นคลาวด์ให้ตั้ง DB_SSL=true
   */
  DB_SSL: bool('DB_SSL', false),
  /**
   * ใบรับรองของผู้ให้บริการฐานข้อมูล (ไม่ใส่ก็ต่อได้)
   *
   * ใส่ได้ 2 แบบ
   *   1. วางเนื้อใบรับรองทั้งก้อน (ขึ้นต้นด้วย -----BEGIN CERTIFICATE-----)
   *   2. ใส่เป็นที่อยู่ไฟล์ เช่น C:\SaveEats\backend\ca.pem
   *
   * ถ้าเว้นว่าง ระบบยังเข้ารหัสการเชื่อมต่อให้อยู่ แต่จะไม่ตรวจว่าปลายทางเป็นตัวจริง
   * ซึ่งพอใช้ได้สำหรับงานเรียน แต่ถ้าใส่ได้ก็ควรใส่
   */
  DB_SSL_CA: str('DB_SSL_CA', ''),
  /**
   * เขตเวลาของ "ฝั่งฐานข้อมูล" เขียนเป็นระยะห่างจาก UTC
   *
   * *** คนละเรื่องกับ TZ ที่ตั้งไว้ข้างบน ***
   * TZ คุมเวลาที่ Node คำนวณเอง เช่น เวลาหมดอายุของคิว
   * ส่วนค่านี้คุมเวลาที่ฐานข้อมูลสร้างเอง เช่น created_at และคำสั่ง NOW() ในทุก query
   * ถ้าตั้งไม่ตรงกัน เวลาสองฝั่งจะห่างกัน 7 ชั่วโมง แล้วระบบจะรวนทั้งหมด
   *
   * ใช้เป็นตัวเลข +07:00 ไม่ใช่ชื่อเมือง เพราะฐานข้อมูลบางเครื่องไม่ได้ติดตั้งตารางชื่อเขตเวลาไว้
   */
  DB_TIMEZONE: str('DB_TIMEZONE', '+07:00'),

  /*
   * ---- ที่เก็บรูปภาพบนคลาวด์ (Cloudinary) ----
   *
   * *** ปัญหาที่ 3 ค่านี้แก้ ***
   * เซิร์ฟเวอร์ฟรีอย่าง Render เก็บไฟล์ถาวรไม่ได้
   * รูปที่ร้านอัปโหลดจะหายทุกครั้งที่เซิร์ฟเวอร์หลับแล้วตื่น หรือ deploy ใหม่
   * เหลือแต่ชื่อไฟล์ในฐานข้อมูลที่ชี้ไปหาของที่ไม่มีอยู่ กลายเป็นรูปแตก
   *
   * ถ้าเว้นทั้ง 3 ค่าไว้ ระบบจะเก็บรูปลงโฟลเดอร์ backend/uploads เหมือนเดิม
   * ซึ่งใช้ได้ดีตอนรันในเครื่องตัวเอง จึงไม่ต้องตั้งค่าอะไรตอนพัฒนา
   */
  CLOUDINARY_CLOUD_NAME: str('CLOUDINARY_CLOUD_NAME', ''),
  CLOUDINARY_API_KEY: str('CLOUDINARY_API_KEY', ''),
  CLOUDINARY_API_SECRET: str('CLOUDINARY_API_SECRET', ''),

  JWT_SECRET: str('JWT_SECRET', 'saveeats_dev_secret_change_me'),
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '7d'),

  /**
   * ที่อยู่ของ Backend ที่คนภายนอกเรียกถึงได้ ใช้ประกอบเป็น URL ของรูปภาพ
   * ตอนขึ้นคลาวด์ให้ใส่ที่อยู่จริง เช่น https://saveeats-api.onrender.com
   */
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

/*
 * เตือนเรื่องที่พลาดกันบ่อยที่สุดตอนขึ้นคลาวด์
 * ถ้ายังชี้ไป localhost อยู่ รูปภาพจะโหลดไม่ขึ้นบนมือถือ เพราะ localhost ของมือถือคือตัวมันเอง
 */
if (env.NODE_ENV === 'production' && env.PUBLIC_BASE_URL.includes('localhost')) {
  console.warn('!! คำเตือน: PUBLIC_BASE_URL ยังเป็น localhost อยู่ รูปภาพจะโหลดไม่ขึ้น');
}

if (env.NODE_ENV === 'production' && env.CLOUDINARY_CLOUD_NAME === '') {
  console.warn('!! คำเตือน: ยังไม่ได้ตั้งค่า Cloudinary รูปที่อัปโหลดจะหายเมื่อเซิร์ฟเวอร์รีสตาร์ท');
}

export default env;
