/**
 * เส้นทาง /api/auth
 *
 * ลำดับ middleware ที่ต้องจำ
 *   route -> [auth] -> [role] -> [validator] -> validate -> controller
 */
import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import validate from '../middleware/validate';
import authMiddleware from '../middleware/authMiddleware';
import authController from '../controllers/authController';
import { imageUploader } from '../middleware/uploadMiddleware';
import { rateLimit } from '../middleware/rateLimitMiddleware';
import {
  registerRules, loginRules, changePasswordRules, updateProfileRules,
  forgotPasswordRules, resetPasswordRules,
} from '../validators/authValidator';

const router = Router();

/*
 * =====================================================================
 *  จำกัดจำนวนครั้งที่ยิงเข้ามา (rate limiting)
 * =====================================================================
 *  ใส่เฉพาะเส้นทางที่เกี่ยวกับการยืนยันตัวตน เพราะเป็นเป้าหมายหลัก
 *  ของการเดารหัสผ่านและการยิงสแปม
 *
 *  *** ต้องวางก่อน validator เสมอ ***
 *  ถ้าวางทีหลัง เซิร์ฟเวอร์จะเสียแรงตรวจข้อมูลให้คนที่กำลังยิงถล่มอยู่
 *  ทั้งที่สุดท้ายก็จะปฏิเสธอยู่ดี
 *
 *  ตัวเลขเลือกจากพฤติกรรมคนใช้จริง
 *    login  20 ครั้ง/15 นาที - คนพิมพ์ผิดจริง ๆ ไม่เกิน 4-5 ครั้ง
 *                             เผื่อไว้เยอะเพราะบ้านหนึ่งหลังใช้ IP เดียวกันหลายคน
 *    forgot  5 ครั้ง/15 นาที - กันคนเอาระบบเราไปยิงอีเมลรบกวนคนอื่น
 *    register 5 ครั้ง/60 นาที - คนปกติสมัครครั้งเดียว กันสร้างบัญชีปลอมเป็นร้อย
 */
const loginLimit = rateLimit({
  scope: 'login',
  max: 20,
  windowMinutes: 15,
  message: 'พยายามเข้าสู่ระบบถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
});

const forgotLimit = rateLimit({
  scope: 'forgot',
  max: 5,
  windowMinutes: 15,
  message: 'ขอรหัสตั้งรหัสผ่านใหม่ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
});

const registerLimit = rateLimit({
  scope: 'register',
  max: 5,
  windowMinutes: 60,
  message: 'สมัครสมาชิกถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
});

router.post('/register', registerLimit, registerRules, validate, asyncHandler(authController.register));
router.post('/login', loginLimit, loginRules, validate, asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));

// ---- ลืมรหัสผ่าน ----
// ทั้งสองเส้นนี้ไม่ต้อง login ก่อน เพราะคนที่ใช้คือคนที่เข้าระบบไม่ได้อยู่แล้ว
// ความปลอดภัยอยู่ที่ token ในลิงก์ที่ส่งไปทางอีเมลแทน
router.post('/forgot-password', forgotLimit, forgotPasswordRules, validate, asyncHandler(authController.forgotPassword));
router.post('/reset-password', forgotLimit, resetPasswordRules, validate, asyncHandler(authController.resetPassword));
router.get('/me', authMiddleware, asyncHandler(authController.me));

// แก้ไขข้อมูลส่วนตัว - imageUploader ต้องมาก่อน validator
// เพราะ multer เป็นตัวแกะ multipart/form-data ให้กลายเป็น req.body
// ถ้าวางสลับกัน validator จะเห็น req.body เป็นค่าว่างตลอด
router.put(
  '/me',
  authMiddleware,
  imageUploader('profile'),
  updateProfileRules,
  validate,
  asyncHandler(authController.updateProfile)
);
router.put('/password', authMiddleware, changePasswordRules, validate, asyncHandler(authController.changePassword));

export default router;
