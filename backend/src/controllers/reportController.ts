/**
 * reportController - รับเรื่องแจ้งปัญหาจากผู้ใช้
 *
 * *** หน้าที่ของ controller มีแค่ 3 อย่าง ***
 *   1. อ่านข้อมูลจาก req
 *   2. เรียก service
 *   3. ส่ง response กลับ
 * ห้ามเขียน Business Logic หรือ SQL ที่นี่
 *
 * ส่วนของ Admin (ดูรายการ / เปลี่ยนสถานะ) อยู่ที่ adminController
 */
import type { Request, Response } from 'express';
import type { CreateReportRequest } from '@shared/index';

import reportService from '../services/reportService';
import { ok, created } from '../utils/response';
import { requireAuth } from '../utils/auth';

export const reportController = {
  /**
   * POST /api/reports
   *
   * *** reporterId มาจาก token เท่านั้น ไม่ได้อ่านจาก body ***
   * ถ้าอ่านจาก body ใครก็แจ้งในนามคนอื่นได้
   */
  async create(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const body = req.body as CreateReportRequest;

    const report = await reportService.create(user.userId, {
      targetType: body.targetType,
      targetId: Number(body.targetId),
      reason: body.reason,
    });

    created(res, report, 'ส่งเรื่องให้ผู้ดูแลระบบแล้ว ขอบคุณที่ช่วยแจ้ง');
  },

  /** GET /api/reports/my - เรื่องที่ตัวเองเคยแจ้งไว้ */
  async listMine(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    ok(res, await reportService.listMine(user.userId));
  },
};

export default reportController;
