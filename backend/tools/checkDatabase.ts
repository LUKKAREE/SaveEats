/**
 * เครื่องมือตรวจฐานข้อมูล - ใช้ตอน login ไม่ผ่านหรือข้อมูลหาย
 *
 * วิธีรัน  (เปิด Command Prompt หน้าต่างใหม่ อย่าปิดหน้าต่างที่รัน npm run dev)
 *     cd SaveEats\backend
 *     npm run check-db
 *
 * ไฟล์นี้ต่อฐานข้อมูลด้วยค่าใน .env ตัวเดียวกับที่ Backend ใช้
 * ถ้าไฟล์นี้ต่อได้และเจอข้อมูล แปลว่าฝั่งฐานข้อมูลไม่มีปัญหา
 */
import bcrypt from 'bcryptjs';
import { pool, query } from '../src/config/db';
import { env } from '../src/config/env';

/** รหัสผ่านของบัญชีทดลองทุกใบใน seed.sql */
const TEST_PASSWORD = '123456';

/** ตารางที่ต้องมีครบ 11 ตาราง */
const REQUIRED_TABLES = [
  'users', 'stores', 'categories', 'foods', 'posts', 'reservations',
  'reviews', 'notifications', 'behavior_scores', 'behavior_logs', 'reports',
];

interface TableRow { table_name: string }
interface UserRow {
  user_id: number;
  email: string;
  role: string;
  is_active: number;
  password: string;
}
interface CountRow { n: number }

function line(): void {
  console.log('-'.repeat(64));
}

async function main(): Promise<void> {
  console.log('');
  console.log('='.repeat(64));
  console.log('  ตรวจฐานข้อมูล SaveEats');
  console.log('='.repeat(64));
  console.log(`  เชื่อมต่อไปที่ : ${env.DB_USER}@${env.DB_HOST}:${String(env.DB_PORT)}`);
  console.log(`  ชื่อฐานข้อมูล  : ${env.DB_NAME}`);
  line();

  // ---------------------------------------------------------------- 1. ตาราง
  const tables = await query<TableRow>(
    `SELECT table_name AS table_name
       FROM information_schema.tables
      WHERE table_schema = ?`,
    [env.DB_NAME]
  );
  const names = tables.map((t) => t.table_name.toLowerCase());
  const missing = REQUIRED_TABLES.filter((t) => !names.includes(t));

  console.log(`[1] ตาราง : เจอ ${String(names.length)} ตาราง (ต้องมี 11)`);
  if (missing.length > 0) {
    console.log(`    *** ขาดตาราง : ${missing.join(', ')} ***`);
    console.log('    วิธีแก้ : import database/schema.sql ใหม่ใน phpMyAdmin');
    await pool.end();
    return;
  }
  console.log('    ครบทุกตาราง');
  line();

  // ---------------------------------------------------------------- 2. จำนวนข้อมูล
  console.log('[2] จำนวนข้อมูลในแต่ละตาราง');
  for (const t of REQUIRED_TABLES) {
    // ชื่อตารางมาจากลิสต์ที่เราเขียนเองข้างบน ไม่ได้มาจากผู้ใช้ จึงต่อ string ได้
    const rows = await query<CountRow>(`SELECT COUNT(*) AS n FROM \`${t}\``);
    const n = rows[0]?.n ?? 0;
    console.log(`    ${t.padEnd(18)} ${String(n).padStart(4)} แถว${n === 0 ? '   <-- ว่าง' : ''}`);
  }
  line();

  // ---------------------------------------------------------------- 3. บัญชีผู้ใช้
  const users = await query<UserRow>(
    'SELECT user_id, email, role, is_active, password FROM users ORDER BY user_id'
  );

  console.log(`[3] บัญชีผู้ใช้ : ${String(users.length)} บัญชี`);
  if (users.length === 0) {
    console.log('    *** ตาราง users ว่างเปล่า นี่คือสาเหตุที่ login ไม่ผ่าน ***');
    console.log('    วิธีแก้ : import database/seed.sql ใหม่ใน phpMyAdmin');
    await pool.end();
    return;
  }

  console.log('');
  console.log('    อีเมล                     สิทธิ์     เปิดใช้  ยาว  รหัส 123456');
  console.log('    ' + '-'.repeat(62));

  let broken = 0;
  for (const u of users) {
    const len = u.password.length;
    const ok = await bcrypt.compare(TEST_PASSWORD, u.password);
    if (!ok) broken += 1;

    console.log(
      '    ' +
        u.email.padEnd(25) +
        u.role.padEnd(10) +
        (u.is_active ? 'ใช่' : 'ไม่ ').padEnd(8) +
        String(len).padStart(3) +
        '   ' +
        (ok ? 'ผ่าน' : '*** ไม่ผ่าน ***')
    );
  }
  line();

  // ---------------------------------------------------------------- 4. สรุป
  console.log('[4] สรุป');

  const admin = users.find((u) => u.role === 'admin');
  if (!admin) {
    console.log('    *** ไม่มีบัญชี admin เลย ***');
    console.log('    Admin Web จะ login ไม่ได้ ให้ import seed.sql ใหม่');
  } else if (!admin.is_active) {
    console.log('    *** บัญชี admin ถูกระงับอยู่ (is_active = 0) ***');
    console.log('    แก้ด้วย SQL : UPDATE users SET is_active = 1 WHERE role = \'admin\';');
  } else if (broken > 0) {
    console.log(`    *** รหัสผ่านของ ${String(broken)} บัญชีไม่ตรงกับ 123456 ***`);
    console.log('    ถ้าคอลัมน์ "ยาว" ไม่ใช่ 60 แปลว่า hash ถูกตัดตอน import');
    console.log('    วิธีแก้ : import database/seed.sql ใหม่ทั้งไฟล์');
  } else {
    console.log('    ฐานข้อมูลปกติดี ทุกบัญชีใช้รหัส 123456 ได้');
    console.log(`    ลอง login ด้วย : ${admin.email} / ${TEST_PASSWORD}`);
    console.log('');
    console.log('    ถ้ายัง login ไม่ผ่านอีก แปลว่าปัญหาไม่ได้อยู่ที่ฐานข้อมูล');
    console.log('    ให้ดูที่หน้าต่างที่รัน npm run dev ว่าขึ้น error อะไร');
  }

  console.log('='.repeat(64));
  console.log('');
  await pool.end();
}

main().catch((err: unknown) => {
  console.error('');
  console.error('*** ต่อฐานข้อมูลไม่ได้ ***');
  console.error(err instanceof Error ? err.message : String(err));
  console.error('');
  console.error('เช็ค 3 อย่างนี้');
  console.error('  1. เปิด XAMPP กด Start ที่ MySQL แล้วหรือยัง');
  console.error('  2. ค่า DB_PORT ใน backend/.env ตรงกับ port ของ MySQL ไหม');
  console.error('     (ดูที่หัวหน้า phpMyAdmin จะเขียนว่า Server: 127.0.0.1:3307)');
  console.error('  3. ฐานข้อมูลชื่อ saveeats มีอยู่จริงไหม');
  process.exit(1);
});
