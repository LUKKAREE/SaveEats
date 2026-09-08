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

/** ความยาวของข้อความในห้องสนทนา สั้นกว่าเหตุผลได้ เพราะเป็นการคุยกันไปมา */
const MIN_MESSAGE = 2;
const MAX_MESSAGE = 1000;

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

/**
 * ข้อความที่ส่งเข้าไปในเรื่องที่แจ้ง
 * ใช้ร่วมกันทั้งเส้นทางของผู้แจ้งและของผู้ดูแล เพราะกติกาเหมือนกันทุกอย่าง
 */
export const reportMessageRules: ValidationChain[] = [
  body('message')
    .trim()
    .isLength({ min: MIN_MESSAGE })
    .withMessage('กรุณาพิมพ์ข้อความก่อนส่ง')
    .isLength({ max: MAX_MESSAGE })
    .withMessage(`ข้อความยาวเกินไป (ไม่เกิน ${String(MAX_MESSAGE)} ตัวอักษร)`),
];
