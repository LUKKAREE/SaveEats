# SaveEats

แอปพลิเคชันที่ให้ร้านอาหารนำอาหารที่เหลือหรือใกล้หมดเวลาขาย มาโพสต์ลงระบบในราคาลด
ลูกค้าค้นหา จอง แล้วไปรับที่ร้าน **ชำระเงินสดหน้าร้าน ไม่มีบริการจัดส่ง**

> เอกสารอธิบายทั้งหมดเป็นภาษาไทยอยู่ในโฟลเดอร์ [`docs/`](./docs)
> **อ่าน `docs/02_วิธีติดตั้งและรัน.txt` ก่อนเป็นอันดับแรก**

## โครงสร้างโปรเจกต์

```
SaveEats/
├── shared/      *** type กลาง ทั้ง 3 ฝั่งใช้ร่วมกัน ***
├── mobile/      แอปมือถือ (Customer + Seller)  React Native + Expo
├── admin-web/   เว็บผู้ดูแลระบบ                React + Vite
├── backend/     API + Logic ทั้งหมด            Node.js + Express
├── database/    schema.sql และ seed.sql        MySQL / MariaDB
└── docs/        เอกสารอธิบายภาษาไทย
```

## Tech Stack

| ส่วน | เทคโนโลยี |
|------|-----------|
| ภาษา | **TypeScript** ทั้งระบบ |
| Mobile App | React Native + Expo (TypeScript) |
| Admin Web | React + Vite (TypeScript) |
| Backend | Node.js + Express + tsx (TypeScript) |
| Database | MySQL / MariaDB ผ่าน XAMPP |
| Authentication | JWT |
| API | REST |

ใช้ **TypeScript ภาษาเดียวทั้งระบบ** มีเพียง Database ที่ใช้ SQL

`shared/` เก็บหน้าตาข้อมูลทั้งหมด (User, Store, Post, Reservation, ...) ไว้ที่เดียว
ทั้ง backend, mobile และ admin-web ใช้ type ตัวเดียวกัน
**ถ้าชื่อ field ไม่ตรงกัน TypeScript จะฟ้องทันทีตั้งแต่ตอนพิมพ์**

## เริ่มต้นใช้งานแบบเร็ว

```bash
# 1. Database  — เปิด XAMPP กด Start ที่ Apache + MySQL
#    แล้วเข้า http://localhost/phpmyadmin -> Import database/schema.sql
#    ตามด้วย database/seed.sql

# 2. Backend
cd backend
npm install
copy .env.example .env      # Mac/Linux ใช้ cp .env.example .env
npm run dev                 # เปิดที่ http://localhost:3000

# 3. Admin Web
cd admin-web
npm install
npm run dev                 # เปิดที่ http://localhost:5173

# 4. Mobile
cd mobile
npm install
# *** แก้เลข IP ใน src/core/constants/apiConstants.ts ก่อน ***
npx expo start
```

> **ไม่ต้อง build TypeScript เป็น JavaScript ก่อนรัน**
> backend ใช้ `tsx` รันไฟล์ `.ts` ตรง ๆ / admin-web ใช้ Vite / mobile ใช้ Babel ของ Expo

## คำสั่งที่ควรรู้

| คำสั่ง | ทำอะไร | รันที่ไหน |
|--------|---------|-----------|
| `npm run dev` | รันโหมดพัฒนา (แก้โค้ดแล้วรีสตาร์ทเอง) | backend, admin-web |
| `npm run typecheck` | ตรวจ type ทั้งโปรเจกต์ ไม่มี error = ผ่าน | ทั้ง 3 โฟลเดอร์ |
| `npm test` | รันเทส Logic 21 ข้อ (ไม่ต้องเปิด MySQL) | backend |
| `npm run build` | ตรวจ type แล้ว build เว็บ | admin-web |
| `npx expo start` | รันแอปมือถือ | mobile |

**ก่อน commit ทุกครั้ง ให้รัน `npm run typecheck` ในโฟลเดอร์ที่แก้**

## บัญชีทดสอบ (รหัสผ่านทุกบัญชี `Test@1234`)

| Role | Email | ใช้ที่ไหน |
|------|-------|-----------|
| admin | admin@saveeats.com | Admin Web |
| customer | customer1@test.com | แอปมือถือ |
| seller | seller1@test.com | แอปมือถือ (ร้านอนุมัติแล้ว) |
| seller | seller4@test.com | แอปมือถือ (ร้านรออนุมัติ) |

## กฎเหล็ก 7 ข้อของโปรเจกต์

1. Mobile และ Admin Web **ห้าม** ต่อ Database โดยตรง ต้องผ่าน Backend API เท่านั้น
2. Business Logic ทั้งหมดอยู่ที่ `backend/src/services/`
3. ตรวจสิทธิ์ที่ Backend เสมอ การซ่อนปุ่มใน UI ไม่นับว่าเป็นความปลอดภัย
4. QR Code ต้องผ่าน Backend ทุกครั้ง ห้ามให้แอปตัดสินเอง
5. **หน้าตาข้อมูลทุกอย่างประกาศไว้ที่ `shared/` ที่เดียว** ห้ามประกาศซ้ำในแต่ละโปรเจกต์
6. ห้ามเอา `.env` ขึ้น GitHub ใช้ `.env.example` แทน
7. รูปที่ผู้ใช้อัปโหลดเก็บที่ `backend/uploads/` ห้ามเก็บใน `mobile/assets/`

## เอกสารเพิ่มเติม

| ไฟล์ | เนื้อหา |
|------|---------|
| `docs/01_สรุปสิ่งที่ทำไปแล้ว.txt` | ทำอะไรไปแล้วบ้าง ไฟล์ไหนทำหน้าที่อะไร |
| `docs/02_วิธีติดตั้งและรัน.txt` | ขั้นตอนติดตั้งทีละขั้น + วิธีแก้ปัญหาที่เจอบ่อย |
| `docs/03_คู่มือทีม.txt` | การแบ่งงาน Git workflow และสิ่งที่ต้องทำต่อ |
| `docs/04_ธีมและแนวทาง-UI.txt` | ชุดสี ฟอนต์ และหลัก UX ที่ใช้ |
| `docs/05_TypeScript-ฉบับเริ่มต้น.txt` | **ทำไมเปลี่ยนมาใช้ TypeScript และใช้ยังไง** |
| `docs/06_แผนการทดสอบ.txt` | **เช็คลิสต์ทดสอบทีละขั้น ใช้ตอนส่งงาน** |
| `shared/README.txt` | อธิบายโฟลเดอร์ type กลาง |
| `database/README.md` | วิธี Import ฐานข้อมูล |
