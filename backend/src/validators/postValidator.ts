import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';

export const createPostRules: ValidationChain[] = [
  body('foodId').isInt({ min: 1 }).withMessage('กรุณาเลือกเมนูอาหาร'),
  body('discountPrice').isFloat({ gt: 0 }).withMessage('ราคาที่ลดต้องเป็นตัวเลขมากกว่า 0'),
  body('quantity').isInt({ min: 1 }).withMessage('จำนวนต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป'),
  body('pickupStart').notEmpty().withMessage('กรุณาระบุเวลาเริ่มรับอาหาร'),
  body('pickupEnd').notEmpty().withMessage('กรุณาระบุเวลาสิ้นสุดการรับอาหาร')
    .custom((value: string, { req }) => {
      const start = String((req.body as { pickupStart?: string }).pickupStart ?? '');
      if (new Date(value.replace(' ', 'T')) <= new Date(start.replace(' ', 'T'))) {
        throw new Error('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มรับ');
      }
      return true;
    }),
  // เวลาถือคิว : กันค่าสุดโต่งทั้งสองทาง
  // ต่ำกว่า 5 นาทีลูกค้าไปไม่ทันแน่ ๆ ส่วนเกิน 12 ชั่วโมงก็ไม่ใช่การขายอาหารเหลือแล้ว
  body('holdMinutes').optional().isInt({ min: 5, max: 720 })
    .withMessage('เวลาถือคิวต้องอยู่ระหว่าง 5 ถึง 720 นาที'),
];
