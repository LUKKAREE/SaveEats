-- =====================================================================
--  SaveEats - schema.sql
--  โครงสร้างฐานข้อมูลทั้งหมดของระบบ SaveEats
--  ฐานข้อมูล : MySQL / MariaDB (ใช้ผ่าน XAMPP + phpMyAdmin)
--  วันที่     : 10 สิงหาคม 2026
--
--  วิธีใช้ : เปิด phpMyAdmin -> แท็บ Import -> เลือกไฟล์นี้ -> Go
--           (ไฟล์นี้สร้าง Database ให้เอง ไม่ต้องสร้างเองก่อน)
--
--  หมายเหตุการตัดสินใจ (ตามที่ทีมสรุปแล้ว)
--   - ข้อค้าง 1 : เลือก "ทางเลือก A" คือมีคลังอาหาร (foods) แยกจากโพสต์ (posts)
--                 ร้านสร้างเมนูอาหารเก็บไว้ก่อน แล้วค่อยเลือกเมนูมาสร้างโพสต์ขาย
--                 1 post = 1 food  (โพสต์อ้างถึงเมนูในคลัง)
--   - ข้อค้าง 7 : หมวดหมู่อาหาร 5 หมวด เก็บเป็นตาราง categories (เพิ่มทีหลังได้)
--   - ข้อค้าง 5 : Seller สมัครเองในแอป สถานะเริ่มต้น pending รอ Admin อนุมัติ
-- =====================================================================

DROP DATABASE IF EXISTS saveeats;
CREATE DATABASE saveeats
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE saveeats;

-- =====================================================================
--  ตารางที่ 1 : users
--  เก็บผู้ใช้ทุกประเภทไว้ตารางเดียว แยกด้วยคอลัมน์ role
-- =====================================================================
CREATE TABLE users (
  user_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)  NOT NULL,
  -- ตรวจรูปแบบอีเมลที่ backend/src/validators/authValidator.ts
  -- โดยใช้กฎกลางจาก shared/src/validation.ts (แอปกับ Backend ใช้ชุดเดียวกัน)
  email         VARCHAR(150)  NOT NULL,
  phone         VARCHAR(20)   DEFAULT NULL,
  -- เก็บเป็น hash จาก bcrypt เท่านั้น ห้ามเก็บรหัสจริงเด็ดขาด
  -- *** ฐานข้อมูลตรวจความแข็งแรงของรหัสผ่านไม่ได้ ***
  -- เพราะ hash ของรหัสอ่อนกับรหัสแข็งแรงยาวเท่ากันหมด (60 ตัว)
  -- การตรวจจึงทำก่อนเข้ารหัส ที่ backend/src/validators/authValidator.ts
  -- โดยใช้กฎกลางจาก shared/src/validation.ts (8 ตัว + ใหญ่ เล็ก เลข อักขระพิเศษ)
  password      VARCHAR(255)  NOT NULL,
  role          ENUM('customer','seller','admin') NOT NULL DEFAULT 'customer',
  avatar        VARCHAR(255)  DEFAULT NULL,           -- ชื่อไฟล์ใน backend/uploads/profile/
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,     -- 0 = ถูกระงับการใช้งาน
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email),
  -- เบอร์โทรใช้เข้าสู่ระบบได้ จึงห้ามซ้ำ (เว้นว่างได้ NULL ไม่นับว่าซ้ำ)
  UNIQUE KEY uq_users_phone (phone),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 1.1 : password_resets
