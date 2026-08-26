import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const createReviewRules: ValidationChain[] = [
  body('reservationId').isInt({ min: 1 }).withMessage('ไม่พบการจองที่ต้องการรีวิว'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('กรุณาให้คะแนน 1 ถึง 5 ดาว'),
  body('comment').optional({ values: 'falsy' })
    .isLength({ max: 1000 }).withMessage('ความคิดเห็นยาวเกินไป'),
];
