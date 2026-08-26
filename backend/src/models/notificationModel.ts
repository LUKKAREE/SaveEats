/**
 * notificationModel - การแจ้งเตือน
 *
 * รอบนี้ทำแบบ "เก็บลงฐานข้อมูล แล้วให้แอปดึงไปแสดง" (ข้อค้าง 4)
 * ยังไม่ทำ Push Notification จริง ถ้าจะทำเพิ่มให้ต่อยอดที่ notificationService.ts
 */
import type { AppNotification, NotificationType } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

export interface CreateNotificationInput {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  refId?: number | null;
}

export const notificationModel = {
  async create({
    userId, title, message, type = 'system', refId = null,
  }: CreateNotificationInput): Promise<number> {
    const result = await execute(
      'INSERT INTO notifications (user_id, title, message, type, ref_id) VALUES (?, ?, ?, ?, ?)',
      [userId, title, message, type, refId]
    );
    return result.insertId;
  },

  async listByUser(
    userId: number,
    { page = 1, limit = 20 }: { page?: number; limit?: number }
  ): Promise<{ items: AppNotification[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<AppNotification>(
      `SELECT * FROM notifications WHERE user_id = ?
        ORDER BY created_at DESC ${pg.sql}`,
      [userId]
    );
    const total = await countOf(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?',
      [userId]
    );
    return { items, total };
  },

  async countUnread(userId: number): Promise<number> {
    return countOf(
      'SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = 0',
      [userId]
    );
  },

  async markAsRead(notificationId: number, userId: number): Promise<boolean> {
    const result = await execute(
      'UPDATE notifications SET is_read = 1 WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  },

  /**
   * ลบการแจ้งเตือน 1 รายการ
   *
   * *** ต้องมี user_id ในเงื่อนไขเสมอ ***
   * ไม่งั้นใครก็ยิง id มั่ว ๆ มาลบการแจ้งเตือนของคนอื่นได้
   * คืน true เมื่อลบได้จริง (แถวนั้นเป็นของคนนี้)
   */
  async remove(notificationId: number, userId: number): Promise<boolean> {
    const result = await execute(
      'DELETE FROM notifications WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    return result.affectedRows > 0;
  },

  /** ลบการแจ้งเตือนทั้งหมดของผู้ใช้คนนี้ */
  async removeAll(userId: number): Promise<number> {
    const result = await execute('DELETE FROM notifications WHERE user_id = ?', [userId]);
    return result.affectedRows;
  },

  async markAllAsRead(userId: number): Promise<void> {
    await execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
  },
};

export default notificationModel;
