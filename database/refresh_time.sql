-- =====================================================================
--  SaveEats - refresh_time.sql
--  เลื่อนเวลาของข้อมูลทดลองให้ทันสมัย
--
--  *** ใช้เมื่อไหร่ ***
--  ข้อมูลใน seed.sql ตั้งเวลารับอาหารไว้ที่ 17:00-20:00 ของวันที่ Import
--  ถ้าคุณทดสอบตอนกลางคืน หรือ Import ไว้เมื่อวาน
--  โพสต์จะหายจาก Feed ทั้งหมด เพราะระบบกรองเฉพาะโพสต์ที่ยังไม่เลยเวลารับ
--  (ดูเงื่อนไข AND p.pickup_end > NOW() ใน backend/src/models/postModel.ts)
--
--  ไฟล์นี้จะเลื่อนเวลาให้เริ่มตั้งแต่ตอนนี้ ไปอีก 6 ชั่วโมง
--  ทำให้ทดสอบได้ทุกเวลาโดยไม่ต้อง Import seed.sql ใหม่
--
--  *** ไฟล์นี้ไม่ลบข้อมูล แค่เลื่อนเวลาเท่านั้น ***
--
--  วิธีใช้ : เลือกฐานข้อมูล saveeats -> แท็บ Import -> เลือกไฟล์นี้ -> Go
--           (หรือวางในแท็บ SQL แล้วกด Go ก็ได้)
-- =====================================================================

USE saveeats;

-- เลื่อนเวลารับอาหารของโพสต์ที่ยังขายอยู่
UPDATE posts
   SET pickup_start = NOW(),
       pickup_end   = DATE_ADD(NOW(), INTERVAL 6 HOUR)
 WHERE status IN ('active', 'sold_out');

-- เลื่อนเวลาของการจองที่ยังไม่ปิด (จะได้ยังสแกน QR ทดสอบได้)
UPDATE reservations
   SET pickup_start = NOW(),
       pickup_end   = DATE_ADD(NOW(), INTERVAL 6 HOUR),
       expires_at   = DATE_ADD(NOW(), INTERVAL 7 HOUR)
 WHERE status IN ('confirmed', 'waiting');

-- ตรวจผลลัพธ์
SELECT post_id, food_id, quantity_left, pickup_start, pickup_end, status
  FROM posts
 ORDER BY post_id;
