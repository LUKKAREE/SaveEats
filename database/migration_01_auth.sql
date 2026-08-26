-- =====================================================================
--  SaveEats - Migration 01 : ระบบสมาชิกรอบใหม่
-- =====================================================================
--  รองรับ 2 เรื่องที่เพิ่มเข้ามา
--    1. เข้าสู่ระบบด้วย "อีเมลหรือเบอร์โทรศัพท์" (ช่องเดียวกรอกได้ทั้งสองแบบ)
--    2. ลืมรหัสผ่าน แล้วส่งลิงก์ตั้งรหัสใหม่ทางอีเมล
--
--  *** ไฟล์นี้ใช้กับฐานข้อมูลที่ import schema.sql ไปแล้ว ***
--  ข้อมูลเดิมทั้งหมดยังอยู่ครบ ไม่ได้ลบผู้ใช้หรือข้อมูลใด ๆ
--
--  *** รันซ้ำได้ปลอดภัย ***
--  ทุกคำสั่งเช็คก่อนว่าทำไปแล้วหรือยัง ถ้าทำแล้วจะข้ามไปเฉย ๆ ไม่ error
--  (ถ้าเคยรันไฟล์รุ่นก่อนหน้าที่มีคอลัมน์ provider ไฟล์นี้จะเก็บกวาดให้ด้วย)
--
--  วิธีรัน
--    1. เปิด http://localhost/phpmyadmin
--    2. คลิกฐานข้อมูล  saveeats  ทางแถบซ้าย
--    3. คลิกแท็บ  SQL
--    4. เปิดไฟล์นี้ คัดลอกทั้งหมดมาวาง แล้วกด  Go
-- =====================================================================

USE saveeats;

-- ---------------------------------------------------------------------
--  1) เบอร์โทรต้องไม่ซ้ำกัน
--
--  เพราะตอนนี้เบอร์โทรใช้เข้าสู่ระบบได้ ถ้าปล่อยให้ซ้ำ ระบบจะไม่รู้ว่า
--  ควรให้ใครเข้า  ส่วนคนที่ไม่กรอกเบอร์ยังเว้นว่างได้ตามเดิม
--  (MySQL ไม่ถือว่า NULL ซ้ำกับ NULL จึงมีหลายแถวที่เบอร์ว่างได้)
--
--  รูปแบบ SET @... / PREPARE / EXECUTE คือวิธีเขียน "ถ้ายังไม่มีค่อยทำ"
--  ที่ใช้ได้ทั้ง MySQL และ MariaDB จึงรันซ้ำกี่ครั้งก็ไม่พัง
-- ---------------------------------------------------------------------
SET @has_phone_key := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_phone'
);
SET @sql := IF(@has_phone_key = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_users_phone (phone)',
  'SELECT ''ข้าม: เบอร์โทรตั้ง UNIQUE ไว้แล้ว'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  2) เก็บกวาดคอลัมน์ที่ไม่ได้ใช้แล้ว
--
--  เคยเตรียมไว้สำหรับล็อกอินด้วย Google/Facebook แต่ตัดออกไปแล้ว
--  เพราะ Google เลิกรองรับการล็อกอินผ่าน Expo Go
--  ถ้าไม่เคยมีคอลัมน์พวกนี้ ส่วนนี้จะข้ามไปเองไม่ต้องทำอะไร
-- ---------------------------------------------------------------------
SET @has_provider_key := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_provider'
);
SET @sql := IF(@has_provider_key > 0,
  'ALTER TABLE users DROP INDEX uq_users_provider',
  'SELECT ''ข้าม: ไม่มี index uq_users_provider'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_provider := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'provider'
);
SET @sql := IF(@has_provider > 0,
  'ALTER TABLE users DROP COLUMN provider',
  'SELECT ''ข้าม: ไม่มีคอลัมน์ provider'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_provider_id := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'provider_id'
);
SET @sql := IF(@has_provider_id > 0,
  'ALTER TABLE users DROP COLUMN provider_id',
  'SELECT ''ข้าม: ไม่มีคอลัมน์ provider_id'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- รหัสผ่านต้องมีเสมอ (ทุกบัญชีสมัครด้วยอีเมล+รหัสผ่านอย่างเดียวแล้ว)
ALTER TABLE users
  MODIFY password VARCHAR(255) NOT NULL COMMENT 'เก็บเป็น hash จาก bcrypt เท่านั้น';

-- ---------------------------------------------------------------------
--  3) ตารางเก็บคำขอตั้งรหัสผ่านใหม่
--
--  *** ไม่เก็บ token ตัวจริงลงฐานข้อมูล ***
--  เก็บเป็นค่า hash (SHA-256) แทน หลักการเดียวกับรหัสผ่าน
--  ถ้าฐานข้อมูลหลุด คนที่ได้ไฟล์ไปก็เอา token ไปตั้งรหัสใหม่ไม่ได้
--
--  expires_at  ลิงก์หมดอายุใน 1 ชั่วโมง (ตั้งค่าได้ที่ RESET_TOKEN_MINUTES)
--  used_at     กดใช้แล้วจะปั๊มเวลาไว้ ใช้ลิงก์เดิมซ้ำไม่ได้
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  reset_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256 ของ token ที่ส่งไปในอีเมล',
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     DEFAULT NULL COMMENT 'NULL = ยังไม่ถูกใช้',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reset_id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  ตรวจผลลัพธ์
--  ควรเห็นตาราง password_resets เพิ่มขึ้นมาทางแถบซ้าย
--  และจำนวนผู้ใช้ต้องเท่าเดิมทุกคน
-- ---------------------------------------------------------------------
SELECT
  'ปรับฐานข้อมูลเรียบร้อย' AS สถานะ,
  (SELECT COUNT(*) FROM users) AS จำนวนผู้ใช้ที่ยังอยู่ครบ;
