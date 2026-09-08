/**
 * รันไฟล์ migration ใส่ฐานข้อมูลที่ backend\.env ชี้อยู่ ด้วยคำสั่งเดียว
 *
 * วิธีใช้
 *   cd SaveEats\backend
 *   npm run migrate -- migration_05_report_evidence_and_chat.sql
 *
 * ใส่ได้ทั้งชื่อไฟล์เฉย ๆ (จะไปหาในโฟลเดอร์ database ให้เอง)
 * หรือใส่เป็น path เต็มก็ได้
 *
 * *** ทำไมต้องมีไฟล์นี้ แทนที่จะวางคำสั่งใน phpMyAdmin เหมือนเมื่อก่อน ***
 * ตอนนี้ฐานข้อมูลจริงอยู่บนคลาวด์แล้ว phpMyAdmin ของ XAMPP ต่อไปไม่ได้
 * เพราะคลาวด์บังคับต่อแบบเข้ารหัส (SSL) และใช้วิธียืนยันรหัสผ่านแบบใหม่
 * ไฟล์นี้ใช้ mysql2 ตัวเดียวกับที่ Backend ใช้อยู่ จึงต่อได้แน่นอน
 *
 * *** ทำไมไม่ใช้ import-cloud ที่มีอยู่แล้ว ***
 * import-cloud คือการ "ลงฐานข้อมูลใหม่ทั้งชุด" จาก schema.sql
 * ถ้าเอามาใช้ตอนนี้ ข้อมูลจริงที่มีอยู่จะหายหมด
 * migration คือการ "แก้ของเดิมทีละนิดโดยไม่แตะข้อมูล" จึงต้องแยกเครื่องมือกัน
 */
import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import mysql from 'mysql2/promise';

import env from '../src/config/env';
import { sslOptions } from '../src/config/db';

/** โฟลเดอร์ราก SaveEats (ขึ้นจาก backend\tools ไป 2 ชั้น) */
const ROOT = path.resolve(__dirname, '..', '..');

function line(): void {
  console.log('-'.repeat(64));
}

/**
 * หาไฟล์ที่ผู้ใช้พิมพ์มา
 * ลองทั้งแบบ path ตรง ๆ และแบบชื่อไฟล์ในโฟลเดอร์ database
 */
function resolveSqlPath(input: string): string {
  const candidates = [path.resolve(input), path.join(ROOT, 'database', input)];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `หาไฟล์ไม่เจอ: ${input}\n` +
      `ลองหาที่\n  ${candidates.join('\n  ')}`
  );
}

async function main(): Promise<void> {
  /*
   * process.argv[0] คือ node, [1] คือไฟล์สคริปต์ ที่เหลือคือสิ่งที่ผู้ใช้พิมพ์
   * กรอง argument ที่ขึ้นต้นด้วย -- ออก เผื่อวันหน้ามี flag เพิ่ม
   */
  const fileArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  if (fileArg === undefined) {
    console.error('');
    console.error('!! ต้องบอกด้วยว่าจะรันไฟล์ไหน');
    console.error('   ตัวอย่าง : npm run migrate -- migration_05_report_evidence_and_chat.sql');
    console.error('');
    process.exit(1);
  }

  const sqlPath = resolveSqlPath(fileArg);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('');
  console.log('='.repeat(64));
  console.log('   รัน migration ใส่ฐานข้อมูล SaveEats');
  console.log('='.repeat(64));
  console.log(`   ไฟล์      : ${path.basename(sqlPath)}`);
  console.log(`   ปลายทาง   : ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}`);
  console.log(`   ฐานข้อมูล : ${env.DB_NAME}`);
  console.log(`   เข้ารหัส  : ${env.DB_SSL ? 'เปิด' : 'ปิด'}`);
  line();

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // ไฟล์ migration มีหลายคำสั่งในไฟล์เดียว จึงต้องเปิดข้อนี้
    multipleStatements: true,
    ...sslOptions(),
  });

  try {
    await conn.query(sql);
    console.log('');
    console.log('   สำเร็จ ฐานข้อมูลถูกแก้ไขเรียบร้อยแล้ว');
    console.log('');
  } finally {
    await conn.end();
  }
}

main().catch((err: unknown) => {
  const detail = err instanceof Error ? err.message : String(err);
  console.error('');
  console.error('!! รัน migration ไม่สำเร็จ');
  console.error(`   ${detail}`);
  console.error('');
  /*
   * ข้อความที่เจอบ่อยที่สุด แปลให้เป็นภาษาคนไว้เลย จะได้ไม่ต้องไปเดา
   */
  if (detail.includes('Duplicate column')) {
    console.error('   แปลว่า : เคยรัน migration นี้ไปแล้ว ไม่ต้องรันซ้ำ');
  }
  if (detail.includes('ENOTFOUND') || detail.includes('ETIMEDOUT')) {
    console.error('   แปลว่า : ต่อฐานข้อมูลไม่ได้ ถ้าใช้ Aiven ให้เช็คว่าเปิดเครื่องอยู่หรือเปล่า');
  }
  process.exit(1);
});
