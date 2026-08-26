/**
 * จัดการ Error ทั้งหมดไว้ที่เดียว
 * ต้องประกาศเป็น middleware ตัวสุดท้ายใน app.ts เสมอ
 */
import type { Request, Response, NextFunction, ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import env from '../config/env';
import { isApiError } from '../utils/ApiError';

/** error ของ mysql2 มี code ติดมาด้วย */
function mysqlErrorCode(err: unknown): string | null {
  if (typeof err === 'object' && err !== null && 'code' in err) {
    return String((err as { code: unknown }).code);
  }
  return null;
}

/** เมื่อไม่มี route ไหนตรงเลย */
export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `ไม่พบเส้นทาง ${req.method} ${req.originalUrl}`,
  });
};

/** ตัวจัดการ error หลัก */
export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // 1) Error ที่เราสร้างเอง
  if (isApiError(err)) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // 2) Error จาก multer (ไฟล์ใหญ่เกิน ฯลฯ)
  if (err instanceof multer.MulterError) {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'ไฟล์รูปมีขนาดใหญ่เกินไป (สูงสุด 5 MB)'
        : 'อัปโหลดไฟล์ไม่สำเร็จ';
    res.status(400).json({ success: false, message });
    return;
  }

  // 3) Error จาก MySQL ที่พบบ่อย
  const code = mysqlErrorCode(err);
  if (code === 'ER_DUP_ENTRY') {
    res.status(409).json({ success: false, message: 'ข้อมูลนี้มีอยู่ในระบบแล้ว' });
    return;
  }
  if (code === 'ER_NO_REFERENCED_ROW_2') {
    res.status(400).json({ success: false, message: 'ข้อมูลอ้างอิงไม่ถูกต้อง' });
    return;
  }
  if (code === 'ECONNREFUSED' || code === 'PROTOCOL_CONNECTION_LOST') {
    res.status(503).json({
      success: false,
      message: 'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบว่าเปิด MySQL ใน XAMPP แล้วหรือยัง',
    });
    return;
  }

  // 4) Error ที่ไม่รู้จัก - log ไว้เต็ม ๆ แต่ตอบผู้ใช้แบบกลาง ๆ
  console.error('[UNHANDLED ERROR]', err);
  res.status(500).json({
    success: false,
    message: 'เกิดข้อผิดพลาดภายในระบบ',
    ...(env.NODE_ENV === 'development'
      ? { debug: err instanceof Error ? err.message : String(err) }
      : {}),
  });
};
