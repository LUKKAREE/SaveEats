/**
 * หน้าตาข้อมูลของแต่ละตารางในฐานข้อมูล
 *
 * *** กฎเหล็กข้อ 5 : ชื่อ field ทุกตัวต้องตรงกับคอลัมน์ใน database/schema.sql เป๊ะ ***
 * ถ้าเปลี่ยนชื่อคอลัมน์ใน schema.sql ต้องมาแก้ที่นี่ทันที
 * แล้ว TypeScript จะไล่ฟ้องให้เองว่ามีที่ไหนต้องตามไปแก้บ้าง
 *
 * หมายเหตุเรื่องชนิดข้อมูล
 *   DATETIME / TIME  ->  string  (เพราะตั้ง dateStrings: true ไว้ที่ mysql2)
 *                        รูปแบบ 'YYYY-MM-DD HH:mm:ss'
 *   DECIMAL          ->  number  (เพราะตั้ง decimalNumbers: true ไว้ที่ mysql2)
 *   TINYINT(1)       ->  number  (0 หรือ 1 ไม่ใช่ boolean เพราะ MySQL ส่งมาเป็นเลข)
 *   คอลัมน์ที่เป็น NULL ได้  ->  ต่อท้ายด้วย | null
 */
import type {
  UserRole, StoreStatus, PostStatus, ReservationStatus,
  BehaviorStatus, NotificationType, ReportTargetType, ReportStatus,
} from './enums';

/** ตาราง users */
export interface User {
  user_id: number;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/**
 * ตาราง users แบบที่มี password ติดมาด้วย
 * ใช้ได้เฉพาะภายใน backend เท่านั้น *** ห้ามส่งออกไปให้ client เด็ดขาด ***
 */
export interface UserWithPassword extends User {
  password: string;
}

/** ข้อมูลผู้ใช้ที่ปลอดภัยส่งให้ client (ไม่มี password และ is_active) */
export type PublicUser = Omit<User, 'is_active' | 'updated_at'>;

/** ตาราง categories */
export interface Category {
  category_id: number;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  is_active?: number;
}

/** ตาราง stores */
export interface Store {
  store_id: number;
  user_id: number;
  store_name: string;
  description: string | null;
  image: string | null;
  phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  open_time: string | null;
  close_time: string | null;
  status: StoreStatus;
  reject_reason: string | null;
  rating: number;
  review_count: number;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ร้านแบบย่อ ใช้แสดงในรายการและบนแผนที่
 *
 * *** ทำไมไม่ส่ง Store ทั้งก้อน ***
 * รายการร้านอาจมีหลายสิบร้าน ถ้าส่งครบทุก field จะเปลืองเน็ตของผู้ใช้เปล่า ๆ
 * field อย่าง reject_reason หรือ user_id ไม่มีประโยชน์กับหน้าจอลูกค้าเลย
 */
export type StoreSummary = Pick<
  Store,
  | 'store_id' | 'store_name' | 'description' | 'image' | 'address'
  | 'latitude' | 'longitude' | 'rating' | 'review_count'
> & {
  open_time?: string | null;
  close_time?: string | null;
};

/**
 * ร้านที่มีระยะทางติดมาด้วย (มาจาก GET /api/stores/nearby)
 *
 * ใช้ StoreSummary เป็นฐาน ไม่ใช่ Store เต็ม เพราะ endpoint นั้นส่งมาแบบย่อ
 * ถ้าประกาศเป็น Store เต็มจะหลอกตัวเองว่ามี field ที่จริง ๆ ไม่ได้ส่งมา
 */
export type StoreWithDistance = StoreSummary & {
  distance_km: number;
};

/** ร้านในหน้า Admin (มีข้อมูลเจ้าของร้านและคะแนนความประพฤติติดมาด้วย) */
export interface StoreForAdmin extends Store {
  owner_name: string;
  owner_email: string;
  owner_phone: string | null;
  behavior_score: number | null;
  behavior_status: BehaviorStatus | null;
}

/**
 * ตาราง foods - คลังเมนูของร้าน
 * *** ไม่ใช่ของที่ประกาศขาย ของที่ขายจริงอยู่ในตาราง posts (ทางเลือก A) ***
 */
export interface Food {
  food_id: number;
  store_id: number;
  category_id: number | null;
  name: string;
  description: string | null;
  image: string | null;
  normal_price: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  /** มาจากการ JOIN ตาราง categories */
  category_name?: string | null;
  category_slug?: string | null;
}

/** ตาราง posts (ข้อมูลดิบ ยังไม่ JOIN) */
export interface Post {
  post_id: number;
  store_id: number;
  food_id: number;
  caption: string | null;
  image: string | null;
  discount_price: number;
  quantity_total: number;
  quantity_left: number;
  pickup_start: string;
  pickup_end: string;
  /** จองแล้วต้องมารับภายในกี่นาที ร้านกำหนดเองตอนโพสต์ */
  hold_minutes: number;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}

/** ตาราง reservations (ข้อมูลดิบ ยังไม่ JOIN) */
export interface Reservation {
  reservation_id: number;
  customer_id: number;
  store_id: number;
  post_id: number;
  food_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  /** ข้อความลับที่ฝังใน QR *** ห้ามแสดงเป็นตัวหนังสือให้ผู้ใช้เห็น *** */
  qr_token: string;
  /** รหัส 4 หลัก แสดงให้ลูกค้าเห็นได้ */
  reservation_code: string;
  status: ReservationStatus;
  pickup_start: string;
  pickup_end: string;
  expires_at: string;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** ตาราง reviews */
export interface Review {
  review_id: number;
  customer_id: number;
  store_id: number;
  reservation_id: number;
  /** 1 ถึง 5 เท่านั้น */
  rating: number;
  comment: string | null;
  created_at: string;
  /** มาจากการ JOIN ตาราง users / stores */
  customer_name?: string;
  customer_avatar?: string | null;
  store_name?: string;
  /** ชื่อไฟล์รูปหน้าร้าน - มาเฉพาะตอนดึงรีวิวของตัวเอง (GET /api/reviews/my) */
  store_image?: string | null;
}

/** ตาราง notifications */
export interface AppNotification {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  type: NotificationType;
  /** id ของสิ่งที่อ้างถึง เช่น reservation_id */
  ref_id: number | null;
  is_read: number;
  created_at: string;
}

/** ตาราง behavior_scores */
export interface BehaviorScore {
  store_id: number;
  /** 0 ถึง 100 เริ่มต้นที่ 100 */
  score: number;
  status: BehaviorStatus;
  reason: string | null;
  updated_at: string;
}

/** ตาราง behavior_logs - ประวัติการเปลี่ยนคะแนน */
export interface BehaviorLog {
  log_id: number;
  store_id: number;
  /**
   * เช่น -5 หรือ +1
   * ตั้งชื่อว่า score_change ไม่ใช่ change เพราะ CHANGE เป็นคำสงวนของ MySQL
   */
  score_change: number;
  score_after: number;
  reason: string;
  created_at: string;
}

/** คะแนนความประพฤติพร้อมประวัติ */
export interface BehaviorScoreWithLogs extends BehaviorScore {
  logs: BehaviorLog[];
}

/** คะแนนความประพฤติในหน้า Admin */
export interface BehaviorScoreForAdmin extends BehaviorScore {
  store_name: string;
  store_status: StoreStatus;
}

/** ตาราง reports */
export interface Report {
  report_id: number;
  reporter_id: number;
  target_type: ReportTargetType;
  target_id: number;
  reason: string;
  status: ReportStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  /** มาจากการ JOIN ตาราง users */
  reporter_name?: string;
  reporter_email?: string;
}
