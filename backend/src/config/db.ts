/**
 * ตั้งค่าการเชื่อมต่อ MySQL / MariaDB
 *
 * ใช้ Connection Pool เพราะเปิด-ปิด connection ใหม่ทุก request จะช้ามาก
 * Pool = เตรียม connection ไว้ล่วงหน้าหลายเส้น แล้วหมุนเวียนใช้
 */
import mysql from 'mysql2/promise';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import env from './env';

export const pool = mysql.createPool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4_unicode_ci',
  /** คืนค่า DATETIME เป็นข้อความ 'YYYY-MM-DD HH:mm:ss' จะได้ไม่เพี้ยนเรื่อง timezone */
  dateStrings: true,
  /** คืนค่า DECIMAL เป็นตัวเลข ไม่ใช่ข้อความ (ถ้าไม่ตั้ง ราคาจะกลายเป็น string) */
  decimalNumbers: true,
});

/** ทดสอบว่าเชื่อมฐานข้อมูลได้จริงไหม (เรียกตอน server เริ่มทำงาน) */
export async function testConnection(): Promise<boolean> {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log(`   Database: เชื่อมต่อ ${env.DB_NAME} สำเร็จ`);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('   Database: เชื่อมต่อไม่สำเร็จ ->', message);
    return false;
  }
}

/**
 * ชนิดของค่าที่ส่งเข้าไปแทนเครื่องหมาย ? ใน SQL ได้
 * (mysql2 รับได้แค่ชนิดพวกนี้ ถ้าส่ง object เข้าไปจะพังตอนรัน)
 */
export type SqlParam = string | number | boolean | null | Date | Buffer;

/**
 * รันคำสั่งอ่านข้อมูล (SELECT)
 *
 * @example
 *   const rows = await query<User>('SELECT * FROM users WHERE role = ?', ['admin']);
 *
 * @template T หน้าตาของข้อมูล 1 แถว เช่น User หรือ Store
 */
export async function query<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params);
  return rows as T[];
}

/**
 * รันคำสั่งเขียนข้อมูล (INSERT / UPDATE / DELETE)
 * คืนค่าเป็น ResultSetHeader ซึ่งมี insertId และ affectedRows
 *
 * @example
 *   const result = await execute('INSERT INTO users (...) VALUES (...)', [...]);
 *   const newId = result.insertId;
 */
export async function execute(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

/**
 * รันหลายคำสั่งใน Transaction เดียว
 * ใช้กับงานที่ต้อง "สำเร็จทั้งหมด หรือไม่สำเร็จเลย" เช่น การจองอาหาร
 *
 * ถ้าเกิด error ระหว่างทาง ระบบจะย้อนทุกอย่างกลับ (rollback) ให้อัตโนมัติ
 */
export async function withTransaction<T>(
  work: (conn: PoolConnection) => Promise<T>
): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * สร้างท่อน LIMIT / OFFSET แบบปลอดภัย
 *
 * *** ทำไมไม่ใช้ LIMIT ? OFFSET ? แบบ prepared statement ***
 * MariaDB ที่มากับ XAMPP มักตอบ error ว่า
 *     "Incorrect arguments to mysqld_stmt_execute"
 * เพราะมองค่าที่ส่งมาเป็นข้อความ ไม่ใช่ตัวเลข
 *
 * วิธีแก้ : แปลงเป็นจำนวนเต็มด้วยตัวเองแล้วต่อเข้าไปใน SQL ตรง ๆ
 * ปลอดภัยเพราะบังคับให้เป็นตัวเลขเท่านั้น ฉีด SQL เข้ามาไม่ได้
 */
export function paginate(
  page: number | string = 1,
  limit: number | string = 20
): { sql: string; page: number; limit: number; offset: number } {
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(String(page), 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  return { sql: `LIMIT ${safeLimit} OFFSET ${offset}`, page: safePage, limit: safeLimit, offset };
}

/** สร้างท่อน LIMIT อย่างเดียว (ไม่มี OFFSET) */
export function limitOnly(limit: number | string = 20): string {
  const safeLimit = Math.min(Math.max(parseInt(String(limit), 10) || 20, 1), 500);
  return `LIMIT ${safeLimit}`;
}

/** หน้าตาผลลัพธ์ของ SELECT COUNT(*) AS total */
export interface CountRow {
  total: number;
}

/** ตัวช่วยอ่านค่า total จากผลลัพธ์ COUNT (กันกรณีไม่มีแถวเลย) */
export async function countOf(sql: string, params: SqlParam[] = []): Promise<number> {
  const rows = await query<CountRow>(sql, params);
  return Number(rows[0]?.total ?? 0);
}
