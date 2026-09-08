-- =====================================================================
--  SaveEats - ล้างข้อมูลทั้งหมด เริ่มนับ id ใหม่จาก 1
-- =====================================================================
--  สำหรับตอนอยากทดลองใช้เองตั้งแต่ต้น : สมัครสมาชิก -> เปิดร้าน -> ลงขาย
--  โดยไม่มีข้อมูลตัวอย่างมาปนให้สับสน
--
--  *** อ่านก่อนรัน : ไฟล์นี้ลบข้อมูลจริง และกู้คืนไม่ได้ ***
--  ถ้าอยากเก็บของเดิมไว้ ให้ Export ก่อน
--    phpMyAdmin -> คลิกฐาน saveeats -> แท็บ Export -> Custom
--    -> ติ๊ก Add DROP TABLE -> Go
--
--  ---------------------------------------------------------------
--  สิ่งที่ "ลบ" ทั้งหมด
--    ผู้ใช้ทุกคน (ยกเว้น admin) / ร้านค้า / เมนู / โพสต์
--    การจอง / รีวิว / ร้านโปรด / การแจ้งเตือน / รายงาน
--    คะแนนความประพฤติ / คำขอตั้งรหัสผ่านใหม่
--
--  สิ่งที่ "เก็บไว้" และเหตุผล
--    1. บัญชี admin  - ถ้าลบไปจะเข้าเว็บแอดมินไม่ได้เลย
--                      แล้วจะไม่มีใครอนุมัติร้านที่คุณสมัครใหม่
--    2. หมวดหมู่อาหาร - แอปใช้ตอนสร้างเมนูและตอนกรองหน้าแรก
--  ---------------------------------------------------------------
--
--  *** รันซ้ำได้ปลอดภัย *** รันกี่รอบก็ได้ผลเหมือนกัน
--
--  วิธีรัน
--    phpMyAdmin -> คลิกฐาน saveeats -> แท็บ Import -> เลือกไฟล์นี้ -> Go
-- =====================================================================

USE saveeats;

-- =====================================================================
--  ทำไมใช้ DELETE ไม่ใช่ TRUNCATE
-- =====================================================================
--  ตอนแรกไฟล์นี้ใช้ TRUNCATE คู่กับ SET FOREIGN_KEY_CHECKS = 0
--  แต่รันผ่าน phpMyAdmin แล้วพังด้วย error
--
--    #1701 Cannot truncate a table referenced in a foreign key constraint
--
--  สาเหตุ : MySQL ปฏิเสธ TRUNCATE ทุกครั้งที่มีตารางอื่นอ้างถึงตารางนั้น
--  "ต่อให้ตารางลูกจะว่างเปล่าแล้วก็ตาม" เพราะมันดูแค่ว่ามี FK อยู่หรือไม่
--  ส่วน SET FOREIGN_KEY_CHECKS = 0 ที่ควรจะปลดล็อกให้ กลับไม่มีผล
--  เพราะ phpMyAdmin รันไฟล์ import แบบที่ค่านี้ไม่ติดไปด้วย
--
--  DELETE ไม่มีข้อจำกัดนี้ ขอแค่ลบ "ตารางลูก" ก่อน "ตารางพ่อแม่"
--  ซึ่งเป็นสิ่งที่ควรทำอยู่แล้วและตรงไปตรงมากว่าการไปปิดระบบตรวจสอบทิ้ง
--
--  ข้อเสียเดียวของ DELETE คือไม่รีเซ็ตตัวนับ AUTO_INCREMENT ให้
--  จึงต้องสั่ง ALTER TABLE ... AUTO_INCREMENT = 1 เองตอนท้าย
-- =====================================================================

-- ---------------------------------------------------------------------
--  ลบข้อมูล เรียงตามความสัมพันธ์ : ลูกก่อน พ่อแม่ทีหลัง
--
--  ลำดับนี้คำนวณจาก Foreign Key จริงใน schema.sql
--  ห้ามสลับลำดับ ไม่งั้นจะติด error ว่ายังมีตารางอื่นอ้างถึงอยู่
--
--    behavior_logs, behavior_scores -> อ้าง stores
--    favorites                      -> อ้าง stores, users
--    notifications, password_resets, reports -> อ้าง users
--    reviews                        -> อ้าง reservations, stores, users
--    reservations                   -> อ้าง posts, foods, stores, users
--    posts                          -> อ้าง foods, stores
--    foods                          -> อ้าง stores, categories
--    stores                         -> อ้าง users
-- ---------------------------------------------------------------------
DELETE FROM behavior_logs;
DELETE FROM behavior_scores;
DELETE FROM favorites;
DELETE FROM notifications;
DELETE FROM password_resets;
-- ล้างห้องสนทนาก่อนตัวเรื่อง (report_messages อ้างถึง reports)
DELETE FROM report_messages;
DELETE FROM reports;
DELETE FROM reviews;
DELETE FROM reservations;
DELETE FROM posts;
DELETE FROM foods;
DELETE FROM stores;

-- ผู้ใช้ : ลบทุกคนยกเว้น admin
-- ใช้ role แทนการระบุ user_id เพราะถ้าเคยรีเซ็ตมาก่อน id ของ admin อาจไม่ใช่ 1
DELETE FROM users WHERE role <> 'admin';

