/**
 * ตัวสร้างค่าสุ่มสำหรับระบบการจอง
 */
import crypto from 'node:crypto';

/**
 * สร้าง token สำหรับฝังใน QR Code
 * *** ห้ามใช้ reservation_id ตรง ๆ เพราะเดาได้ง่ายมาก (1, 2, 3, ...) ***
 * @returns ข้อความสุ่ม 32 ตัวอักษร (a-f และ 0-9)
 */
export function generateQrToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * สร้างรหัสยืนยัน 4 หลัก (สำรองไว้ให้ร้านกรอกเมื่อสแกน QR ไม่ได้)
 * @returns เช่น "0482"
 */
export function generateReservationCode(): string {
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}
