/**
 * ตรวจสอบ JWT Token
 *
 * ฝั่งแอปต้องส่ง header มาแบบนี้
 *   Authorization: Bearer <TOKEN>
 *
 * ถ้าผ่าน จะแปะข้อมูลผู้ใช้ไว้ที่ req.user ให้ controller ใช้ต่อ
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import ApiError from '../utils/ApiError';
import type { AuthUser } from '../types/express';

/** หน้าตาข้อมูลที่ฝังอยู่ใน token */
interface JwtPayloadShape {
  userId: number;
  role: AuthUser['role'];
  email: string;
}

/** แกะ token ถ้าไม่ผ่านคืน null */
function decodeToken(header: string | undefined): AuthUser | null {
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayloadShape;
  return { userId: payload.userId, role: payload.role, email: payload.email };
}

/** บังคับว่าต้อง login */
export const authMiddleware: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    next(ApiError.unauthorized('กรุณาเข้าสู่ระบบก่อนใช้งาน'));
    return;
  }

  try {
    const user = decodeToken(header);
    if (!user) {
      next(ApiError.unauthorized('Token ไม่ถูกต้อง'));
      return;
    }
    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(ApiError.unauthorized('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่'));
      return;
    }
    next(ApiError.unauthorized('Token ไม่ถูกต้อง'));
  }
};

/**
 * แบบไม่บังคับ Login
 * ถ้ามี token ก็อ่านมาใส่ req.user ถ้าไม่มีก็ปล่อยผ่าน
 * ใช้กับหน้า Feed ที่คนยังไม่ Login ก็ควรดูได้
 */
export const optionalAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const user = decodeToken(req.headers.authorization);
    if (user) req.user = user;
  } catch {
    // token ไม่ดีก็ถือว่ายังไม่ login เฉย ๆ ไม่ต้อง error
  }
  next();
};

export default authMiddleware;
