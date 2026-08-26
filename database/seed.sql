-- =====================================================================
--  SaveEats - seed.sql
--  ข้อมูลทดลองสำหรับใช้พัฒนาและทดสอบระบบ
--
--  วิธีใช้ : Import schema.sql ก่อน แล้วค่อย Import ไฟล์นี้
--
--  *** รหัสผ่านของทุกบัญชีในไฟล์นี้คือ  123456  ***
--  (ค่าที่เห็นในคอลัมน์ password คือ bcrypt hash ของ 123456)
--  ห้ามใช้ข้อมูลชุดนี้ตอนขึ้นระบบจริงเด็ดขาด
-- =====================================================================

USE saveeats;

-- ---------------------------------------------------------------------
--  ล้างข้อมูลเดิมก่อน เผื่อมีคน Import ไฟล์นี้ซ้ำหลายรอบ
--
--  *** ทำไมใช้ DELETE FROM ไม่ใช่ TRUNCATE ***
--  TRUNCATE ใช้กับตารางที่มีตารางอื่นอ้างถึงด้วย Foreign Key ไม่ได้
--  ถึงจะสั่ง SET FOREIGN_KEY_CHECKS = 0 ไว้แล้วก็ตาม
--  (MariaDB ที่มากับ XAMPP จะขึ้น error #1701 Cannot truncate a table
--   referenced in a foreign key constraint)
--
--  DELETE FROM ทำงานได้เหมือนกัน และไม่ติดข้อจำกัดนี้
--  ส่วน ALTER TABLE ... AUTO_INCREMENT = 1 คือรีเซ็ตเลข id ให้เริ่มที่ 1 ใหม่
--  (DELETE ไม่รีเซ็ตให้เอง ต่างจาก TRUNCATE)
--
--  ลำดับการลบ : ลบตารางลูกก่อน แล้วค่อยลบตารางแม่
-- ---------------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM behavior_logs;
DELETE FROM behavior_scores;
DELETE FROM reports;
DELETE FROM notifications;
DELETE FROM reviews;
DELETE FROM reservations;
DELETE FROM posts;
DELETE FROM foods;
DELETE FROM stores;
DELETE FROM categories;
DELETE FROM users;

ALTER TABLE behavior_logs AUTO_INCREMENT = 1;
ALTER TABLE reports       AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;
ALTER TABLE reviews       AUTO_INCREMENT = 1;
ALTER TABLE reservations  AUTO_INCREMENT = 1;
ALTER TABLE posts         AUTO_INCREMENT = 1;
ALTER TABLE foods         AUTO_INCREMENT = 1;
ALTER TABLE stores        AUTO_INCREMENT = 1;
ALTER TABLE categories    AUTO_INCREMENT = 1;
ALTER TABLE users         AUTO_INCREMENT = 1;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
--  หมวดหมู่อาหาร 5 หมวด (ข้อค้าง 7)
-- ---------------------------------------------------------------------
INSERT INTO categories (category_id, name, slug, icon, sort_order) VALUES
  (1, 'อาหารคาว',   'savory',   'rice',    1),
  (2, 'เบเกอรี่',    'bakery',   'bread',   2),
  (3, 'ของหวาน',    'dessert',  'cake',    3),
  (4, 'เครื่องดื่ม',  'drink',    'cup',     4),
  (5, 'อื่น ๆ',      'other',    'basket',  5);

-- ---------------------------------------------------------------------
--  ผู้ใช้
--  1     = admin
--  2-4   = customer
--  5-8   = seller (เจ้าของร้าน)
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, name, email, phone, password, role) VALUES
  (1, 'ผู้ดูแลระบบ',     'admin@saveeats.com',    '0800000000', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'admin'),
  (2, 'ปาริชาต ใจดี',   'customer1@test.com',    '0811111111', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'customer'),
  (3, 'ธนกร มั่นคง',     'customer2@test.com',    '0822222222', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'customer'),
  (4, 'สุชาดา แสงทอง',  'customer3@test.com',    '0833333333', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'customer'),
  (5, 'ร้านครัวคุณแม่',  'seller1@test.com',      '0844444444', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'seller'),
  (6, 'ร้านเบเกอรี่หอม', 'seller2@test.com',      '0855555555', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'seller'),
  (7, 'ร้านข้าวมันไก่',  'seller3@test.com',      '0866666666', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'seller'),
  (8, 'ร้านรออนุมัติ',   'seller4@test.com',      '0877777777', '$2b$10$6ZdaXUnw2VPFzUfbYViAG.6glJmJAF.5G.ds6AfaDUPkDFF0mJhay', 'seller');

