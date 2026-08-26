/**
 * ตรวจว่าผู้ใช้มี Role ตรงตามที่กำหนดไหม
 *
 * *** กฎเหล็กข้อ 3 : การซ่อนปุ่มใน UI ไม่นับว่าเป็นความปลอดภัย ***
 * เพราะใครก็ยิง API ตรงเข้ามาได้ ต้องตรวจที่นี่เสมอ
 *
 * ต้องใช้ต่อจาก authMiddleware เสมอ
 *
 * ตัวอย่าง :
 *   router.get('/pending', authMiddleware, requireAdmin, asyncHandler(controller.list));
 */
import type { RequestHandler } from 'express';
import type { UserRole } from '@shared/index';
import ApiError from '../utils/ApiError';

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(ApiError.unauthorized('กรุณาเข้าสู่ระบบก่อนใช้งาน'));
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      next(ApiError.forbidden('คุณไม่มีสิทธิ์เข้าถึงส่วนนี้'));
      return;
    }
    next();
  };
}

export const requireCustomer = requireRole('customer');
export const requireSeller = requireRole('seller');
export const requireAdmin = requireRole('admin');
