import type { Request, Response } from 'express';
import { ok, paginated } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { paramId, pageParams } from '../utils/query';
import ApiError from '../utils/ApiError';
import notificationModel from '../models/notificationModel';
import notificationService from '../services/notificationService';

export const notificationController = {
  /** GET /api/notifications */
  async list(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const { page, limit } = pageParams(req);
    const { items, total } = await notificationService.list(user.userId, { page, limit });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/notifications/unread-count - ใช้โชว์ตัวเลขแดงบนไอคอนกระดิ่ง */
  async unreadCount(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const count = await notificationService.unreadCount(user.userId);
    ok(res, { count });
  },

  /** PUT /api/notifications/:id/read */
  async markRead(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    await notificationService.markRead(paramId(req), user.userId);
    ok(res, null, 'อ่านแล้ว');
  },

  /** DELETE /api/notifications/:id - ลบการแจ้งเตือน 1 รายการ */
  async remove(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const deleted = await notificationModel.remove(paramId(req), user.userId);
    if (!deleted) throw ApiError.notFound('ไม่พบการแจ้งเตือนนี้');
    ok(res, null, 'ลบการแจ้งเตือนแล้ว');
  },

  /** DELETE /api/notifications - ลบทั้งหมด */
  async removeAll(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const count = await notificationModel.removeAll(user.userId);
    ok(res, { deleted: count }, `ลบการแจ้งเตือนแล้ว ${count} รายการ`);
  },

  /** PUT /api/notifications/read-all */
  async markAllRead(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    await notificationService.markAllRead(user.userId);
    ok(res, null, 'ทำเครื่องหมายว่าอ่านทั้งหมดแล้ว');
  },
};

export default notificationController;
