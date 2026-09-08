/**
 * หน้าตาข้อมูลที่ "ส่งเข้า" API
 * DTO ย่อมาจาก Data Transfer Object แปลว่า "ก้อนข้อมูลที่ส่งไปมา"
 *
 * ประโยชน์ : ฝั่งแอปกับฝั่ง backend ใช้ type ตัวเดียวกัน
 * ถ้าฝั่งหนึ่งเปลี่ยนชื่อ field อีกฝั่งจะขึ้น error ทันที
 */
import type { UserRole, ReservationStatus, StoreStatus, FeedSort, ReportTargetType, ReportStatus } from './enums';

// ---------------------------------------------------------------- Auth

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
  /** ไม่ส่งมา = customer  *** ส่ง 'admin' มาไม่ได้ backend ปฏิเสธ *** */
  role?: Exclude<UserRole, 'admin'>;
  /** บังคับกรอกเมื่อ role = seller */
  storeName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface LoginRequest {
  /**
   * อีเมลหรือเบอร์โทรศัพท์ก็ได้ ระบบดูให้เองว่าเป็นอันไหน
   * (ฝั่งมือถือส่งช่องนี้มา ตามหน้า Login แบบใหม่)
   */
  identifier?: string;
  /**
   * อีเมลอย่างเดียว
   * ยังรับไว้เพื่อให้ Admin Web ตัวเดิมที่ส่ง email มาใช้งานต่อได้โดยไม่ต้องแก้
   */
  email?: string;
  password: string;
}

/** ขอรหัสตั้งรหัสผ่านใหม่ (POST /api/auth/forgot-password) */
export interface ForgotPasswordRequest {
  email: string;
}

/** ผลลัพธ์ที่ได้กลับมาหลังขอรหัส */
export interface ForgotPasswordResult {
  /**
   * รหัส 6 หลัก
   *
   * ปกติเป็น null เสมอ เพราะรหัสต้องเดินทางไปทางอีเมลเท่านั้น
   * จะมีค่าก็ต่อเมื่อยังไม่ได้ตั้งค่า SMTP (โหมดสาธิต)
   * เพื่อให้ทดสอบบนมือถือได้โดยไม่ต้องมีบัญชีส่งอีเมล
   */
  demoCode: string | null;
}

/**
 * ตั้งรหัสผ่านใหม่ (POST /api/auth/reset-password)
 *
 * ส่งมาได้ 2 แบบ เลือกอย่างใดอย่างหนึ่ง
 *   1. token          - มาจากลิงก์ในอีเมล (เปิดหน้าเว็บ)
 *   2. email + code   - มาจากรหัส 6 หลักที่กรอกในแอป
 */