-- ---------------------------------------------------------------------
--  ใส่บัญชี admin กลับ (เผื่อกรณีเคยเผลอลบไป)
--
--  รหัสผ่าน : Test@1234   (เป็นค่า hash จาก bcrypt ไม่ได้เก็บรหัสจริง)
--
--  *** รหัสนี้ผ่านกฎความแข็งแรงของระบบครบทุกข้อ ***
--  ยาว 9 ตัว / มีตัวใหญ่ / ตัวเล็ก / ตัวเลข / อักขระพิเศษ
--  และไม่ติดลิสต์รหัสยอดฮิต (ตรวจด้วย checkPassword จาก shared/src/validation.ts จริง)
--
--  เดิมใช้ 123456 ซึ่งสมัครใหม่ผ่านแอปไม่ได้เลย เพราะติดกฎตั้งแต่ข้อแรก
--  ทำให้ข้อมูลทดลองไม่สอดคล้องกับกฎของระบบตัวเอง จึงเปลี่ยนให้ตรงกัน
--
--  ON DUPLICATE KEY UPDATE ทำให้รันซ้ำได้ ถ้ามี admin อยู่แล้วก็แค่ไม่ทำอะไร
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, name, email, phone, password, role) VALUES
  (1, 'ผู้ดูแลระบบ', 'admin@saveeats.com', '0800000000',
   '$2b$10$d6GkAKIgW2XTO.KI8Qp4xuolNc9fyCKLxYO9gJcR6z9MgYWUI4XJC', 'admin')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ---------------------------------------------------------------------
--  หมวดหมู่อาหาร - ใส่กลับให้ครบ เผื่อเคยถูกลบไป
-- ---------------------------------------------------------------------
INSERT INTO categories (category_id, name, slug, icon, sort_order) VALUES
  (1, 'อาหารคาว',   'savory',  'rice',   1),
  (2, 'เบเกอรี่',    'bakery',  'bread',  2),
  (3, 'ของหวาน',    'dessert', 'cake',   3),
  (4, 'เครื่องดื่ม',  'drink',   'cup',    4),
  (5, 'อื่น ๆ',      'other',   'basket', 5)
ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug);

-- ---------------------------------------------------------------------
--  รีเซ็ตตัวนับ AUTO_INCREMENT ให้เริ่มนับใหม่
--
--  users เริ่มที่ 2 เพราะ admin ยึดเลข 1 ไปแล้ว
--  คนแรกที่คุณสมัครในแอปจะได้ user_id = 2
-- ---------------------------------------------------------------------
ALTER TABLE users            AUTO_INCREMENT = 2;
ALTER TABLE stores           AUTO_INCREMENT = 1;
ALTER TABLE foods            AUTO_INCREMENT = 1;
ALTER TABLE posts            AUTO_INCREMENT = 1;
ALTER TABLE reservations     AUTO_INCREMENT = 1;
ALTER TABLE reviews          AUTO_INCREMENT = 1;
ALTER TABLE favorites        AUTO_INCREMENT = 1;
ALTER TABLE notifications    AUTO_INCREMENT = 1;
ALTER TABLE reports          AUTO_INCREMENT = 1;
ALTER TABLE report_messages  AUTO_INCREMENT = 1;
ALTER TABLE password_resets  AUTO_INCREMENT = 1;
ALTER TABLE behavior_logs    AUTO_INCREMENT = 1;

-- ---------------------------------------------------------------------
--  ตรวจผลลัพธ์ - ทุกช่องต้องตรงกับที่ระบุในชื่อคอลัมน์
-- ---------------------------------------------------------------------
SELECT
  'ล้างข้อมูลเรียบร้อย'                AS สถานะ,
  (SELECT COUNT(*) FROM users)         AS ผู้ใช้_ต้องได้_1,
  (SELECT COUNT(*) FROM categories)    AS หมวดหมู่_ต้องได้_5,
  (SELECT COUNT(*) FROM stores)        AS ร้านค้า_ต้องได้_0,
  (SELECT COUNT(*) FROM foods)         AS เมนู_ต้องได้_0,
  (SELECT COUNT(*) FROM posts)         AS โพสต์_ต้องได้_0,
  (SELECT COUNT(*) FROM reservations)  AS การจอง_ต้องได้_0,
  (SELECT COUNT(*) FROM reviews)       AS รีวิว_ต้องได้_0,
  (SELECT COUNT(*) FROM favorites)     AS ร้านโปรด_ต้องได้_0;

-- =====================================================================
--  ทำต่อจากนี้
--
--  1. ในแอป : ออกจากระบบก่อน แล้วสมัครสมาชิกเป็น "ร้านค้า"
--             -> จะได้ user_id = 2, store_id = 1
--             (รหัสผ่านต้องตามเกณฑ์ใหม่ เช่น  Tuk#Rain42 )
--  2. เว็บแอดมิน : login admin@saveeats.com / Test@1234
--                  ไปหน้า "ร้านรออนุมัติ" กดอนุมัติร้านที่เพิ่งสมัคร
--  3. กลับมาในแอป : เพิ่มเมนู -> สร้างโพสต์ขาย
--  4. สมัครอีกบัญชีเป็น "ลูกค้า" -> จะได้ user_id = 3
--     แล้วลองจองอาหารจากร้านของตัวเอง
--
--  *** รูปที่เคยอัปโหลดไว้ยังค้างอยู่ที่ backend/uploads/ ***
--  ฐานข้อมูลไม่ได้อ้างถึงแล้ว จะลบทิ้งหรือปล่อยไว้ก็ได้ ไม่กระทบอะไร
-- =====================================================================
