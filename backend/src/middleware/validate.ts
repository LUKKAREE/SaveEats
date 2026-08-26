/**
 * ตัวรวมผลตรวจจาก express-validator
 * วางต่อท้ายชุด validator ทุกครั้ง
 *
 * ตัวอย่าง :
 *   router.post('/login', loginRules, validate, asyncHandler(controller.login));
 */
import type { RequestHandler } from 'express';
import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError';
import type { ApiErrorDetail } from '../utils/ApiError';

export const validate: RequestHandler = (req, _res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    next();
    return;
  }

  const details: ApiErrorDetail[] = result.array().map((e) => ({
    field: 'path' in e ? String(e.path) : 'unknown',
    message: e.msg as string,
  }));

  next(ApiError.badRequest('ข้อมูลที่กรอกไม่ถูกต้อง', details));
};

export default validate;