export interface ResetPasswordRequest {
  token?: string;
  email?: string;
  code?: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * แก้ไขข้อมูลส่วนตัว (PUT /api/auth/me)
 *
 * ทุกช่องเป็น optional เพราะผู้ใช้อาจแก้แค่ช่องเดียว
 * ช่องที่ไม่ส่งมา Backend จะเก็บค่าเดิมไว้ (ใช้ COALESCE ใน SQL)
 *
 * *** เปลี่ยนอีเมลไม่ได้ ***
 * เพราะอีเมลคือตัวระบุตัวตนตอน login ถ้าให้เปลี่ยนได้ต้องมีระบบยืนยันอีเมลก่อน
 * รูปโปรไฟล์ส่งเป็นไฟล์แนบชื่อ field 'image' ไม่ได้อยู่ใน body นี้
 */
export interface UpdateProfileRequest {
  name?: string;
  phone?: string;
}

// ---------------------------------------------------------------- ร้านค้า

export interface UpdateStoreRequest {
  storeName?: string;
  description?: string;
  address?: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  openTime?: string;
  closeTime?: string;
}

export interface NearbyQuery {
  lat: number;
  lng: number;
  /** รัศมีเป็นกิโลเมตร ไม่ส่ง = 5 */
  radius?: number;
}

// ---------------------------------------------------------------- เมนูอาหาร

export interface CreateFoodRequest {
  name: string;
  normalPrice: number;
  description?: string;
  categoryId?: number;
}

export type UpdateFoodRequest = Partial<CreateFoodRequest> & {
  isActive?: boolean;
};

// ---------------------------------------------------------------- โพสต์ขาย

export interface CreatePostRequest {
  foodId: number;
  discountPrice: number;
  quantity: number;
  /** รูปแบบ 'YYYY-MM-DD HH:mm:ss' */
  pickupStart: string;
  pickupEnd: string;
  /**
   * จองแล้วลูกค้าต้องมารับภายในกี่นาที ไม่ใส่มาจะใช้ค่าเริ่มต้น 30 นาที
   *
   * ร้านกำหนดเองตามชนิดอาหาร ของทอดอาจให้ 30 นาที
   * ส่วนขนมปังให้ 120 นาทีก็ยังขายได้
   */
  holdMinutes?: number;
  caption?: string;
}

export type UpdatePostRequest = Partial<CreatePostRequest> & {
  status?: 'active' | 'hidden';
};

/** ตัวกรองของ Feed (ข้อค้าง 2) */
export interface FeedQuery {
  search?: string;
  categoryId?: number;
  maxPrice?: number;
  storeId?: number;
  sort?: FeedSort;
  page?: number;
  limit?: number;
  /** ส่ง lat และ lng มาด้วย จะได้ distance_km กลับไป */
  lat?: number;
  lng?: number;
  /** ใช้ได้เมื่อส่ง lat และ lng มาด้วยเท่านั้น */
  radius?: number;
}

// ---------------------------------------------------------------- การจอง

export interface CreateReservationRequest {
  postId: number;
  /** ไม่ส่ง = 1 */
  quantity?: number;
}

/**
 * ร้านยืนยันการรับอาหาร
 * ต้องส่งมาอย่างน้อย 1 อย่าง จะส่งทั้งคู่ก็ได้ (ระบบจะใช้ qrPayload ก่อน)
 */
export interface VerifyReservationRequest {
  /** ข้อความที่สแกนได้จาก QR */
  qrPayload?: string;
  /** รหัส 4 หลักที่ร้านกรอกเอง */
  code?: string;
}

export interface ReservationListQuery {
  status?: ReservationStatus | '';
  page?: number;
  limit?: number;
}

// ---------------------------------------------------------------- รีวิว

export interface CreateReviewRequest {
  reservationId: number;
  /** 1 ถึง 5 */
  rating: number;
  comment?: string;
}

// ---------------------------------------------------------------- แจ้งปัญหา

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
}

/**
 * ส่งข้อความเข้าไปในเรื่องที่แจ้ง
 * ใช้ได้ทั้งฝั่งผู้แจ้งและฝั่งผู้ดูแล ต่างกันแค่ endpoint ที่ยิงไป
 */
export interface CreateReportMessageRequest {
  message: string;
}

export interface UpdateReportRequest {
  status: ReportStatus;
  /** บันทึกภายใน เห็นเฉพาะผู้ดูแล */
  adminNote?: string;
  /**
   * ข้อความถึงเจ้าของสิ่งที่ถูกแจ้ง
   * ส่งมาเฉพาะตอนปิดเรื่องแบบ resolved เท่านั้น ถึงจะมีการแจ้งเตือนออกไป
   */
  resolutionMessage?: string;
  /**
   * ตัดคะแนนความประพฤติของร้านด้วยหรือไม่
   *
   * *** ทำไมต้องให้ผู้ดูแลติ๊กเอง ไม่หักอัตโนมัติทุกครั้ง ***
   * เรื่องที่ปิดแบบ resolved ไม่ได้แปลว่าร้านผิดเสมอไป
   * บางเรื่องปิดเพราะคุยกันจบแล้ว หรือเป็นความเข้าใจผิดของทั้งสองฝ่าย
   * ถ้าหักอัตโนมัติ ร้านที่ไม่ได้ทำอะไรผิดจะโดนตัดคะแนนไปด้วย
   *
   * ใช้ได้เฉพาะเรื่องที่ผูกกับร้าน (store / post / reservation) เท่านั้น
   */
  penalizeStore?: boolean;
}

// ---------------------------------------------------------------- Admin

export interface AdminStoreListQuery {
  status?: StoreStatus | '';
  search?: string;
  page?: number;
  limit?: number;
}

export interface RejectStoreRequest {
  reason: string;
}

export interface SetUserActiveRequest {
  isActive: boolean;
}

export interface AdjustBehaviorRequest {
  /** ตัวเลขบวกหรือลบ เช่น -5 */
  change: number;
  reason?: string;
}

/** query ที่ใช้ร่วมกันหลายที่ */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
}
