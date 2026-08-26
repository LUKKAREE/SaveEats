/**
 * เส้นทาง /api/reports  (ฝั่งผู้ใช้)
 *
 * ส่วนของ Admin (ดูรายการทั้งหมด / เปลี่ยนสถานะ) อยู่ที่ adminRoutes.ts
 * แยกกันเพราะสิทธิ์ต่างกัน
 *   ที่นี่      : ผู้ใช้ที่ login แล้วทุกคน (ลูกค้าและร้าน)
 *   adminRoutes : เฉพาะ admin
 *
 * ลำดับ middleware ที่ต้องจำ
 *   route -> [auth] -> [role] -> [validator] -> validate -> controller
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import reportController from '../controllers/reportController';
import { createReportRules } from '../validators/reportValidator';

const router = Router();

router.post(
  '/reports',
  authMiddleware,
  createReportRules,
  validate,
  asyncHandler(reportController.create)
);

router.get('/reports/my', authMiddleware, asyncHandler(reportController.listMine));

export default router;
