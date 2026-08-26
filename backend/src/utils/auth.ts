/**
 * ตัวช่วยดึงข้อมูลผู้ใช้ที่ login อยู่ออกจาก Request
 *
 * ทำไมต้องมีไฟล์นี้
 *   req.user มีชนิดเป็น AuthUser | undefined เพราะบาง route ไม่บังคับ login
 *   ถ้าเขียน req.user.userId ตรง ๆ TypeScript จะฟ้องว่าอาจเป็น undefined
 *
 *   บางคนแก้ด้วยการใส่ ! (req.user!.userId) แต่นั่นคือการ "บอก TypeScript ว่าเชื่อฉันเถอะ"
 *   ซึ่งถ้าเราเผลอลืมใส่ authMiddleware ที่ route นั้น โปรแกรมจะพังตอนรันจริง
 *
 *   ฟังก์ชันนี้เช็คให้จริง ๆ ถ้าไม่มีก็โยน 401 ออกไปอย่างสุภาพ
 *   ปลอดภัยทั้งตอนเขียนโค้ดและตอนรันจริง
 */
import type { Request } from 'express';
import type { AuthUser } from '../types/express';
import ApiError from './ApiError';

/** ดึงผู้ใช้ที่ login อยู่ ถ้าไม่มีจะโยน 401 */
export function requireAuth(req: Request): AuthUser {
  if (!req.user) {
    throw ApiError.unauthorized('กรุณาเข้าสู่ระบบก่อนใช้งาน');
  }
  return req.user;
}
