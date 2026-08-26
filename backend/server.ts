/**
 * SaveEats Backend - จุดเริ่มต้นของ Server
 *
 * ลำดับการทำงาน
 *   1. โหลดค่าจากไฟล์ .env
 *   2. ทดสอบเชื่อมต่อฐานข้อมูล
 *   3. เปิด HTTP Server รอรับ Request
 *
 * รันด้วย tsx จึงไม่ต้อง build เป็น JavaScript ก่อน
 *   npm run dev   -> tsx watch server.ts  (แก้โค้ดแล้วรีสตาร์ทเอง)
 *   npm start     -> tsx server.ts
 */
import 'dotenv/config';

import app from './src/app';
import env from './src/config/env';
import { testConnection } from './src/config/db';
import { startExpireReservationsJob } from './src/jobs/expireReservationsJob';

async function start(): Promise<void> {
  console.log('');
  console.log('==============================================');
  console.log('   SaveEats Backend API  (TypeScript)');
  console.log('==============================================');

  // 1) ตรวจว่าเชื่อมฐานข้อมูลได้จริงก่อนเปิด server
  const connected = await testConnection();
  if (!connected) {
    console.error('');
    console.error('!! เชื่อมต่อฐานข้อมูลไม่สำเร็จ - Server จะไม่เปิด');
    console.error('   ตรวจสอบว่า:');
    console.error('   1. เปิด XAMPP แล้วกด Start ที่ MySQL หรือยัง');
    console.error('   2. Import database/schema.sql เข้า phpMyAdmin แล้วหรือยัง');
    console.error('   3. ค่าใน .env (DB_USER / DB_PASSWORD / DB_NAME) ถูกต้องไหม');
    console.error('');
    process.exit(1);
  }

  // 2) เริ่มงานเบื้องหลัง : ปิดการจองที่หมดอายุทุก 5 นาที
  //    ต้องเริ่มหลังเชื่อมฐานข้อมูลได้แล้วเท่านั้น
  startExpireReservationsJob();

  // 3) เปิด server  (0.0.0.0 = ยอมให้มือถือในวง Wi-Fi เดียวกันเรียกเข้ามาได้)
  app.listen(env.PORT, '0.0.0.0', () => {
    console.log(`   สถานะ  : ทำงานอยู่`);
    console.log(`   Port    : ${env.PORT}`);
    console.log(`   บนคอม   : http://localhost:${env.PORT}`);
    console.log(`   บนมือถือ: http://<IP ของคอม>:${env.PORT}`);
    console.log(`             (หา IP ด้วยคำสั่ง ipconfig แล้วดูที่ IPv4 Address)`);
    console.log('==============================================');
    console.log('');
  });
}

void start();
