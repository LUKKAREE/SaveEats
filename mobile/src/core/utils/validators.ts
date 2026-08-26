/**
 * ตรวจข้อมูลที่ผู้ใช้กรอกในฟอร์ม (ตรวจฝั่งแอป)
 *
 * *** สำคัญ : การตรวจที่นี่มีไว้เพื่อ UX เท่านั้น ***
 * เพื่อให้ผู้ใช้เห็น error ทันทีโดยไม่ต้องรอ server
 * Backend ยังต้องตรวจซ้ำอีกรอบเสมอ เพราะใครก็ยิง API ตรงได้ (กฎเหล็กข้อ 3)
 *
 * ทุกฟังก์ชันคืนค่าเป็น
 *   null            = ผ่าน
 *   'ข้อความ error' = ไม่ผ่าน
 *
 * *** กฎอีเมลกับรหัสผ่านไม่ได้เขียนที่นี่ แต่ยืมมาจาก shared ***
 * เพื่อให้แอปกับ Backend ใช้กฎชุดเดียวกันเป๊ะ
 * ถ้าต่างคนต่างเขียน จะเกิดอาการ "แอปบอกผ่าน แต่กดสมัครแล้วโดนปฏิเสธ"
 * ซึ่งผู้ใช้จะงงมาก เพราะช่องกรอกขึ้นเขียวหมดแล้ว
 */
import { checkEmail, checkPassword } from '@shared/index';
import type { PasswordContext } from '@shared/index';

/** ผลของการตรวจ 1 ช่อง */
export type ValidationResult = string | null;

export function validateEmail(value: string): ValidationResult {
  return checkEmail(value);
}

/**
 * ตรวจรหัสผ่านตอน "ตั้งใหม่" (สมัครสมาชิก / ตั้งรหัสใหม่ / เปลี่ยนรหัส)
 * ต้องแข็งแรงครบทุกข้อ : 8 ตัว + พิมพ์ใหญ่ + พิมพ์เล็ก + ตัวเลข + อักขระพิเศษ
 */
export function validatePassword(value: string, context: PasswordContext = {}): ValidationResult {
  return checkPassword(value, context);
}

/**
 * ตรวจรหัสผ่านตอน "เข้าสู่ระบบ" - เช็คแค่ว่าไม่ว่าง
 *
 * *** ห้ามใช้กฎความแข็งแรงตอน login เด็ดขาด ***
 * ผู้ใช้ที่สมัครไว้ก่อนเปลี่ยนกฎ จะมีรหัสเดิมที่ไม่ผ่านเกณฑ์ใหม่
 * ถ้าบังคับตรงนี้ด้วย เขาจะเข้าระบบตัวเองไม่ได้ไปตลอดกาล
 * และการบอกว่า "รหัสผ่านไม่แข็งแรงพอ" ตอน login ยังเป็นการบอกใบ้
 * ให้คนที่กำลังเดารหัสรู้ว่ารูปแบบไหนไม่ต้องเสียเวลาลอง
 */
export function validateLoginPassword(value: string): ValidationResult {
  if (value === '') return 'กรุณากรอกรหัสผ่าน';
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): ValidationResult {
  if (confirm === '') return 'กรุณายืนยันรหัสผ่าน';
  if (password !== confirm) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
  return null;
}

export function validateName(value: string): ValidationResult {
  if (value.trim() === '') return 'กรุณากรอกชื่อ';
  if (value.trim().length < 2) return 'ชื่อสั้นเกินไป';
  return null;
}

export function validatePhone(value: string, required = false): ValidationResult {
  if (value.trim() === '') return required ? 'กรุณากรอกเบอร์โทร' : null;
  const digits = value.replace(/[-\s]/g, '');
  if (!/^[0-9]{9,10}$/.test(digits)) return 'เบอร์โทรต้องเป็นตัวเลข 9-10 หลัก';
  return null;
}

export function validatePrice(value: string | number, options: { max?: number } = {}): ValidationResult {
  if (value === '' || value === null || value === undefined) return 'กรุณากรอกราคา';
  const num = Number(value);
  if (Number.isNaN(num)) return 'ราคาต้องเป็นตัวเลข';
  if (num <= 0) return 'ราคาต้องมากกว่า 0';
  if (options.max !== undefined && num > options.max) return `ราคาต้องไม่เกิน ${options.max} บาท`;
  return null;
}

export function validateQuantity(
  value: string | number,
  options: { min?: number; max?: number } = {}
): ValidationResult {
  const min = options.min ?? 1;
  const num = Number(value);
  if (!Number.isInteger(num)) return 'จำนวนต้องเป็นจำนวนเต็ม';
  if (num < min) return `จำนวนต้องไม่น้อยกว่า ${min}`;
  if (options.max !== undefined && num > options.max) return `จำนวนต้องไม่เกิน ${options.max}`;
  return null;
}

export function validateStoreName(value: string): ValidationResult {
  if (value.trim() === '') return 'กรุณากรอกชื่อร้าน';
  if (value.trim().length < 2) return 'ชื่อร้านสั้นเกินไป';
  return null;
}

export function validateReservationCode(value: string): ValidationResult {
  if (value.trim() === '') return 'กรุณากรอกรหัส 4 หลัก';
  if (!/^[0-9]{4}$/.test(value.trim())) return 'รหัสต้องเป็นตัวเลข 4 หลัก';
  return null;
}

/**
 * ตรวจทั้งฟอร์มทีเดียว
 *
 * ใช้ generic <K> เพื่อให้ errors ที่คืนกลับมามี key ตรงกับที่ส่งเข้าไป
 * ตอนเขียน errors.email จะได้ autocomplete และพิมพ์ผิดจะฟ้อง
 *
 * @example
 *   const { isValid, errors } = validateForm({
 *     email: () => validateEmail(email),
 *     password: () => validatePassword(password),
 *   });
 */
export function validateForm<K extends string>(
  rules: Record<K, () => ValidationResult>
): { isValid: boolean; errors: Partial<Record<K, string>> } {
  const errors: Partial<Record<K, string>> = {};

  for (const key of Object.keys(rules) as K[]) {
    const message = rules[key]();
    if (message !== null) errors[key] = message;
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}
