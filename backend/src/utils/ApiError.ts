/**
 * คลาส Error มาตรฐานของโปรเจกต์
 * ใช้ throw จากที่ไหนก็ได้ แล้ว errorHandler จะจับไปแปลงเป็น response ให้เอง
 *
 * ตัวอย่าง : throw ApiError.notFound('ไม่พบร้านค้านี้');
 */

/** รายละเอียดของ field ที่กรอกผิด */
export interface ApiErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly details: ApiErrorDetail[] | null;
  /** ใช้เช็คใน errorHandler ว่าเป็น error ที่เราสร้างเองหรือไม่ */
  readonly isApiError = true;

  constructor(statusCode: number, message: string, details: ApiErrorDetail[] | null = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(msg = 'ข้อมูลไม่ถูกต้อง', details: ApiErrorDetail[] | null = null): ApiError {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'กรุณาเข้าสู่ระบบก่อน'): ApiError {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'คุณไม่มีสิทธิ์ทำรายการนี้'): ApiError {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'ไม่พบข้อมูลที่ต้องการ'): ApiError {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'ข้อมูลซ้ำหรือขัดแย้งกัน'): ApiError {
    return new ApiError(409, msg);
  }
}

/**
 * ตัวช่วยเช็คว่า error ที่จับได้เป็น ApiError หรือไม่
 * เรียกว่า type guard : ถ้าคืนค่า true TypeScript จะรู้ทันทีว่าตัวแปรนั้นเป็น ApiError
 */
export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError || (typeof err === 'object' && err !== null && 'isApiError' in err);
}

export default ApiError;
