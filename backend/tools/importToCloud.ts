/**
 * ยกฐานข้อมูล SaveEats ขึ้นเซิร์ฟเวอร์บนคลาวด์ ด้วยคำสั่งเดียว
 *
 * วิธีใช้
 *   1. แก้ backend\.env ให้ชี้ไปที่ฐานข้อมูลคลาวด์ก่อน
 *      (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL=true)
 *   2. เปิด Command Prompt
 *        cd SaveEats\backend
 *        npm run import-cloud
 *
 * ทำอะไรให้บ้าง
 *   - สร้างฐานข้อมูลตามชื่อใน DB_NAME ถ้ายังไม่มี
 *   - รัน database\schema.sql  (สร้างตารางทั้งหมด)
 *   - รัน database\seed.sql    (ใส่ข้อมูลทดลอง ข้ามได้ด้วย --no-seed)
 *
 * ถ้าในฐานข้อมูลมีตารางอยู่แล้ว สคริปต์จะหยุดไว้ก่อน ไม่ลบทับให้เอง
 * ถ้าตั้งใจจะล้างแล้วลงใหม่จริง ๆ ให้สั่ง
 *        npm run import-cloud -- --force
 *
 * ทำไมต้องมีไฟล์นี้ แทนที่จะ Import ผ่าน phpMyAdmin เหมือนตอนอยู่ในเครื่อง
 *   ฐานข้อมูลบนคลาวด์บังคับต่อแบบเข้ารหัส และผู้ให้บริการหลายเจ้าใช้วิธียืนยันรหัสผ่าน
 *   แบบใหม่ที่โปรแกรม mysql ของ XAMPP ยังไม่รองรับ พอสั่งจาก XAMPP จะขึ้นว่าต่อไม่ได้
 *   ไฟล์นี้ใช้ mysql2 ตัวเดียวกับที่ Backend ใช้อยู่แล้ว จึงต่อได้แน่นอน
 */
import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';

import mysql from 'mysql2/promise';
import type { RowDataPacket } from 'mysql2/promise';

import env from '../src/config/env';
import { sslOptions } from '../src/config/db';

/** โฟลเดอร์ราก SaveEats (ขึ้นจาก backend\tools ไป 2 ชั้น) */
const ROOT = path.resolve(__dirname, '..', '..');

interface CountRow extends RowDataPacket {
  n: number;
}

function line(): void {
  console.log('-'.repeat(64));
}

function readSql(fileName: string): string {
  const full = path.join(ROOT, 'database', fileName);
  if (!fs.existsSync(full)) {
    throw new Error(`หาไฟล์ไม่เจอ: ${full}`);
  }
  return fs.readFileSync(full, 'utf8');
}

/**
 * ตัดคำสั่งที่เกี่ยวกับ "ตัวฐานข้อมูล" ออก เหลือแต่คำสั่งสร้างตารางกับใส่ข้อมูล
 *
 * ไฟล์ schema.sql เขียนไว้สำหรับ phpMyAdmin จึงมี DROP DATABASE / CREATE DATABASE / USE อยู่ต้นไฟล์
 * แต่บนคลาวด์เราสร้างฐานข้อมูลจากสคริปต์นี้เอง และผู้ให้บริการบางเจ้าไม่ให้สิทธิ์ DROP DATABASE
 * จึงตัดส่วนนั้นทิ้ง แล้วใช้ไฟล์เดิมได้เลยโดยไม่ต้องทำไฟล์ซ้ำอีกชุด (ไฟล์ซ้ำ = ลืมแก้ตามกันแน่นอน)
 */
