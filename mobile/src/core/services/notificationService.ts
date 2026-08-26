/**
 * จัดการการแจ้งเตือนฝั่งแอป
 *
 * ตอนนี้เป็นแบบ "ดึงจาก Backend มาแสดง" ยังไม่มี Push Notification จริง (ข้อค้าง 4)
 * ถ้าจะทำ Push จริงในอนาคต ให้เพิ่ม expo-notifications แล้วมาแก้ที่ไฟล์นี้ที่เดียว
 */
import type { ApiResponse, PaginatedResponse, AppNotification, UnreadCountPayload } from '@shared/index';
import { apiGet, apiPut, apiDelete } from './apiClient';
import { ENDPOINTS } from '../constants/apiConstants';

export const notificationService = {
  async list(page = 1, limit = 20): Promise<PaginatedResponse<AppNotification>> {
    return apiGet<PaginatedResponse<AppNotification>>(ENDPOINTS.NOTIFICATIONS, {
      params: { page, limit },
    });
  },

  async unreadCount(): Promise<number> {
    const res = await apiGet<ApiResponse<UnreadCountPayload>>(ENDPOINTS.UNREAD_COUNT);
    return res.data.count;
  },

  async markRead(id: number): Promise<void> {
    await apiPut<ApiResponse<null>>(ENDPOINTS.READ_NOTIFICATION(id));
  },

  async markAllRead(): Promise<void> {
    await apiPut<ApiResponse<null>>(ENDPOINTS.READ_ALL);
  },

  /** ลบการแจ้งเตือน 1 รายการ */
  async remove(id: number): Promise<void> {
    await apiDelete<ApiResponse<null>>(ENDPOINTS.NOTIFICATION_ONE(id));
  },

  /** ลบการแจ้งเตือนทั้งหมดของตัวเอง */
  async removeAll(): Promise<void> {
    await apiDelete<ApiResponse<unknown>>(ENDPOINTS.NOTIFICATIONS);
  },
};

export default notificationService;
