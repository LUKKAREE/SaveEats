/**
 * ตัวช่วยอ่านค่าจาก req.query และ req.params
 *
 * ทำไมต้องมีไฟล์นี้
 *   ค่าใน req.query มีชนิดเป็น string | string[] | ParsedQs | undefined
 *   เพราะผู้ใช้ส่งอะไรมาก็ได้ เช่น ?page=1&page=2 จะได้ array
 *   ถ้าเอาไปใช้ตรง ๆ TypeScript จะฟ้อง และโปรแกรมอาจพังตอนรันจริง
 *
 *   ฟังก์ชันในไฟล์นี้แปลงให้เป็นชนิดที่แน่นอนตั้งแต่ต้นทาง
 */
import type { Request } from 'express';
import ApiError from './ApiError';

/** อ่านค่าเป็นข้อความ ถ้าไม่มีคืนค่าสำรอง */
export function qStr(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return fallback;
}

/** อ่านค่าเป็นตัวเลข ถ้าแปลงไม่ได้คืน null */
export function qNum(value: unknown): number | null {
  const text = qStr(value);
  if (text === '') return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** อ่านค่าเป็นตัวเลข ถ้าแปลงไม่ได้คืนค่าสำรอง */
export function qNumOr(value: unknown, fallback: number): number {
  return qNum(value) ?? fallback;
}

/** อ่านค่าเป็น boolean รองรับทั้ง true/false และ 1/0 */
export function qBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  const text = qStr(value).toLowerCase();
  if (text === 'true' || text === '1') return true;
  if (text === 'false' || text === '0') return false;
  return fallback;
}

/**
 * อ่าน id จาก URL เช่น /api/stores/:id
 * ถ้าไม่ใช่ตัวเลขจะโยน 400 ทันที ไม่ต้องไปเช็คซ้ำใน controller
 */
export function paramId(req: Request, key = 'id'): number {
  const raw = req.params[key];
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw ApiError.badRequest('รหัสอ้างอิงในลิงก์ไม่ถูกต้อง');
  }
  return parsed;
}

/** อ่านค่า page และ limit จาก query พร้อมกัน */
export function pageParams(req: Request): { page: number; limit: number } {
  return {
    page: Math.max(qNumOr(req.query['page'], 1), 1),
    limit: Math.min(Math.max(qNumOr(req.query['limit'], 20), 1), 100),
  };
}
