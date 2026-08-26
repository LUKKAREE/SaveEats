/**
 * authController
 *
 * *** หน้าที่ของ controller มีแค่ 3 อย่าง ***
 *   1. อ่านข้อมูลจาก req
 *   2. เรียก service
 *   3. ส่ง response กลับ
 * ห้ามเขียน Business Logic หรือ SQL ที่นี่
 */
import type { Request, Response } from 'express';
import type {
  RegisterRequest, LoginRequest, ChangePasswordRequest, UpdateProfileRequest,
  ForgotPasswordRequest, ResetPasswordRequest,
} from '@shared/index';
import authService from '../services/authService';
import { ok, created } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { uploadedFilename } from '../middleware/uploadMiddleware';

export const authController = {
  /** POST /api/auth/register */
  async register(req: Request, res: Response): Promise<void> {
    const body = req.body as RegisterRequest;
    const result = await authService.register(body);
    created(res, result, 'สมัครสมาชิกสำเร็จ');
  },

  /** POST /api/auth/login */
  async login(req: Request, res: Response): Promise<void> {
    const body = req.body as LoginRequest;
    const result = await authService.login(body);
    ok(res, result, 'เข้าสู่ระบบสำเร็จ');
  },

  /**
   * POST /api/auth/logout
   * JWT ไม่มีสถานะเก็บที่ server การ logout จริง ๆ คือฝั่งแอปลบ token ทิ้ง
   * endpoint นี้มีไว้ให้แอปเรียกเพื่อความสม่ำเสมอเท่านั้น
   */
  async logout(_req: Request, res: Response): Promise<void> {
    ok(res, null, 'ออกจากระบบแล้ว');
  },

  /**
   * POST /api/auth/forgot-password
   *
   * *** ตอบข้อความเดียวกันเสมอ ***
   * ไม่ว่าอีเมลนั้นจะมีในระบบหรือไม่ก็ตาม เพื่อไม่ให้คนร้ายไล่เช็ค
   * ได้ว่าใครเป็นสมาชิกของเราบ้าง
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    const result = await authService.forgotPassword(req.body as ForgotPasswordRequest);
    ok(res, result, 'ถ้าอีเมลนี้มีอยู่ในระบบ เราได้ส่งรหัสตั้งรหัสผ่านใหม่ไปให้แล้ว');
  },

  /** POST /api/auth/reset-password */
  async resetPassword(req: Request, res: Response): Promise<void> {
    await authService.resetPassword(req.body as ResetPasswordRequest);
    ok(res, null, 'ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว เข้าสู่ระบบด้วยรหัสใหม่ได้เลย');
  },

  /** GET /api/auth/me */
  async me(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const result = await authService.me(user.userId);
    ok(res, result);
  },

  /**
   * PUT /api/auth/me
   * แก้ไขข้อมูลส่วนตัว (ชื่อ / เบอร์โทร / รูปโปรไฟล์)
   *
   * รับเป็น multipart/form-data เพราะอาจมีไฟล์รูปแนบมาด้วย
   * ถ้าไม่ได้แนบรูป uploadedFilename จะคืน undefined แล้ว SQL จะเก็บรูปเดิมไว้
   */
  async updateProfile(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const result = await authService.updateProfile(
      user.userId,
      req.body as UpdateProfileRequest,
      uploadedFilename(req)
    );
    ok(res, result, 'บันทึกข้อมูลเรียบร้อยแล้ว');
  },

  /** PUT /api/auth/password */
  async changePassword(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    await authService.changePassword(user.userId, req.body as ChangePasswordRequest);
    ok(res, null, 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว');
  },
};

export default authController;