-- ---------------------------------------------------------------------
--  ร้านค้า
--  ร้าน 1-3 approved แล้ว ขายได้เลย
--  ร้าน 4 ยัง pending ไว้ให้ทดสอบหน้าอนุมัติของ Admin
--  พิกัดใช้บริเวณกรุงเทพฯ เพื่อทดสอบฟีเจอร์ร้านใกล้เคียง
-- ---------------------------------------------------------------------
INSERT INTO stores
  (store_id, user_id, store_name, description, address, latitude, longitude,
   open_time, close_time, status, rating, review_count, approved_at) VALUES
  (1, 5, 'ครัวคุณแม่',      'อาหารตามสั่งทำสดใหม่ทุกวัน เหลือช่วงเย็นลดราคาให้',
      '123 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ', 13.7795000, 100.5410000,
      '08:00:00', '20:00:00', 'approved', 4.50, 2, '2026-08-01 10:00:00'),
  (2, 6, 'เบเกอรี่หอมกรุ่น', 'ขนมปังและเค้กอบสดทุกเช้า ปิดร้านลดราคา 50%',
      '45 ซอยอารีย์ 4 เขตพญาไท กรุงเทพฯ', 13.7800000, 100.5450000,
      '07:00:00', '19:00:00', 'approved', 5.00, 1, '2026-08-01 10:05:00'),
  (3, 7, 'ข้าวมันไก่เจ๊หมวย', 'ข้าวมันไก่สูตรดั้งเดิม 30 ปี',
      '9 ถนนราชวิถี เขตราชเทวี กรุงเทพฯ', 13.7660000, 100.5370000,
      '06:00:00', '15:00:00', 'approved', 0.00, 0, '2026-08-02 09:00:00'),
  (4, 8, 'ร้านทดสอบรออนุมัติ', 'ร้านนี้ไว้ทดสอบหน้าอนุมัติของ Admin',
      '99 ถนนทดสอบ กรุงเทพฯ', 13.7500000, 100.5300000,
      '09:00:00', '18:00:00', 'pending', 0.00, 0, NULL);

-- ---------------------------------------------------------------------
--  คะแนนความประพฤติ (ทุกร้านเริ่มที่ 100)
-- ---------------------------------------------------------------------
INSERT INTO behavior_scores (store_id, score, status, reason) VALUES
  (1, 100, 'good', 'คะแนนเริ่มต้น'),
  (2,  95, 'good', 'ยกเลิกการจอง 1 ครั้ง'),
  (3, 100, 'good', 'คะแนนเริ่มต้น'),
  (4, 100, 'good', 'คะแนนเริ่มต้น');

INSERT INTO behavior_logs (store_id, score_change, score_after, reason) VALUES
  (2, -5, 95, 'ร้านยกเลิกการจองของลูกค้า');

-- ---------------------------------------------------------------------
--  คลังเมนูอาหาร (foods)  <-- ทางเลือก A : เมนูอยู่แยกจากโพสต์
-- ---------------------------------------------------------------------
INSERT INTO foods (food_id, store_id, category_id, name, description, normal_price) VALUES
  (1, 1, 1, 'ข้าวกะเพราหมูสับไข่ดาว', 'เผ็ดกลาง ใส่ไข่ดาวกรอบ',      60.00),
  (2, 1, 1, 'ข้าวผัดกุ้ง',            'กุ้งสด 5 ตัว',                 70.00),
  (3, 1, 4, 'ชาเย็น',                 'ชาไทยสูตรร้าน',                35.00),
  (4, 2, 2, 'ครัวซองต์เนยสด',         'อบสดทุกเช้า',                  55.00),
  (5, 2, 2, 'ขนมปังไส้ทะลัก',         'มี 3 ไส้ให้เลือก',             45.00),
  (6, 2, 3, 'เค้กช็อกโกแลต 1 ชิ้น',   'เข้มข้น หวานน้อย',             65.00),
  (7, 3, 1, 'ข้าวมันไก่ต้ม',          'พร้อมน้ำจิ้มสูตรร้าน',         50.00),
  (8, 3, 1, 'ข้าวมันไก่ทอด',          'ทอดกรอบนอกนุ่มใน',             55.00);

-- ---------------------------------------------------------------------
--  โพสต์ประกาศขาย (posts)
--  วันเวลาใช้ CURDATE() เพื่อให้ข้อมูลไม่หมดอายุทันทีที่ Import
-- ---------------------------------------------------------------------
INSERT INTO posts
  (post_id, store_id, food_id, caption, discount_price,
   quantity_total, quantity_left, pickup_start, pickup_end, status) VALUES
  (1, 1, 1, 'กะเพราเหลือจากมื้อเที่ยง ลดเหลือ 35 บาท มารับได้เลย', 35.00,
      10, 8,  CONCAT(CURDATE(), ' 17:00:00'), CONCAT(CURDATE(), ' 20:00:00'), 'active'),
  (2, 1, 2, 'ข้าวผัดกุ้งเหลือ 5 ชุด ลดครึ่งราคา',                  35.00,
      5,  5,  CONCAT(CURDATE(), ' 17:00:00'), CONCAT(CURDATE(), ' 20:00:00'), 'active'),
  (3, 2, 4, 'ครัวซองต์ปิดร้าน ลด 50%',                             27.00,
      12, 10, CONCAT(CURDATE(), ' 18:00:00'), CONCAT(CURDATE(), ' 19:00:00'), 'active'),
  (4, 2, 6, 'เค้กช็อกโกแลตเหลือ 3 ชิ้นสุดท้าย',                    30.00,
      3,  3,  CONCAT(CURDATE(), ' 18:00:00'), CONCAT(CURDATE(), ' 19:00:00'), 'active'),
  (5, 3, 7, 'ข้าวมันไก่ต้ม ลดเหลือ 25 บาท',                        25.00,
      8,  0,  CONCAT(CURDATE(), ' 13:00:00'), CONCAT(CURDATE(), ' 15:00:00'), 'sold_out');

