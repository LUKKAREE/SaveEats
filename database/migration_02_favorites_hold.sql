-- =====================================================================
--  SaveEats - Migration 02 : ร้านโปรด + เวลาถือคิวที่ร้านกำหนดเอง
-- =====================================================================
--  เพิ่ม 2 เรื่อง
--    1. ร้านโปรด (favorites) - ลูกค้ากดหัวใจเก็บร้านที่ชอบไว้ดูทีหลัง
--    2. posts.hold_minutes - ร้านกำหนดเองตอนโพสต์ว่า
--       ลูกค้าต้องมารับภายในกี่นาทีหลังกดจอง ไม่งั้นคิวหลุด
--
--  *** เดิมใช้ค่ากลางค่าเดียวทั้งระบบ (RESERVATION_GRACE_MINUTES = 30 นาที) ***
--  ซึ่งไม่ยุติธรรมกับร้าน เพราะของบางอย่างรอได้นาน บางอย่างรอไม่ได้
--  เช่น ขนมปังถือไว้ 2 ชั่วโมงยังขายได้ แต่ของทอดถือไว้ 30 นาทีก็เสียแล้ว
--  ต่อไปร้านเลือกเองได้ตามชนิดอาหาร
--
--  *** รันซ้ำได้ปลอดภัย *** ทุกคำสั่งเช็คก่อนว่าทำไปแล้วหรือยัง
--
--  วิธีรัน
--    phpMyAdmin -> คลิกฐาน saveeats -> แท็บ SQL -> วางทั้งไฟล์ -> Go
-- =====================================================================

USE saveeats;

-- ---------------------------------------------------------------------
--  1) ตารางร้านโปรด
--
--  1 แถว = ลูกค้า 1 คน ชอบร้าน 1 ร้าน
--  ตั้ง UNIQUE (user_id, store_id) ไว้ กดหัวใจซ้ำก็ไม่เกิดแถวซ้ำ
--
--  ON DELETE CASCADE ทั้งสองทาง : ถ้าลบผู้ใช้หรือลบร้าน
--  รายการโปรดที่ค้างอยู่จะหายตามไปเอง ไม่เหลือขยะในฐานข้อมูล
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  store_id    INT UNSIGNED NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (favorite_id),
  UNIQUE KEY uq_favorites_user_store (user_id, store_id),
  KEY idx_favorites_user (user_id),
  CONSTRAINT fk_favorites_user  FOREIGN KEY (user_id)  REFERENCES users (user_id)   ON DELETE CASCADE,
  CONSTRAINT fk_favorites_store FOREIGN KEY (store_id) REFERENCES stores (store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  2) เวลาถือคิวต่อโพสต์
--
--  hold_minutes = จองแล้วต้องมารับภายในกี่นาที
--  ค่าเริ่มต้น 30 เท่ากับค่ากลางเดิม โพสต์เก่าทั้งหมดจึงทำงานเหมือนเดิมทุกประการ
-- ---------------------------------------------------------------------
SET @has_hold := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'hold_minutes'
);
SET @sql := IF(@has_hold = 0,
  'ALTER TABLE posts ADD COLUMN hold_minutes INT UNSIGNED NOT NULL DEFAULT 30 AFTER pickup_end',
  'SELECT ''ข้าม: มีคอลัมน์ hold_minutes อยู่แล้ว'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  ตรวจผลลัพธ์
-- ---------------------------------------------------------------------
SELECT
  'ปรับฐานข้อมูลเรียบร้อย' AS สถานะ,
  (SELECT COUNT(*) FROM favorites) AS จำนวนร้านโปรด,
  (SELECT COUNT(*) FROM posts)     AS จำนวนโพสต์ที่ยังอยู่ครบ;
