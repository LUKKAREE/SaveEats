/**
 * หน้าตาข้อมูลที่ API ส่งกลับมา
 *
 * ทุก endpoint ของ SaveEats ตอบกลับด้วยรูปแบบเดียวกันหมด
 *     สำเร็จ  { success: true,  message, data }
 *     ล้มเหลว { success: false, message, details? }
 */
import type {
  PublicUser, Store, Food, Post, Reservation, BehaviorScoreWithLogs,
} from './entities';
import type { ReservationStatus } from './enums';

/** ผลลัพธ์มาตรฐานของทุก endpoint */
export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

/** ผลลัพธ์แบบแบ่งหน้า */
export interface PaginatedResponse<T> {
  success: true;
  message: string;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** ผลลัพธ์เมื่อเกิดข้อผิดพลาด */
export interface ApiErrorResponse {
  success: false;
  message: string;
  details?: Array<{ field: string; message: string }>;
}

/**
 * รูปแบบ error ที่ apiClient ของฝั่งแอปและเว็บโยนออกมา
 * หน้าจอเอา message ไปแสดงได้เลย เพราะเป็นภาษาไทยอยู่แล้ว
 */
export interface ApiClientError {
  message: string;
  /** 0 = ต่อเซิร์ฟเวอร์ไม่ได้เลย */
  status: number;
  details: Array<{ field: string; message: string }> | null;
}

/** ข้อมูลที่ได้หลัง login หรือ register สำเร็จ */
export interface AuthPayload {
  user: PublicUser;
  /** มีค่าเฉพาะตอน role = seller */
  store: Store | null;
  token: string;
}

/** ข้อมูลที่ได้จาก GET /api/auth/me (ไม่มี token) */
export interface MePayload {
  user: PublicUser;
  store: Store | null;
}

/**
 * 1 รายการใน Feed
 *
 * *** หน้าตานี้มาจาก FEED_SELECT ใน backend/src/models/postModel.ts ***
 * ถ้าแก้ SELECT ตรงนั้น ต้องมาแก้ที่นี่ด้วย
 */
export interface FeedItem extends Post {
  food_name: string;
  food_description: string | null;
  normal_price: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  store_name: string;
  store_image: string | null;
  store_address: string | null;
  latitude: number | null;
  longitude: number | null;
  store_rating: number;
  /** มีเฉพาะตอนส่ง lat และ lng ไปด้วย */
  distance_km?: number | null;
}

/** รายละเอียดการจอง (ข้อมูลจาก JOIN หลายตาราง) */
export interface ReservationDetail extends Reservation {
  food_name: string;
  /** รูปของรอบขายนี้ อยู่ในโฟลเดอร์ uploads/food/ */
  image: string | null;
  normal_price: number;
  store_name: string;
  /**
   * รูปหน้าร้าน อยู่ในโฟลเดอร์ uploads/store/
   *
   * *** เป็นคนละไฟล์กับ image ด้านบน ***
   * เดิมหน้าแอปไม่มีฟิลด์นี้ให้ใช้ เลยเอา image (ชื่อไฟล์รูปอาหาร)
   * ไปเปิดในโฟลเดอร์ store แล้วได้ 404 เพราะไฟล์นั้นอยู่ใน uploads/food/
   */
  store_image: string | null;
  store_address: string | null;
  store_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  customer_name: string;
  customer_phone: string | null;
  /** 0 = ยังไม่ได้รีวิว */
  has_review: number;
  /** ข้อความที่เอาไปวาดเป็น QR เช่น 'SAVEEATS:abc123...' */
  qr_payload: string;
}

/** ผลลัพธ์ของ GET /api/stores/:id */
export interface StoreDetailPayload {
  store: Store;
  posts: FeedItem[];
}

/** ผลลัพธ์ของ GET /api/stores/me (ฝั่ง seller) */
export interface MyStorePayload {
  store: Store;
  foods: Food[];
  behavior: BehaviorScoreWithLogs;
}

/** ผลลัพธ์ของ GET /api/admin/dashboard */
export interface DashboardStats {
  customers: number;
  sellers: number;
  pendingStores: number;
  approvedStores: number;
  activePosts: number;
  totalReservations: number;
  todayReservations: number;
  openReports: number;

  /** ยอดจองรายวันย้อนหลัง 7 วัน เรียงจากเก่าไปใหม่ ครบทุกวันเสมอ */
  daily: DailyCount[];
  /** จำนวนการจองแยกตามสถานะ ใช้วาดกราฟวงกลม */
  statusBreakdown: ReservationStatusCount[];
}

/** ยอดของวันหนึ่ง */
export interface DailyCount {
  /** รูปแบบ YYYY-MM-DD */
  date: string;
  count: number;
}

/** จำนวนการจองของสถานะหนึ่ง */
export interface ReservationStatusCount {
  status: ReservationStatus;
  count: number;
}

/** สรุปจำนวนรีวิวแยกตามดาว */
export interface RatingBreakdown {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

/** ผลลัพธ์ของ GET /api/notifications/unread-count */
export interface UnreadCountPayload {
  count: number;
}
