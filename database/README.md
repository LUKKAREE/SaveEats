# SaveEats - Database

ฐานข้อมูล: **MySQL / MariaDB** (ใช้ผ่าน XAMPP + phpMyAdmin)
ชื่อฐานข้อมูล: `saveeats`

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
|------|---------|
| `schema.sql` | สร้าง Database + ตารางทั้งหมด 13 ตาราง พร้อม Foreign Key |
| `seed.sql`   | ใส่ข้อมูลทดลอง (Admin / Customer / ร้านค้า / อาหาร / โพสต์ / การจอง) |
| `refresh_time.sql` | เลื่อนเวลารับอาหารให้ทันสมัย ใช้เมื่อ Feed ว่างเพราะข้อมูลเก่า |
| `reset_for_demo.sql` | ล้างข้อมูลทั้งหมด เริ่มนับ id ใหม่จาก 1 (ใช้ตอนอยากสาธิตตั้งแต่สมัครสมาชิก) |

> **ไม่มีไฟล์ migration แล้ว** — เดิมมี `migration_01` ถึง `03` ไว้อัปเดตฐานข้อมูลเก่า
> ตอนนี้ `schema.sql` รวมทุกอย่างไว้หมดแล้ว (ตาราง `favorites`, คอลัมน์ `posts.hold_minutes`,
> ตาราง `password_resets` พร้อม `code_hash` และ `attempts`) จึง import ไฟล์เดียวจบ

## วิธี Import เข้า phpMyAdmin

1. เปิด XAMPP Control Panel กด **Start** ที่ `Apache` และ `MySQL`
2. เปิดเบราว์เซอร์ไปที่ http://localhost/phpmyadmin
3. คลิกแท็บ **Import** (ยังไม่ต้องเลือกฐานข้อมูลใด ๆ เพราะ `schema.sql` สร้างให้เอง)
4. กด **Choose File** เลือก `database/schema.sql` แล้วกด **Go**
5. ทำซ้ำข้อ 3-4 อีกครั้ง แต่คราวนี้เลือกฐานข้อมูล `saveeats` ทางซ้ายก่อน แล้ว Import `database/seed.sql`

> ถ้าอยากล้างข้อมูลเริ่มใหม่ ให้ Import `schema.sql` ซ้ำได้เลย
> (ไฟล์มีคำสั่ง `DROP DATABASE IF EXISTS saveeats;` อยู่บรรทัดแรก — **ข้อมูลเดิมจะหายทั้งหมด**)

## Import ผ่าน Command Line (ทางเลือก เร็วกว่า)

```bash
# Windows: cd ไปที่โฟลเดอร์ mysql ของ XAMPP ก่อน เช่น C:\xampp\mysql\bin
mysql -u root -p < schema.sql
mysql -u root -p saveeats < seed.sql
```
รหัสผ่าน root ของ XAMPP โดยปกติคือ **ว่าง** (กด Enter ผ่านได้เลย)

## บัญชีทดสอบ (รหัสผ่านทุกบัญชีคือ `Test@1234`)

| Role | Email | หมายเหตุ |
|------|-------|----------|
| admin    | admin@saveeats.com  | ใช้ Login เข้า Admin Web |
| customer | customer1@test.com  | มีประวัติการจอง + รีวิวแล้ว |
| customer | customer2@test.com  | มีการจองที่ยังไม่รับ ใช้ทดสอบสแกน QR |
| seller   | seller1@test.com    | ร้านครัวคุณแม่ (อนุมัติแล้ว มีโพสต์) |
| seller   | seller4@test.com    | ร้านรออนุมัติ ใช้ทดสอบหน้าอนุมัติของ Admin |

## แผนผังความสัมพันธ์

```
users ──1:1── stores ──1:N── foods ──1:N── posts
  │              │                            │
  │              ├──1:1── behavior_scores      │
  │              ├──1:N── behavior_logs        │
  │              └──1:N── reviews              │
  │                                            │
  └──1:N── reservations ───────────────────────┘
                │
                └──1:1── reviews

users ──1:N── notifications
users ──1:N── reports
categories ──1:N── foods
```

## หมายเหตุการตัดสินใจ

- **Post กับ Food**: เลือกทางเลือก A — ร้านสร้าง "เมนู" เก็บไว้ในตาราง `foods` ก่อน
  แล้วค่อยเลือกเมนูมาสร้าง "โพสต์ขาย" ในตาราง `posts`
  ราคาลด / จำนวน / ช่วงเวลารับ อยู่ที่ `posts` เพราะเปลี่ยนทุกรอบที่โพสต์
- **หมวดหมู่อาหาร**: เก็บเป็นตาราง `categories` (5 หมวด) ไม่ได้ใช้ ENUM
  เพื่อให้ Admin เพิ่มหมวดใหม่ได้โดยไม่ต้องแก้โครงสร้างตาราง
- **behavior_logs**: เพิ่มเข้ามาจากแผนเดิม เพราะต้องดูย้อนหลังได้ว่าคะแนนถูกหักเพราะอะไร
