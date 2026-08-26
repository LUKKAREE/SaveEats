/**
 * notificationService - สร้างการแจ้งเตือน
 *
 * ตอนนี้ทำแค่บันทึกลงฐานข้อมูล แล้วให้แอปดึงไปแสดง (ข้อค้าง 4)
 *
 * ถ้าจะทำ Push Notification จริงในอนาคต
 *   ให้เพิ่มการยิงไป Expo Push API ตรงฟังก์ชัน notify() ที่เดียว
 *   ที่อื่นทั้งโปรเจกต์ไม่ต้องแก้เลย
 */
import type { AppNotification, NotificationType } from '@shared/index';
import notificationModel from '../models/notificationModel';

interface TemplateResult {
  title: string;
  message: string;
}

/**
 * ข้อความมาตรฐาน เก็บไว้ที่เดียว จะได้ไม่เขียนกระจัดกระจาย
 * TypeScript จะบังคับให้ใส่ argument ครบตามที่แต่ละ template ต้องการ
 */
export const TEMPLATES = {
  RESERVATION_CREATED: (foodName: string, storeName: string): TemplateResult => ({
    title: 'จองสำเร็จ',
    message: `คุณจอง ${foodName} จากร้าน ${storeName} เรียบร้อยแล้ว อย่าลืมไปรับตามเวลานะ`,
  }),
  RESERVATION_NEW_FOR_STORE: (foodName: string): TemplateResult => ({
    title: 'มีการจองใหม่',
    message: `มีลูกค้าจอง ${foodName} จากร้านของคุณ`,
  }),
  RESERVATION_COMPLETED: (storeName: string): TemplateResult => ({
    title: 'รับอาหารเรียบร้อย',
    message: `ขอบคุณที่ช่วยลดขยะอาหาร อย่าลืมให้คะแนนร้าน ${storeName} ด้วยนะ`,
  }),
  RESERVATION_CANCELLED: (foodName: string): TemplateResult => ({
    title: 'การจองถูกยกเลิก',
    message: `การจอง ${foodName} ถูกยกเลิกแล้ว`,
  }),
  RESERVATION_EXPIRED: (foodName: string): TemplateResult => ({
    title: 'การจองหมดอายุ',
    message: `การจอง ${foodName} หมดอายุแล้วเพราะเลยเวลารับ`,
  }),
  STORE_APPROVED: (): TemplateResult => ({
    title: 'ร้านของคุณได้รับการอนุมัติ',
    message: 'ยินดีด้วย ตอนนี้คุณเริ่มโพสต์ขายอาหารได้แล้ว',
  }),
  STORE_REJECTED: (reason?: string): TemplateResult => ({
    title: 'ร้านของคุณยังไม่ผ่านการอนุมัติ',
    message: reason && reason.trim() !== ''
      ? reason
      : 'กรุณาตรวจสอบข้อมูลร้านแล้วส่งใหม่อีกครั้ง',
  }),
} as const;

export interface NotifyInput {
  userId: number;
  title: string;
  message: string;
  type?: NotificationType;
  refId?: number | null;
}

export const notificationService = {
  TEMPLATES,

  /** สร้างการแจ้งเตือน 1 รายการ */
  async notify({ userId, title, message, type = 'system', refId = null }: NotifyInput): Promise<number> {
    return notificationModel.create({ userId, title, message, type, refId });
  },

  /**
   * สร้างการแจ้งเตือนจาก template
   *
   * ใช้ generic เพื่อให้ TypeScript ตรวจว่า argument ที่ส่งมา
   * ตรงกับที่ template นั้นต้องการจริง ๆ เช่น RESERVATION_CREATED ต้องมี 2 ตัว
   */
  async notifyFromTemplate<K extends keyof typeof TEMPLATES>(
    userId: number,
    templateKey: K,
    args: Parameters<(typeof TEMPLATES)[K]>,
    options: { type?: NotificationType; refId?: number | null } = {}
  ): Promise<number> {
    const template = TEMPLATES[templateKey] as (...a: unknown[]) => TemplateResult;
    const { title, message } = template(...args);
    return notificationModel.create({
      userId,
      title,
      message,
      type: options.type ?? 'system',
      refId: options.refId ?? null,
    });
  },

  async list(userId: number, options: { page?: number; limit?: number }): Promise<{ items: AppNotification[]; total: number }> {
    return notificationModel.listByUser(userId, options);
  },

  async unreadCount(userId: number): Promise<number> {
    return notificationModel.countUnread(userId);
  },

  async markRead(notificationId: number, userId: number): Promise<boolean> {
    return notificationModel.markAsRead(notificationId, userId);
  },

  async markAllRead(userId: number): Promise<void> {
    return notificationModel.markAllAsRead(userId);
  },
};

export default notificationService;
