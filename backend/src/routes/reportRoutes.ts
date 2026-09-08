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
import { imageUploader } from '../middleware/uploadMiddleware';
import { createReportRules, reportMessageRules } from '../validators/reportValidator';

const router = Router();

/*
 * imageUploader ต้องมาก่อน validator เสมอ
 *
 * *** ทำไมลำดับนี้สำคัญ ***
 * คำขอที่แนบไฟล์มาเป็นแบบ multipart/form-data ซึ่ง express อ่าน req.body ไม่ได้เอง
 * multer เป็นคนแกะให้ ถ้าเอา validator ไว้ก่อน มันจะเห็น req.body เป็นค่าว่าง
 * แล้วตีตกทุกคำขอที่แนบรูปมา ทั้งที่ผู้ใช้กรอกมาครบ
 *
 * ไม่แนบรูปมาก็ผ่านได้ปกติ multer ไม่บังคับว่าต้องมีไฟล์
 */
router.post(
  '/reports',
  authMiddleware,
  imageUploader('report', 'image'),
  createReportRules,
  validate,
  asyncHandler(reportController.create)
);

router.get('/reports/my', authMiddleware, asyncHandler(reportController.listMine));

/*
 * ห้องสนทนาของเรื่องที่แจ้ง
 * service เช็คความเป็นเจ้าของให้ทุกครั้ง ที่นี่จึงต้องการแค่ authMiddleware
 */
router.get('/reports/:id/messages', authMiddleware, asyncHandler(reportController.listMessages));

router.post(
  '/reports/:id/messages',
  authMiddleware,
  reportMessageRules,
  validate,
  asyncHandler(reportController.addMessage)
);

export default router;
