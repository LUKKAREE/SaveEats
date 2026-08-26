-- =====================================================================
--  SaveEats - Migration 03 : รหัส OTP 6 หลัก สำหรับหน้า "ลืมรหัสผ่าน"
-- =====================================================================
--  เดิมรีเซ็ตรหัสผ่านได้ทางเดียวคือกดลิงก์ในอีเมล
--  ซึ่งต้องเปิดเบราว์เซอร์ ทำจนจบในแอปไม่ได้
--
--  เพิ่มรหัส 6 หลักเข้าไปอีกทาง ผู้ใช้กรอกในแอปแล้วตั้งรหัสใหม่ได้เลย
--  ลิงก์เดิมยังใช้ได้ตามปกติ ทั้งสองทางชี้ไปที่คำขอใบเดียวกัน
--  ใช้ทางไหนไปแล้ว อีกทางก็ใช้ไม่ได้ทันที
--
--  *** ทำไมต้องมี attempts ***
--  รหัส 6 หลักมีความเป็นไปได้แค่ 1 ล้านแบบ ถ้าปล่อยให้เดาไม่จำกัด
--  เขียนสคริปต์ยิงไม่กี่นาทีก็ทะลุ จึงจำกัดไว้ 5 ครั้งต่อ 1 คำขอ
--  ครบแล้วต้องกดขอรหัสใหม่ ซึ่งจะสุ่มเลขชุดใหม่ทั้งหมด
--
--  *** รันซ้ำได้ปลอดภัย *** ทุกคำสั่งเช็คก่อนว่าทำไปแล้วหรือยัง
--
--  วิธีรัน
--    phpMyAdmin -> คลิกฐาน saveeats -> แท็บ SQL -> วางทั้งไฟล์ -> Go
-- =====================================================================

USE saveeats;

-- ---------------------------------------------------------------------
--  1) code_hash : SHA-256 ของรหัส 6 หลัก
--
--  เก็บเป็น hash เหมือน token ไม่เก็บตัวเลขจริง
--  ถ้าฐานข้อมูลหลุด คนที่ได้ไฟล์ไปก็เอาไปกรอกไม่ได้
--
--  ยอมให้เป็น NULL เพราะแถวเก่าที่สร้างก่อน migration นี้ยังไม่มีรหัส
-- ---------------------------------------------------------------------
SET @has_code := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND COLUMN_NAME = 'code_hash'
);
SET @sql := IF(@has_code = 0,
  'ALTER TABLE password_resets ADD COLUMN code_hash CHAR(64) DEFAULT NULL AFTER token_hash',
  'SELECT ''ข้าม: มีคอลัมน์ code_hash อยู่แล้ว'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  2) attempts : นับจำนวนครั้งที่กรอกรหัสผิด
-- ---------------------------------------------------------------------
SET @has_attempts := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND COLUMN_NAME = 'attempts'
);
SET @sql := IF(@has_attempts = 0,
  'ALTER TABLE password_resets ADD COLUMN attempts TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER code_hash',
  'SELECT ''ข้าม: มีคอลัมน์ attempts อยู่แล้ว'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  3) ดัชนีช่วยค้นหาตอนผู้ใช้กรอกรหัส
--
--  ค้นด้วย user_id คู่กับ code_hash เสมอ ไม่ค้นด้วย code_hash เดี่ยว ๆ
--  เพราะเลข 6 หลักซ้ำกันข้ามผู้ใช้ได้ ถ้าค้นด้วยรหัสอย่างเดียว
--  รหัสของคนหนึ่งอาจไปเปิดบัญชีของอีกคนได้
-- ---------------------------------------------------------------------
SET @has_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'
     AND INDEX_NAME = 'idx_password_resets_user_code'
);
SET @sql := IF(@has_idx = 0,
  'ALTER TABLE password_resets ADD KEY idx_password_resets_user_code (user_id, code_hash)',
  'SELECT ''ข้าม: มีดัชนีนี้อยู่แล้ว'' AS หมายเหตุ');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------
--  ตรวจผลลัพธ์
-- ---------------------------------------------------------------------
SELECT
  'ปรับฐานข้อมูลเรียบร้อย' AS สถานะ,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'
      AND COLUMN_NAME IN ('code_hash', 'attempts')) AS คอลัมน์ที่เพิ่มแล้ว_ต้องได้_2;
