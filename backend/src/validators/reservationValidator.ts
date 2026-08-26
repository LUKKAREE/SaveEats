import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const createReservationRules: ValidationChain[] = [
  body('postId').isInt({ min: 1 }).withMessage('ไม่พบรายการอาหารที่ต้องการจอง'),
  body('quantity').optional().isInt({ min: 1 })
    .withMessage('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป'),
];

export const verifyReservationRules: ValidationChain[] = [
  // ต้องส่งมาอย่างน้อย 1 อย่าง : qrPayload หรือ code
  body().custom((value: unknown) => {
    const payload = value as { qrPayload?: string; code?: string };
    if (!payload.qrPayload && !payload.code) {
      throw new Error('กรุณาสแกน QR Code หรือกรอกรหัส 4 หลัก');
    }
    return true;
  }),
  body('code').optional().matches(/^[0-9]{4}$/).withMessage('รหัสยืนยันต้องเป็นตัวเลข 4 หลัก'),
];
