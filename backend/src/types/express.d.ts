/**
 * เพิ่ม field ของเราเข้าไปในชนิดข้อมูล Request ของ Express
 *
 * ทำไมต้องมีไฟล์นี้
 *   authMiddleware แปะข้อมูลผู้ใช้ไว้ที่ req.user
 *   แต่ Express ไม่รู้จัก field นี้ TypeScript จึงฟ้องว่าไม่มี
 *   การประกาศแบบนี้เรียกว่า declaration merging = ต่อเติมชนิดข้อมูลที่มีอยู่แล้ว
 *
 * *** req.user เป็น optional (มี ? ต่อท้าย) เพราะบาง route ไม่ได้บังคับ login ***
 * เวลาจะใช้ ให้เรียกผ่าน requireAuth(req) ใน utils/auth.ts
 * ซึ่งจะโยน error ถ้าไม่มี และคืนค่าที่ TypeScript มั่นใจว่ามีจริง
 */
import type { UserRole } from '@shared/index';

/** ข้อมูลที่แกะได้จาก JWT */
export interface AuthUser {
  userId: number;
  role: UserRole;
  email: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
