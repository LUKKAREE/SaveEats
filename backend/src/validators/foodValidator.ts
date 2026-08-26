import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const createFoodRules: ValidationChain[] = [
  body('name').trim().notEmpty().withMessage('กรุณากรอกชื่ออาหาร')
    .isLength({ max: 150 }).withMessage('ชื่ออาหารยาวเกินไป'),
  body('normalPrice').isFloat({ gt: 0 }).withMessage('ราคาปกติต้องเป็นตัวเลขมากกว่า 0'),
  body('categoryId').optional({ values: 'falsy' })
    .isInt({ min: 1 }).withMessage('หมวดหมู่ไม่ถูกต้อง'),
];

export const updateFoodRules: ValidationChain[] = [
  body('name').optional().trim().notEmpty().withMessage('ชื่ออาหารห้ามว่าง'),
  body('normalPrice').optional().isFloat({ gt: 0 }).withMessage('ราคาปกติต้องมากกว่า 0'),
];
