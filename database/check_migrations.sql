-- =====================================================================
--  SaveEats - ตรวจว่ารัน migration ครบหรือยัง
-- =====================================================================
--  ไฟล์นี้ไม่แก้อะไรเลย แค่ดูอย่างเดียว รันกี่รอบก็ได้
--
--  วิธีรัน
--    phpMyAdmin -> คลิกฐาน saveeats -> แท็บ SQL -> วางทั้งไฟล์ -> Go
--
--  อ่านผล : ทุกแถวต้องขึ้น "✅ รันแล้ว"
--           ถ้าเจอ "❌ ยังไม่ได้รัน" ให้ไปรันไฟล์ที่ระบุในคอลัมน์สุดท้าย
-- =====================================================================

USE saveeats;

SELECT '01' AS ลำดับ, 'เบอร์โทรห้ามซ้ำ (ใช้ login ด้วยเบอร์ได้)' AS เรื่อง,
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน') AS สถานะ,
       'migration_01_auth.sql' AS ไฟล์
  FROM information_schema.STATISTICS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_phone'

UNION ALL
SELECT '01', 'ตารางเก็บคำขอตั้งรหัสผ่านใหม่',
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน'),
       'migration_01_auth.sql'
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets'

UNION ALL
SELECT '02', 'ตารางร้านโปรด',
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน'),
       'migration_02_favorites_hold.sql'
  FROM information_schema.TABLES
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'favorites'

UNION ALL
SELECT '02', 'เวลาถือคิวที่ร้านกำหนดเอง (hold_minutes)',
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน'),
       'migration_02_favorites_hold.sql'
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'hold_minutes'

UNION ALL
SELECT '03', 'รหัส OTP 6 หลัก (code_hash)',
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน'),
       'migration_03_reset_code.sql'
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND COLUMN_NAME = 'code_hash'

UNION ALL
SELECT '03', 'ตัวนับจำนวนครั้งที่กรอกรหัสผิด (attempts)',
       IF(COUNT(*) > 0, '✅ รันแล้ว', '❌ ยังไม่ได้รัน'),
       'migration_03_reset_code.sql'
  FROM information_schema.COLUMNS
 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_resets' AND COLUMN_NAME = 'attempts'


ORDER BY ลำดับ, เรื่อง;