function stripDatabaseLines(sql: string): string {
  return sql
    .replace(/DROP\s+DATABASE[\s\S]*?USE\s+`?\w+`?\s*;/i, '')
    .replace(/^[ \t]*USE\s+`?\w+`?\s*;[ \t]*$/gim, '');
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  const skipSeed = process.argv.includes('--no-seed');

  console.log('');
  console.log('='.repeat(64));
  console.log('   ยกฐานข้อมูล SaveEats ขึ้นคลาวด์');
  console.log('='.repeat(64));
  console.log(`   ปลายทาง : ${env.DB_USER}@${env.DB_HOST}:${env.DB_PORT}`);
  console.log(`   ฐานข้อมูล: ${env.DB_NAME}`);
  console.log(`   เข้ารหัส : ${env.DB_SSL ? 'เปิด' : 'ปิด'}`);
  line();

  if (!env.DB_SSL && env.DB_HOST !== 'localhost' && env.DB_HOST !== '127.0.0.1') {
    console.log('!! DB_HOST ไม่ใช่เครื่องตัวเอง แต่ DB_SSL ยังเป็น false');
    console.log('   ฐานข้อมูลบนคลาวด์เกือบทั้งหมดบังคับให้เข้ารหัส ถ้าต่อไม่ติดให้ตั้ง DB_SSL=true');
    line();
  }

  /*
   * ต่อแบบยังไม่เลือกฐานข้อมูล เพราะตอนนี้ฐานข้อมูลอาจยังไม่มี
   * multipleStatements: true จำเป็นสำหรับไฟล์ .sql ที่มีหลายคำสั่งในไฟล์เดียว
   * (pool ปกติของ Backend ปิดค่านี้ไว้ เพื่อกัน SQL Injection ตามกฎเหล็กข้อ 3 - ที่นี่เป็นเครื่องมือของเรา ไม่ได้รับค่าจากผู้ใช้)
   */
  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4_unicode_ci',
    /** ให้ DATETIME คืนมาเป็นข้อความ จะได้เห็นเวลาตรงตามที่ฐานข้อมูลเก็บจริง */
    dateStrings: true,
    ...sslOptions(),
  });

  try {
    await conn.query(`SET time_zone = '${env.DB_TIMEZONE}'`);
    console.log('1. ต่อฐานข้อมูลสำเร็จ');

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${env.DB_NAME}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await conn.query(`USE \`${env.DB_NAME}\``);
    console.log(`2. เตรียมฐานข้อมูล ${env.DB_NAME} เรียบร้อย`);

    const [existing] = await conn.query<RowDataPacket[]>('SHOW TABLES');
    const tableNames = existing.map((row) => String(Object.values(row)[0] as string));

    if (tableNames.length > 0) {
      if (!force) {
        line();
        console.log(`!! ฐานข้อมูลนี้มีตารางอยู่แล้ว ${tableNames.length} ตาราง`);
        console.log('   สคริปต์หยุดไว้ก่อน เพราะการลงใหม่จะลบข้อมูลเดิมทั้งหมด');
        console.log('   ถ้าตั้งใจจะล้างแล้วลงใหม่จริง ๆ ให้สั่ง');
        console.log('       npm run import-cloud -- --force');
        line();
        return;
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const name of tableNames) {
        await conn.query(`DROP TABLE IF EXISTS \`${name}\``);
      }
      await conn.query('SET FOREIGN_KEY_CHECKS = 1');
      console.log(`3. ลบตารางเดิมออก ${tableNames.length} ตาราง (--force)`);
    }

    await conn.query(stripDatabaseLines(readSql('schema.sql')));
    console.log('4. สร้างตารางจาก schema.sql เรียบร้อย');

    if (skipSeed) {
      console.log('5. ข้ามข้อมูลทดลอง (--no-seed)');
    } else {
      await conn.query(stripDatabaseLines(readSql('seed.sql')));
      console.log('5. ใส่ข้อมูลทดลองจาก seed.sql เรียบร้อย');
    }

    line();
    for (const table of ['users', 'stores', 'foods', 'posts', 'categories']) {
      const [rows] = await conn.query<CountRow[]>(`SELECT COUNT(*) AS n FROM \`${table}\``);
      const first = rows[0];
      console.log(`   ${table.padEnd(12)} : ${first === undefined ? '?' : first.n} แถว`);
    }

    const [now] = await conn.query<RowDataPacket[]>('SELECT NOW() AS now_db');
    const nowRow = now[0];
    console.log(`   เวลาฝั่งฐานข้อมูล : ${nowRow === undefined ? '?' : String(nowRow['now_db'])}`);
    console.log('   (ต้องตรงกับเวลาไทยตอนนี้ ถ้าห่างไป 7 ชั่วโมงแปลว่า DB_TIMEZONE ไม่ทำงาน)');
    line();
    console.log('   เสร็จเรียบร้อย ขั้นถัดไปคือ npm run dev แล้วลองเปิดแอปดู');
    console.log('');
  } finally {
    await conn.end();
  }
}

void main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('');
  console.error('!! ไม่สำเร็จ:', message);
  console.error('');
  console.error('   เช็คทีละข้อ');
  console.error('   - ค่าใน .env ตรงกับหน้าเว็บของผู้ให้บริการไหม (host / port / user / password)');
  console.error('   - ตั้ง DB_SSL=true แล้วหรือยัง');
  console.error('   - ฐานข้อมูลบนคลาวด์สร้างเสร็จแล้วหรือยัง (สถานะต้องเป็น Running)');
  console.error('');
  process.exit(1);
});
