/**
 * จำกัดจำนวนครั้งที่ยิงเข้ามาในช่วงเวลาหนึ่ง (rate limiting)
 *
 * *** ปัญหาที่แก้ ***
 * ถ้าไม่มีตัวนี้ ใครก็เขียนสคริปต์ยิง POST /api/auth/login ได้ไม่จำกัด
 * เอาลิสต์รหัสผ่านที่รั่วไหลหลายล้านตัวมายิงรัว ๆ ทีละหมื่นครั้งต่อนาที
 * ไม่ว่ากฎรหัสผ่านจะเข้มแค่ไหน ถ้าปล่อยให้เดาได้ไม่จำกัดก็มีวันเดาถูก
 *
 * NIST SP 800-63B ระบุว่า "ต้องจำกัดจำนวนครั้งที่ยืนยันตัวตนไม่สำเร็จ"
 * และถือว่าสำคัญกว่ากฎบังคับตัวพิมพ์ใหญ่เล็กเสียอีก
 *
 * *** ทำไมเขียนเองแทนที่จะลง express-rate-limit ***
 *   1. ไม่ต้องติดตั้ง package เพิ่ม ซึ่งต้องมีเน็ตตอน npm install
 *   2. โค้ดสั้นพอที่จะอ่านเข้าใจได้ทั้งหมด ไม่ใช่กล่องดำ
 *   3. โปรเจกต์นี้รันเครื่องเดียว ไม่ต้องแชร์ตัวนับข้ามหลายเซิร์ฟเวอร์
 *
 * *** ข้อจำกัดที่ต้องรู้ : เก็บใน memory ***
 * ตัวนับหายหมดเมื่อรีสตาร์ท backend และถ้ารันหลายเครื่องพร้อมกัน
 * แต่ละเครื่องจะนับแยกกัน ระบบใหญ่จริงจึงต้องย้ายไปเก็บใน Redis
 * แต่สำหรับโปรเจกต์นี้ที่รันเครื่องเดียว วิธีนี้ทำงานได้ถูกต้อง
 */
import type { Request, Response, NextFunction } from 'express';
import ApiError from '../utils/ApiError';

interface Bucket {
  /** ยิงเข้ามากี่ครั้งแล้วในช่วงเวลานี้ */
  count: number;
  /** เวลาที่ช่วงนี้จะหมดอายุ (epoch milliseconds) */
  resetAt: number;
}

/** ตัวนับทั้งหมด key = ตัวระบุผู้ยิง (เช่น IP หรือ IP+อีเมล) */
const buckets = new Map<string, Bucket>();

/**
 * เก็บกวาดตัวนับที่หมดอายุแล้วทุก 5 นาที
 *
 * *** ถ้าไม่ทำ Map จะโตขึ้นเรื่อย ๆ ไม่มีวันเล็กลง ***
 * ทุก IP ที่เคยเข้ามาจะค้างอยู่ตลอดอายุของเซิร์ฟเวอร์ กินหน่วยความจำไปเรื่อย ๆ
 * เรียกว่า memory leak ซึ่งกว่าจะรู้ตัวก็ตอนเซิร์ฟเวอร์ล่มแล้ว
 *
 * unref() บอก Node ว่าอย่านับ timer นี้เป็นงานค้าง
 * ไม่งั้นโปรเซสจะไม่ยอมปิดตัวตอนกด Ctrl+C
 */
const sweeper = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60 * 1000);
sweeper.unref();

/** หา IP ของผู้ยิง เผื่อกรณีอยู่หลัง proxy */
function clientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

export interface RateLimitOptions {
  /** ยิงได้กี่ครั้งในหนึ่งช่วงเวลา */
  max: number;
  /** ความยาวของช่วงเวลา (นาที) */
  windowMinutes: number;
  /** ชื่อกลุ่ม เพื่อให้แต่ละ endpoint นับแยกกัน */
  scope: string;
  /** ข้อความตอนโดนบล็อก */
  message?: string;
}

/**
 * สร้าง middleware จำกัดจำนวนครั้งตาม IP
 *
 * @example
 *   router.post('/login', rateLimit({ max: 10, windowMinutes: 15, scope: 'login' }), ...)
 */
