/**
 * รูปแบบ Response มาตรฐานของ SaveEats
 *
 * ทุก endpoint ต้องตอบกลับหน้าตาแบบนี้เท่านั้น ฝั่งแอปจะได้เขียนโค้ดรับผลง่าย
 *
 *   สำเร็จ  { "success": true,  "message": "...", "data": {...} }
 *   ล้มเหลว { "success": false, "message": "...", "details": ... }
 *
 * *** ชนิดข้อมูลตรงนี้ตรงกับ ApiResponse / PaginatedResponse ใน shared/src/api.ts ***
 */
import type { Response } from 'express';

/** ส่งผลลัพธ์สำเร็จ */
export function ok<T>(res: Response, data: T, message = 'สำเร็จ', statusCode = 200): Response {
  return res.status(statusCode).json({ success: true, message, data });
}

/** ส่งผลลัพธ์สำเร็จแบบสร้างข้อมูลใหม่ (HTTP 201) */
export function created<T>(res: Response, data: T, message = 'สร้างข้อมูลสำเร็จ'): Response {
  return ok(res, data, message, 201);
}

export interface PaginationInput {
  page: number | string;
  limit: number | string;
  total: number;
}

/** ส่งผลลัพธ์แบบแบ่งหน้า */
export function paginated<T>(
  res: Response,
  items: T[],
  { page, limit, total }: PaginationInput,
  message = 'สำเร็จ'
): Response {
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total: Number(total),
      totalPages: Math.ceil(Number(total) / limitNum) || 1,
    },
  });
}
