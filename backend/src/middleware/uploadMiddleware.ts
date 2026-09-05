/**
 * จัดการไฟล์รูปที่ผู้ใช้อัปโหลดเข้ามา (ใช้ multer)
 *
 * *** กฎเหล็กข้อ 7 : รูปที่ผู้ใช้อัปโหลด เก็บที่ backend/uploads/ เท่านั้น ***
 * ห้ามเก็บใน mobile/assets/ เพราะ assets คือไฟล์ที่ติดมากับตัวแอปตั้งแต่แรก
 *
 * ไฟล์นี้ทำงาน 2 แบบ สลับให้เองตามว่าตั้งค่า Cloudinary ไว้หรือยัง
 *
 *   ยังไม่ตั้งค่า  ->  เก็บเป็นไฟล์ในโฟลเดอร์ backend/uploads (ใช้ตอนพัฒนาในเครื่อง)
 *                     ฐานข้อมูลเก็บ "ชื่อไฟล์"
 *
 *   ตั้งค่าแล้ว    ->  ส่งขึ้น Cloudinary (ใช้ตอนขึ้นคลาวด์)
 *                     ฐานข้อมูลเก็บ "ที่อยู่เต็มของรูป"
 *
 * ตัวเรียกใช้ (routes และ controllers) ไม่ต้องรู้เลยว่าใช้แบบไหนอยู่
 * เพราะทั้งสองแบบคืนค่าออกมาทาง uploadedFilename() เหมือนกัน
 */
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

import multer from 'multer';
import type { RequestHandler } from 'express';

import ApiError from '../utils/ApiError';
import { useCloudStorage, uploadToCloud } from '../config/cloudinary';

export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_SIZE_MB = 5;

/** โฟลเดอร์ปลายทางที่อนุญาต */
export type UploadFolder = 'food' | 'store' | 'profile';

/** ข้อจำกัดและการคัดกรองไฟล์ ใช้ร่วมกันทั้งสองแบบ */
const limits = { fileSize: MAX_SIZE_MB * 1024 * 1024 };

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!(ALLOWED_MIME as readonly string[]).includes(file.mimetype)) {
    cb(ApiError.badRequest('รองรับเฉพาะไฟล์รูป JPG, PNG และ WebP เท่านั้น'));
    return;
  }
  cb(null, true);
};

/**
 * สร้าง middleware สำหรับอัปโหลดรูป 1 ไฟล์
 * @param folder โฟลเดอร์ปลายทาง
 * @param fieldName ชื่อ field ใน form-data
 */
export function imageUploader(folder: UploadFolder, fieldName = 'image'): RequestHandler {
  // ---------- แบบที่ 1 : เก็บลงโฟลเดอร์ในเครื่อง ----------
  if (!useCloudStorage) {
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

    return multer({ storage, limits, fileFilter }).single(fieldName);
  }

  // ---------- แบบที่ 2 : ส่งขึ้น Cloudinary ----------
  /*
   * เก็บไฟล์ไว้ในหน่วยความจำก่อน ไม่แตะฮาร์ดดิสก์เลย
   * เพราะดิสก์ของเซิร์ฟเวอร์ฟรีเป็นของชั่วคราวอยู่แล้ว เขียนไปก็หาย
   * ไฟล์ใหญ่สุดที่รับคือ 5 MB จึงไม่กินแรมจนน่ากังวล
   */
  const receiveFile = multer({ storage: multer.memoryStorage(), limits, fileFilter }).single(fieldName);

  return (req, res, next): void => {
    receiveFile(req, res, (err: unknown) => {
      if (err !== undefined && err !== null) {
        next(err);
        return;
      }

      const file = req.file;
      // ผู้ใช้ไม่ได้แนบรูปมา ก็ไม่มีอะไรต้องอัปโหลด
      if (file === undefined) {
        next();
        return;
      }

      uploadToCloud(file.buffer, folder)
        .then((url) => {
          /*
           * เอาที่อยู่เต็มของรูปใส่กลับเข้าไปในช่อง filename
           * เพื่อให้ uploadedFilename() ข้างล่างและ controllers ทุกตัว
           * ทำงานเหมือนเดิมทุกประการ ไม่ต้องแก้สักบรรทัด
           */
          file.filename = url;
          next();
        })
        .catch((uploadError: unknown) => {
          next(uploadError);
        });
    });
  };
}

/**
 * อ่านค่าของรูปที่อัปโหลดมา (ถ้ามี)
 *
 * คืนค่าเป็น "ชื่อไฟล์" เมื่อเก็บลงเครื่อง หรือ "ที่อยู่เต็ม" เมื่อใช้ Cloudinary
 * คืน undefined ถ้าผู้ใช้ไม่ได้แนบรูป จะได้เอาไปใช้กับ COALESCE ใน SQL ได้เลย
 */
export function uploadedFilename(req: { file?: Express.Multer.File }): string | undefined {
  return req.file?.filename;
}
