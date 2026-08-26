import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const updateStoreRules: ValidationChain[] = [
  body('storeName').optional().trim().notEmpty().withMessage('ชื่อร้านห้ามว่าง'),
  body('latitude').optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 }).withMessage('พิกัด latitude ไม่ถูกต้อง'),
  body('longitude').optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 }).withMessage('พิกัด longitude ไม่ถูกต้อง'),
];

export const rejectStoreRules: ValidationChain[] = [
  body('reason').trim().notEmpty().withMessage('กรุณาระบุเหตุผลที่ไม่อนุมัติ'),
];
