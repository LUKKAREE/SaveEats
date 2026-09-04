/**
 * ค่าคงที่ที่เป็นชุดตัวเลือก
 *
 * *** ค่าทุกตัวในไฟล์นี้ต้องตรงกับ ENUM ใน database/schema.sql เป๊ะ ***
 * ถ้าแก้ที่นี่ ต้องไปแก้ schema.sql ด้วย และกลับกัน
 *
 * ทำไมใช้ `as const` แทน enum ของ TypeScript
 *   - ได้ค่าเป็น string ธรรมดา ตรงกับที่เก็บใน MySQL
 *   - ใช้ได้ทั้งตอนเขียนโค้ดและตอนรันจริง
 *   - ไม่มีปัญหากับ babel ของ React Native (ซึ่งไม่รองรับ enum แบบเดิมทุกกรณี)
 */

/** ประเภทผู้ใช้ - ตรงกับคอลัมน์ users.role */
export const UserRole = {
  CUSTOMER: 'customer',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** สถานะร้านค้า - ตรงกับคอลัมน์ stores.status */
export const StoreStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  SUSPENDED: 'suspended',
} as const;
export type StoreStatus = (typeof StoreStatus)[keyof typeof StoreStatus];

/** สถานะโพสต์ขาย - ตรงกับคอลัมน์ posts.status */
export const PostStatus = {
  ACTIVE: 'active',
  SOLD_OUT: 'sold_out',
  EXPIRED: 'expired',
  HIDDEN: 'hidden',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

/** สถานะการจอง - ตรงกับคอลัมน์ reservations.status */
export const ReservationStatus = {
  CONFIRMED: 'confirmed',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
} as const;
export type ReservationStatus = (typeof ReservationStatus)[keyof typeof ReservationStatus];

/** สถานะคะแนนความประพฤติ - ตรงกับคอลัมน์ behavior_scores.status */
export const BehaviorStatus = {
  GOOD: 'good',
  WARNING: 'warning',
  SUSPENDED: 'suspended',
} as const;
export type BehaviorStatus = (typeof BehaviorStatus)[keyof typeof BehaviorStatus];

/** ประเภทการแจ้งเตือน - ตรงกับคอลัมน์ notifications.type */
export const NotificationType = {
  RESERVATION: 'reservation',
  STORE: 'store',
  REVIEW: 'review',
  /** ความคืบหน้าของเรื่องที่แจ้งปัญหา (เพิ่มพร้อม migration_03) */
  REPORT: 'report',
  SYSTEM: 'system',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

/** สิ่งที่ถูกแจ้งปัญหา - ตรงกับคอลัมน์ reports.target_type */
export const ReportTargetType = {
  STORE: 'store',
  POST: 'post',
  REVIEW: 'review',
  USER: 'user',
  RESERVATION: 'reservation',
} as const;
export type ReportTargetType = (typeof ReportTargetType)[keyof typeof ReportTargetType];

/** สถานะการแจ้งปัญหา - ตรงกับคอลัมน์ reports.status */
export const ReportStatus = {
  OPEN: 'open',
  REVIEWING: 'reviewing',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const;
export type ReportStatus = (typeof ReportStatus)[keyof typeof ReportStatus];

/** ตัวเลือกการเรียงลำดับใน Feed (ไม่ได้อยู่ในฐานข้อมูล ใช้ตอนส่ง query) */
export const FeedSort = {
  NEWEST: 'newest',
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  RATING: 'rating',
  PICKUP: 'pickup',
} as const;
export type FeedSort = (typeof FeedSort)[keyof typeof FeedSort];

/** slug ของหมวดหมู่อาหาร 5 หมวด - ตรงกับคอลัมน์ categories.slug ใน seed.sql */
export const CategorySlug = {
  SAVORY: 'savory',
  BAKERY: 'bakery',
  DESSERT: 'dessert',
  DRINK: 'drink',
  OTHER: 'other',
} as const;
export type CategorySlug = (typeof CategorySlug)[keyof typeof CategorySlug];
