/**
 * ข้อความภาษาไทยของแต่ละสถานะ
 *
 * เก็บไว้ที่เดียว ทั้งแอปมือถือและ Admin Web ใช้ร่วมกัน
 * จะได้ไม่เกิดกรณีแอปเขียนว่า "รับอาหารแล้ว" แต่เว็บเขียนว่า "สำเร็จ"
 *
 * ใช้ Record<T, string> เพื่อบังคับว่าต้องมีข้อความครบทุกสถานะ
 * ถ้าเพิ่มสถานะใหม่ใน enums.ts แล้วลืมเพิ่มข้อความที่นี่ TypeScript จะฟ้องทันที
 */
import type {
  UserRole, StoreStatus, PostStatus, ReservationStatus,
  BehaviorStatus, ReportStatus, FeedSort,
} from './enums';

export const USER_ROLE_LABEL: Record<UserRole, string> = {
  customer: 'ลูกค้า',
  seller: 'ร้านค้า',
  admin: 'ผู้ดูแลระบบ',
};

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติแล้ว',
  rejected: 'ไม่อนุมัติ',
  suspended: 'ถูกระงับ',
};

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  active: 'กำลังขาย',
  sold_out: 'ขายหมด',
  expired: 'หมดเวลา',
  hidden: 'ซ่อนอยู่',
};

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  confirmed: 'จองสำเร็จ',
  waiting: 'รอรับอาหาร',
  completed: 'รับอาหารแล้ว',
  expired: 'หมดอายุ',
  cancelled: 'ยกเลิก',
};

export const BEHAVIOR_STATUS_LABEL: Record<BehaviorStatus, string> = {
  good: 'ปกติ',
  warning: 'ต้องจับตา',
  suspended: 'ถูกระงับ',
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'รอตรวจสอบ',
  reviewing: 'กำลังตรวจสอบ',
  resolved: 'จัดการแล้ว',
  rejected: 'ปฏิเสธ',
};

export const FEED_SORT_LABEL: Record<FeedSort, string> = {
  newest: 'ใหม่ล่าสุด',
  price_asc: 'ราคาน้อยไปมาก',
  price_desc: 'ราคามากไปน้อย',
  rating: 'ร้านคะแนนดี',
  pickup: 'ใกล้หมดเวลารับ',
};

/** ตัวเลือกเรียงลำดับ พร้อมข้อความ ใช้ทำปุ่มในหน้า Filter ได้เลย */
export const FEED_SORT_OPTIONS: Array<{ value: FeedSort; label: string }> =
  (Object.keys(FEED_SORT_LABEL) as FeedSort[]).map((value) => ({
    value,
    label: FEED_SORT_LABEL[value],
  }));