--  คำขอตั้งรหัสผ่านใหม่จากหน้า "ลืมรหัสผ่าน"
--
--  *** ไม่เก็บ token/รหัสตัวจริง เก็บเป็น hash เท่านั้น ***
--  หลักการเดียวกับรหัสผ่าน ถ้าฐานข้อมูลหลุด คนที่ได้ไปก็ใช้ต่อไม่ได้
--
--  รีเซ็ตได้ 2 ทาง ชี้ไปที่คำขอใบเดียวกัน ใช้ทางไหนไปแล้วอีกทางใช้ไม่ได้
--    1. token  - ลิงก์ยาวที่ส่งไปในอีเมล เปิดในเบราว์เซอร์
--    2. code   - รหัส 6 หลัก กรอกในแอปได้เลย ไม่ต้องออกจากแอป
-- =====================================================================
CREATE TABLE password_resets (
  reset_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  token_hash  CHAR(64)     NOT NULL,                  -- SHA-256 ของ token ที่ส่งไปในอีเมล
  code_hash   CHAR(64)     DEFAULT NULL,              -- SHA-256 ของรหัส 6 หลักที่กรอกในแอป
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,    -- กรอกรหัสผิดไปกี่ครั้ง (เกิน 5 = ต้องขอใหม่)
  expires_at  DATETIME     NOT NULL,                  -- ปกติ 1 ชั่วโมงหลังขอ
  used_at     DATETIME     DEFAULT NULL,              -- NULL = ยังไม่ถูกใช้
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (reset_id),
  UNIQUE KEY uq_password_resets_token (token_hash),
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_user_code (user_id, code_hash),
  CONSTRAINT fk_password_resets_user
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 2 : categories  (หมวดหมู่อาหาร - ข้อค้าง 7)
--  5 หมวดแบบกระชับ Admin เพิ่มได้ทีหลังโดยไม่ต้องแก้โครงสร้าง
-- =====================================================================
CREATE TABLE categories (
  category_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name          VARCHAR(50)  NOT NULL,
  slug          VARCHAR(50)  NOT NULL,                -- ใช้ในโค้ด/URL เช่น 'bakery'
  icon          VARCHAR(50)  DEFAULT NULL,            -- ชื่อ icon ที่ฝั่งแอปใช้
  sort_order    INT          NOT NULL DEFAULT 0,
  is_active     TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 3 : stores  (ร้านค้า)
--  1 user ที่ role = seller มีได้ 1 ร้าน (UNIQUE user_id)
--  status : pending = รออนุมัติ / approved = ขายได้ / rejected = ไม่ผ่าน
--           suspended = ถูกระงับ (เช่น behavior score ต่ำเกินไป)
-- =====================================================================
CREATE TABLE stores (
  store_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id       INT UNSIGNED NOT NULL,
  store_name    VARCHAR(150)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  image         VARCHAR(255)  DEFAULT NULL,           -- ชื่อไฟล์ใน backend/uploads/store/
  phone         VARCHAR(20)   DEFAULT NULL,
  address       VARCHAR(255)  DEFAULT NULL,
  latitude      DECIMAL(10,7) DEFAULT NULL,           -- ใช้คำนวณร้านใกล้เคียง
  longitude     DECIMAL(10,7) DEFAULT NULL,
  open_time     TIME          DEFAULT NULL,
  close_time    TIME          DEFAULT NULL,
  status        ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  reject_reason VARCHAR(255)  DEFAULT NULL,           -- Admin กรอกตอนกดไม่อนุมัติ
  rating        DECIMAL(3,2)  NOT NULL DEFAULT 0.00,  -- ค่าเฉลี่ยดาว คำนวณจาก reviews
  review_count  INT UNSIGNED  NOT NULL DEFAULT 0,
  approved_at   DATETIME      DEFAULT NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  UNIQUE KEY uq_stores_user (user_id),
  KEY idx_stores_status (status),
  KEY idx_stores_latlng (latitude, longitude),
  CONSTRAINT fk_stores_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 3.1 : favorites  (ร้านโปรดของลูกค้า)
--  1 แถว = ลูกค้า 1 คน ชอบร้าน 1 ร้าน
--  UNIQUE (user_id, store_id) กันไม่ให้กดหัวใจซ้ำแล้วเกิดแถวซ้ำ
-- =====================================================================
CREATE TABLE favorites (
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

-- =====================================================================
--  ตารางที่ 4 : foods  (คลังเมนูอาหารของร้าน - ทางเลือก A)
--  ตารางนี้คือ "เมนูตั้งต้น" ยังไม่ใช่ของที่ประกาศขาย
--  ราคาและจำนวนที่ขายจริงในแต่ละรอบจะไปอยู่ในตาราง posts
-- =====================================================================
CREATE TABLE foods (
  food_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id      INT UNSIGNED NOT NULL,
  category_id   INT UNSIGNED DEFAULT NULL,
  name          VARCHAR(150)  NOT NULL,
  description   TEXT          DEFAULT NULL,
  image         VARCHAR(255)  DEFAULT NULL,           -- ชื่อไฟล์ใน backend/uploads/food/
  normal_price  DECIMAL(10,2) NOT NULL,               -- ราคาปกติ ใช้โชว์ราคาขีดฆ่า
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,     -- 0 = เลิกขายเมนูนี้แล้ว
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (food_id),
  KEY idx_foods_store (store_id),
  KEY idx_foods_category (category_id),
  CONSTRAINT fk_foods_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_foods_category FOREIGN KEY (category_id)
    REFERENCES categories (category_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 5 : posts  (โพสต์ประกาศขายลง Feed)
--  1 post = 1 food  ร้านเลือกเมนูจากคลังมาโพสต์
--  ราคาลด / จำนวน / ช่วงเวลารับ อยู่ตรงนี้ เพราะเปลี่ยนทุกรอบที่โพสต์
--  quantity_total = จำนวนที่ประกาศขาย
--  quantity_left  = จำนวนคงเหลือ Backend ตัดตอนมีคนจอง
-- =====================================================================
CREATE TABLE posts (
  post_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id        INT UNSIGNED NOT NULL,
  food_id         INT UNSIGNED NOT NULL,
  caption         VARCHAR(500)  DEFAULT NULL,
  image           VARCHAR(255)  DEFAULT NULL,         -- ถ้าไม่ใส่ ให้ใช้รูปจาก foods.image
  discount_price  DECIMAL(10,2) NOT NULL,             -- ราคาที่ขายจริงในโพสต์นี้
  quantity_total  INT UNSIGNED  NOT NULL,
  quantity_left   INT UNSIGNED  NOT NULL,
  pickup_start    DATETIME      NOT NULL,             -- เริ่มรับได้เมื่อไหร่
  pickup_end      DATETIME      NOT NULL,             -- รับได้ถึงเมื่อไหร่
  -- จองแล้วต้องมารับภายในกี่นาที ร้านกำหนดเองตอนโพสต์
  -- ของทอดอาจตั้ง 30 นาที ส่วนขนมปังตั้ง 120 นาทีก็ยังขายได้
  hold_minutes    INT UNSIGNED  NOT NULL DEFAULT 30,
  status          ENUM('active','sold_out','expired','hidden') NOT NULL DEFAULT 'active',
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id),
  KEY idx_posts_store (store_id),
  KEY idx_posts_food (food_id),
  KEY idx_posts_status_pickup (status, pickup_end),
  CONSTRAINT fk_posts_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_posts_food FOREIGN KEY (food_id)
    REFERENCES foods (food_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 6 : reservations  (การจอง - หัวใจของระบบ)
--  qr_token         : ข้อความสุ่มยาว ใช้ฝังใน QR Code (ห้ามใช้ reservation_id ตรง ๆ)
--  reservation_code : รหัส 4 หลัก สำรองไว้ให้ร้านกรอกเมื่อสแกนไม่ได้
--  expires_at       : ค่าเริ่มต้นตั้งเป็น pickup_end + 30 นาที (แก้ได้ที่ .env)
-- =====================================================================
CREATE TABLE reservations (
  reservation_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id       INT UNSIGNED NOT NULL,
  store_id          INT UNSIGNED NOT NULL,
  post_id           INT UNSIGNED NOT NULL,
  food_id           INT UNSIGNED NOT NULL,            -- เก็บซ้ำไว้เพื่อความสะดวกตอน query
  quantity          INT UNSIGNED NOT NULL DEFAULT 1,
  unit_price        DECIMAL(10,2) NOT NULL,           -- ล็อกราคา ณ ตอนจอง
  total_price       DECIMAL(10,2) NOT NULL,
  qr_token          VARCHAR(64)   NOT NULL,
  reservation_code  CHAR(4)       NOT NULL,
  status            ENUM('confirmed','waiting','completed','expired','cancelled')
                    NOT NULL DEFAULT 'confirmed',
  pickup_start      DATETIME      NOT NULL,
  pickup_end        DATETIME      NOT NULL,
  expires_at        DATETIME      NOT NULL,
  -- เวลาที่ส่งข้อความ "ใกล้หมดเวลารับอาหาร" ให้ลูกค้าไปแล้ว (RQ-045)
  -- NULL = ยังไม่เคยเตือน มีไว้กันงานเบื้องหลังเตือนซ้ำทุก 5 นาที
  reminder_sent_at  DATETIME      DEFAULT NULL,
  completed_at      DATETIME      DEFAULT NULL,       -- เวลาที่ร้านกดยืนยันรับอาหาร
  cancelled_at      DATETIME      DEFAULT NULL,
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reservation_id),
  UNIQUE KEY uq_reservations_qr (qr_token),
  KEY idx_reservations_customer (customer_id),
  KEY idx_reservations_store_status (store_id, status),
  KEY idx_reservations_post (post_id),
  KEY idx_reservations_code (store_id, reservation_code),
  CONSTRAINT fk_res_customer FOREIGN KEY (customer_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_res_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_res_post FOREIGN KEY (post_id)
    REFERENCES posts (post_id) ON DELETE CASCADE,
  CONSTRAINT fk_res_food FOREIGN KEY (food_id)
    REFERENCES foods (food_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 7 : reviews  (รีวิวและให้ดาว)
--  UNIQUE reservation_id = 1 การจอง เขียนรีวิวได้ครั้งเดียว
--  และรีวิวได้เฉพาะการจองที่ status = completed (บังคับที่ Backend)
-- =====================================================================
CREATE TABLE reviews (
  review_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id     INT UNSIGNED NOT NULL,
  store_id        INT UNSIGNED NOT NULL,
  reservation_id  INT UNSIGNED NOT NULL,
  rating          TINYINT UNSIGNED NOT NULL,          -- 1 ถึง 5
  comment         TEXT         DEFAULT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (review_id),
  UNIQUE KEY uq_reviews_reservation (reservation_id),
  KEY idx_reviews_store (store_id),
  KEY idx_reviews_customer (customer_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id)
    REFERENCES users (user_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_reservation FOREIGN KEY (reservation_id)
    REFERENCES reservations (reservation_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 8 : notifications  (การแจ้งเตือน)
--  รอบนี้ทำแบบ "เก็บลง DB แล้วให้แอปดึงไปแสดง" ยังไม่ทำ Push จริง
-- =====================================================================
CREATE TABLE notifications (
  notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id         INT UNSIGNED NOT NULL,
  title           VARCHAR(150) NOT NULL,
  message         VARCHAR(500) NOT NULL,
  type            ENUM('reservation','store','review','report','system') NOT NULL DEFAULT 'system',
  ref_id          INT UNSIGNED DEFAULT NULL,          -- id ของสิ่งที่อ้างถึง เช่น reservation_id
  is_read         TINYINT(1)   NOT NULL DEFAULT 0,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (notification_id),
  KEY idx_notifications_user_read (user_id, is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 9 : behavior_scores  (คะแนนความประพฤติของร้าน)
--  1 ร้าน มี 1 แถว  เริ่มต้น 100 คะแนน
--  กติกาการเพิ่ม/ลด อยู่ที่ backend/src/services/behaviorScoreService.js
-- =====================================================================
CREATE TABLE behavior_scores (
  store_id    INT UNSIGNED NOT NULL,
  score       INT          NOT NULL DEFAULT 100,
  status      ENUM('good','warning','suspended') NOT NULL DEFAULT 'good',
  reason      VARCHAR(255) DEFAULT NULL,              -- เหตุผลของการเปลี่ยนแปลงล่าสุด
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (store_id),
  CONSTRAINT fk_behavior_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 10 : behavior_logs  (ประวัติการเปลี่ยนคะแนน)
--  ไม่ได้อยู่ในแผนเดิม แต่จำเป็นมาก เพราะ Admin ต้องตรวจย้อนหลังได้ว่า
--  คะแนนถูกหักเพราะอะไร ตอนไหน
-- =====================================================================
CREATE TABLE behavior_logs (
  log_id       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  store_id     INT UNSIGNED NOT NULL,
  -- *** ห้ามตั้งชื่อคอลัมน์นี้ว่า change เด็ดขาด ***
  -- เพราะ CHANGE เป็นคำสงวนของ MySQL (ใช้ใน ALTER TABLE ... CHANGE)
  -- ถ้าใช้จะ import ไม่ผ่านและตารางนี้กับตารางที่อยู่ถัดไปจะไม่ถูกสร้าง
  score_change INT          NOT NULL,                  -- เช่น -5 หรือ +2
  score_after  INT          NOT NULL,
  reason       VARCHAR(255) NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_behavior_logs_store (store_id),
  CONSTRAINT fk_behavior_logs_store FOREIGN KEY (store_id)
    REFERENCES stores (store_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  ตารางที่ 11 : reports  (การแจ้งปัญหา)
--  target_type บอกว่ากำลังแจ้งเรื่องอะไร เก็บ id ไว้ที่ target_id
--  ไม่ใส่ Foreign Key เพราะ target_id ชี้ไปได้หลายตาราง (polymorphic)
-- =====================================================================
CREATE TABLE reports (
  report_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  reporter_id   INT UNSIGNED NOT NULL,
  target_type   ENUM('store','post','review','user','reservation') NOT NULL,
  target_id     INT UNSIGNED NOT NULL,
  reason        VARCHAR(500) NOT NULL,
  -- รูปหลักฐานที่ผู้แจ้งแนบมา (ไม่บังคับ) เก็บชื่อไฟล์ตอนอยู่ในเครื่อง / URL เต็มตอนขึ้นคลาวด์
  image_url     VARCHAR(500) DEFAULT NULL,
  status        ENUM('open','reviewing','resolved','rejected') NOT NULL DEFAULT 'open',
  -- บันทึกภายในของผู้ดูแล ห้ามแสดงให้ผู้ใช้ทั่วไปเห็น (อาจมีชื่อคนแจ้งอยู่)
  admin_note    VARCHAR(500) DEFAULT NULL,
  -- ข้อความที่ผู้ดูแลตั้งใจส่งถึงเจ้าของสิ่งที่ถูกแจ้ง ปลอดภัยที่จะแสดง
  resolution_message VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (report_id),
  KEY idx_reports_status (status),
  KEY idx_reports_target (target_type, target_id),
  CONSTRAINT fk_reports_reporter FOREIGN KEY (reporter_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
--  ข้อความโต้ตอบภายในเรื่องที่แจ้ง (migration_05)
--
--  *** ใครอยู่ในห้องสนทนานี้ : ผู้แจ้ง กับ ผู้ดูแล เท่านั้น ***
--  ผู้ถูกแจ้งไม่อยู่ในนี้ เพราะทั้งระบบออกแบบให้ผู้ถูกแจ้งไม่รู้ว่าใครแจ้ง
--  ถ้าดึงเขาเข้ามาคุยด้วย ตัวตนคนแจ้งจะหลุดจากสำนวนหรือรายละเอียดทันที
--
--  *** ทำไมเก็บ sender_role ทั้งที่รู้ได้จาก users.role ***
--  บทบาทของบัญชีเปลี่ยนได้ แต่ประวัติการสนทนาต้องไม่เปลี่ยนตาม
--  ถ้า JOIN เอาตอนอ่าน ข้อความเก่าของผู้ดูแลอาจกลายเป็นของลูกค้า
--  เพียงเพราะบัญชีนั้นถูกลดสิทธิ์ทีหลัง
-- ---------------------------------------------------------------------
CREATE TABLE report_messages (
  message_id  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  report_id   INT UNSIGNED NOT NULL,
  sender_id   INT UNSIGNED NOT NULL,
  sender_role ENUM('reporter','admin') NOT NULL,
  message     VARCHAR(1000) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (message_id),
  KEY idx_report_messages_report (report_id, created_at),
  CONSTRAINT fk_report_messages_report FOREIGN KEY (report_id)
    REFERENCES reports (report_id) ON DELETE CASCADE,
  CONSTRAINT fk_report_messages_sender FOREIGN KEY (sender_id)
    REFERENCES users (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================================
--  จบไฟล์ schema.sql
--  ขั้นถัดไป : Import ไฟล์ seed.sql เพื่อใส่ข้อมูลทดลอง
-- =====================================================================
