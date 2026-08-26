/**
 * ตรวจข้อมูลของเรื่องแจ้งปัญหาก่อนเข้า controller
 * ใช้คู่กับ middleware/validate.ts เสมอ
 */
import { body } from 'express-validator';
import type { ValidationChain } from 'express-validator';
import { ReportTargetType } from '@shared/index';

/**
 * ประเภทที่อนุญาต ดึงจาก enum กลางใน shared
 *
 * *** ไม่พิมพ์ค่าซ้ำที่นี่โดยตั้งใจ ***
 * ถ้าวันหนึ่งเพิ่มประเภทใหม่ใน shared/src/enums.ts
 * ที่นี่จะรู้เองอัตโนมัติ ไม่ต้องตามมาแก้
 */
const TARGET_TYPES = Object.values(ReportTargetType);

/** ความยาวขั้นต่ำของเหตุผล กันคนพิมพ์ว่า "ไม่ดี" แล้วส่ง */
const MIN_REASON = 10;
const MAX_REASON = 500;

export const createReportRules: ValidationChain[] = [
  body('targetType')
    .isIn(TARGET_TYPES)
    .withMessage('ประเภทของสิ่งที่แจ้งไม่ถูกต้อง'),

  body('targetId')
    .isInt({ min: 1 })
    .withMessage('ไม่พบสิ่งที่ต้องการแจ้ง'),

  body('reason')
    .trim()
    .isLength({ min: MIN_REASON })
    .withMessage(`กรุณาอธิบายปัญหาอย่างน้อย ${String(MIN_REASON)} ตัวอักษร เพื่อให้ผู้ดูแลระบบเข้าใจ`)
    .isLength({ max: MAX_REASON })
    .withMessage(`คำอธิบายยาวเกินไป (ไม่เกิน ${String(MAX_REASON)} ตัวอักษร)`),
];
