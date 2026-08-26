/**
 * จัดการไฟล์รูปที่ผู้ใช้อัปโหลดเข้ามา (ใช้ multer)
 *
 * *** กฎเหล็กข้อ 7 : รูปที่ผู้ใช้อัปโหลด เก็บที่ backend/uploads/ เท่านั้น ***
 * ห้ามเก็บใน mobile/assets/ เพราะ assets คือไฟล์ที่ติดมากับตัวแอปตั้งแต่แรก
 */
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import multer from 'multer';
import type { RequestHandler } from 'express';
import ApiError from '../utils/ApiError';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_SIZE_MB = 5;

/** โฟลเดอร์ปลายทางที่อนุญาต */
export type UploadFolder = 'food' | 'store' | 'profile';

/**
 * สร้าง middleware สำหรับอัปโหลดรูป 1 ไฟล์
 * @param folder โฟลเดอร์ปลายทางใน backend/uploads/
 * @param fieldName ชื่อ field ใน form-data
 */
export function imageUploader(folder: UploadFolder, fieldName = 'image'): RequestHandler {
  const dest = path.join(__dirname, '..', '..', 'uploads', folder);
  fs.mkdirSync(dest, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      // ตั้งชื่อไฟล์แบบสุ่ม กันชื่อชนกันและกันคนเดาชื่อไฟล์คนอื่น
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!(ALLOWED_MIME as readonly string[]).includes(file.mimetype)) {
        cb(ApiError.badRequest('รองรับเฉพาะไฟล์รูป JPG, PNG และ WebP เท่านั้น'));
        return;
      }
      cb(null, true);
    },
  }).single(fieldName);
}

/**
 * อ่านชื่อไฟล์ที่อัปโหลดมา (ถ้ามี)
 * คืน undefined ถ้าผู้ใช้ไม่ได้แนบรูป จะได้เอาไปใช้กับ COALESCE ใน SQL ได้เลย
 */
export function uploadedFilename(req: { file?: Express.Multer.File }): string | undefined {
  return req.file?.filename;
}