export function rateLimit(options: RateLimitOptions) {
  const windowMs = options.windowMinutes * 60 * 1000;

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${options.scope}:${clientIp(req)}`;
    const now = Date.now();
    const bucket = buckets.get(key);

    // ยังไม่เคยยิง หรือช่วงเวลาเดิมหมดอายุแล้ว -> เริ่มนับใหม่
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      const minutesLeft = Math.max(1, Math.ceil((bucket.resetAt - now) / 60000));
      throw new ApiError(
        429,
        options.message ?? `คุณทำรายการถี่เกินไป กรุณารออีก ${minutesLeft} นาทีแล้วลองใหม่`
      );
    }

    next();
  };
}

// =====================================================================
//  ตัวนับรายบัญชี - ใช้คู่กับตัวนับราย IP
// =====================================================================
//
//  *** ทำไมนับราย IP อย่างเดียวไม่พอ ***
//  คนร้ายที่จริงจังใช้ IP หลายพันตัวหมุนยิง (botnet) แต่ละ IP ยิงแค่ไม่กี่ครั้ง
//  ตัวนับราย IP จึงไม่มีวันเต็ม แต่รวมกันแล้วบัญชีนั้นโดนเดาไปหลายหมื่นครั้ง
//  จึงต้องนับที่ "บัญชี" ด้วย ว่าบัญชีนี้ถูกเดาผิดไปกี่ครั้งแล้วไม่ว่าจะมาจากที่ไหน
//
//  *** นับเฉพาะครั้งที่ "ผิด" เท่านั้น ***
//  ถ้านับทุกครั้งที่ล็อกอิน คนที่ใช้งานปกติจะโดนล็อกทั้งที่ไม่ได้ทำอะไรผิด
// =====================================================================

/** เดารหัสผิดได้กี่ครั้งต่อบัญชี ก่อนถูกพักชั่วคราว */
export const MAX_FAILED_LOGINS = 8;

/** พักนานกี่นาที */
export const LOCKOUT_MINUTES = 15;

const failedLogins = new Map<string, Bucket>();

/** ทำให้ตัวระบุบัญชีเป็นรูปแบบเดียวกัน กัน 'A@x.com' กับ 'a@x.com' นับแยกกัน */
function accountKey(identifier: string): string {
  return identifier.trim().toLowerCase();
}

/**
 * เช็คก่อนตรวจรหัสผ่านว่าบัญชีนี้ถูกพักอยู่หรือไม่
 * @throws ApiError 429 ถ้าเดาผิดเกินโควตา
 */
export function assertAccountNotLocked(identifier: string): void {
  const bucket = failedLogins.get(accountKey(identifier));
  if (!bucket) return;

  const now = Date.now();
  if (bucket.resetAt <= now) {
    failedLogins.delete(accountKey(identifier));
    return;
  }

  if (bucket.count >= MAX_FAILED_LOGINS) {
    const minutesLeft = Math.max(1, Math.ceil((bucket.resetAt - now) / 60000));
    throw new ApiError(
      429,
      `กรอกรหัสผ่านผิดหลายครั้งเกินไป บัญชีนี้ถูกพักการเข้าสู่ระบบชั่วคราว กรุณารออีก ${minutesLeft} นาที`
    );
  }
}

/** เรียกเมื่อรหัสผ่านผิด */
export function recordFailedLogin(identifier: string): void {
  const key = accountKey(identifier);
  const now = Date.now();
  const bucket = failedLogins.get(key);

  if (!bucket || bucket.resetAt <= now) {
    failedLogins.set(key, { count: 1, resetAt: now + LOCKOUT_MINUTES * 60 * 1000 });
    return;
  }
  bucket.count += 1;
}

/**
 * เรียกเมื่อเข้าสู่ระบบสำเร็จ - ล้างตัวนับทิ้ง
 *
 * สำคัญมาก ไม่งั้นคนที่พิมพ์ผิดไป 7 ครั้งแล้วเข้าได้ในครั้งที่ 8
 * จะยังเหลือโควตาแค่ครั้งเดียวไปอีก 15 นาที ทั้งที่พิสูจน์ตัวตนได้แล้ว
 */
export function clearFailedLogins(identifier: string): void {
  failedLogins.delete(accountKey(identifier));
}

export default rateLimit;
