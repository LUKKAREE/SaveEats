/**
 * ตั้งค่า Express Application
 *
 * ลำดับสำคัญมาก (ต้องเรียงแบบนี้เท่านั้น)
 *   1. middleware ทั่วไป (cors, json, log)
 *   2. เปิดโฟลเดอร์ uploads ให้เข้าถึงรูปได้
 *   3. routes ทั้งหมด
 *   4. notFoundHandler
 *   5. errorHandler   <-- ต้องอยู่ท้ายสุดเสมอ
 */
import path from 'node:path';
import express from 'express';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { renderResetPasswordPage } from './views/resetPasswordPage';

import authRoutes from './routes/authRoutes';
import storeRoutes from './routes/storeRoutes';
import foodRoutes from './routes/foodRoutes';
import postRoutes from './routes/postRoutes';
import reservationRoutes from './routes/reservationRoutes';
import reviewRoutes from './routes/reviewRoutes';
import reportRoutes from './routes/reportRoutes';
import notificationRoutes from './routes/notificationRoutes';
import categoryRoutes from './routes/categoryRoutes';
import favoriteRoutes from './routes/favoriteRoutes';
import adminRoutes from './routes/adminRoutes';

const app: Express = express();

// ---- 1) middleware ทั่วไป ----
// cors เปิดกว้างไว้ก่อนตอนพัฒนา เพราะมือถือกับเว็บอยู่คนละที่กับ Backend
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ---- 2) ไฟล์รูปที่ผู้ใช้อัปโหลด ----
// เข้าถึงได้ที่ http://<host>:3000/uploads/food/xxx.jpg
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ---- 3) เช็คว่า server ยังมีชีวิตอยู่ไหม (ใช้ทดสอบตอนต่อมือถือ) ----
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'SaveEats API ทำงานปกติ',
    data: { time: new Date().toISOString(), env: env.NODE_ENV },
  });
});

// ---- 3.1) หน้าเว็บตั้งรหัสผ่านใหม่ (เปิดจากลิงก์ในอีเมล) ----
//
// *** เส้นทางนี้ไม่ได้อยู่ใต้ /api โดยตั้งใจ ***
// เพราะคนที่เปิดคือผู้ใช้จริงผ่านเบราว์เซอร์ ไม่ใช่แอปเรียก API
// ตัวหน้าเว็บจะไปเรียก POST /api/auth/reset-password อีกทีตอนกดบันทึก
app.get('/reset-password', (req: Request, res: Response) => {
  const token = typeof req.query['token'] === 'string' ? req.query['token'] : '';
  res.type('html').send(renderResetPasswordPage(token));
});

// ---- 4) routes ทั้งหมด ----
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', reservationRoutes);   // มีทั้ง /api/reservations และ /api/store/reservations
app.use('/api', reviewRoutes);
app.use('/api', reportRoutes);        // ผู้ใช้แจ้งปัญหา (ฝั่ง Admin อยู่ใน adminRoutes)
app.use('/api/favorites', favoriteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// ---- 5) ตัวจัดการ error (ต้องอยู่ท้ายสุด) ----
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