-- ---------------------------------------------------------------------
--  การจอง (reservations)
--  1 = completed แล้ว ใช้ทดสอบการเขียนรีวิว
--  2 = confirmed อยู่ ใช้ทดสอบการสแกน QR / กรอกรหัส 4 หลัก
--  3 = cancelled
-- ---------------------------------------------------------------------
INSERT INTO reservations
  (reservation_id, customer_id, store_id, post_id, food_id, quantity,
   unit_price, total_price, qr_token, reservation_code, status,
   pickup_start, pickup_end, expires_at, completed_at) VALUES
  (1, 2, 1, 1, 1, 1, 35.00, 35.00,
      'seed-qr-token-0000000000000001', '4821', 'completed',
      CONCAT(CURDATE(), ' 17:00:00'), CONCAT(CURDATE(), ' 20:00:00'),
      CONCAT(CURDATE(), ' 20:30:00'), CONCAT(CURDATE(), ' 18:12:00')),
  (2, 3, 1, 1, 1, 1, 35.00, 35.00,
      'seed-qr-token-0000000000000002', '7135', 'confirmed',
      CONCAT(CURDATE(), ' 17:00:00'), CONCAT(CURDATE(), ' 20:00:00'),
      CONCAT(CURDATE(), ' 20:30:00'), NULL),
  (3, 4, 2, 3, 4, 2, 27.00, 54.00,
      'seed-qr-token-0000000000000003', '2960', 'cancelled',
      CONCAT(CURDATE(), ' 18:00:00'), CONCAT(CURDATE(), ' 19:00:00'),
      CONCAT(CURDATE(), ' 19:30:00'), NULL);

-- ---------------------------------------------------------------------
--  รีวิว
-- ---------------------------------------------------------------------
INSERT INTO reviews (review_id, customer_id, store_id, reservation_id, rating, comment) VALUES
  (1, 2, 1, 1, 5, 'อาหารยังร้อนอยู่เลย คุ้มมากในราคานี้ ร้านใจดีด้วย'),
  (2, 3, 1, 2, 4, 'รสชาติดี แต่รอรับนานนิดหน่อย');

-- หมายเหตุ : รีวิวที่ 2 ผูกกับการจองที่ยังไม่ completed ใส่ไว้เพื่อให้มีข้อมูลโชว์
--            ในระบบจริง Backend จะไม่ยอมให้รีวิวถ้าการจองยังไม่ completed

-- ---------------------------------------------------------------------
--  การแจ้งเตือน
-- ---------------------------------------------------------------------
INSERT INTO notifications (user_id, title, message, type, ref_id, is_read) VALUES
  (2, 'จองสำเร็จ',      'คุณจองข้าวกะเพราหมูสับไข่ดาว จากร้านครัวคุณแม่เรียบร้อยแล้ว', 'reservation', 1, 1),
  (3, 'จองสำเร็จ',      'คุณจองข้าวกะเพราหมูสับไข่ดาว จากร้านครัวคุณแม่เรียบร้อยแล้ว', 'reservation', 2, 0),
  (5, 'มีการจองใหม่',   'มีลูกค้าจองอาหารจากร้านของคุณ 1 รายการ',                      'reservation', 2, 0),
  (8, 'ร้านรออนุมัติ',   'ร้านของคุณอยู่ระหว่างรอผู้ดูแลระบบตรวจสอบ',                    'store',       4, 0);

-- ---------------------------------------------------------------------
--  การแจ้งปัญหา
-- ---------------------------------------------------------------------
INSERT INTO reports (reporter_id, target_type, target_id, reason, status) VALUES
  (4, 'store', 2, 'ไปถึงร้านแล้วแจ้งว่าของหมด ทั้งที่จองไว้', 'open');

-- =====================================================================
--  จบไฟล์ seed.sql
--
--  บัญชีสำหรับทดสอบ (รหัสผ่านทุกบัญชีคือ 123456)
--    Admin     : admin@saveeats.com
--    Customer  : customer1@test.com
--    Seller    : seller1@test.com  (ร้านครัวคุณแม่ อนุมัติแล้ว)
--    Seller    : seller4@test.com  (ร้านรออนุมัติ ใช้ทดสอบหน้า Admin)
-- =====================================================================
