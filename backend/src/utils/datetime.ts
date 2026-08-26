/**
 * ตัวช่วยจัดการวันเวลา
 *
 * ฐานข้อมูลส่ง DATETIME มาเป็นข้อความรูปแบบ 'YYYY-MM-DD HH:mm:ss'
 * (เพราะตั้ง dateStrings: true ไว้ที่ mysql2)
 * ไฟล์นี้รวมการแปลงไปมาไว้ที่เดียว จะได้ไม่เขียนซ้ำหลายที่
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/** แปลงข้อความจาก MySQL เป็น Date */
export function parseMysqlDate(value: string): Date {
  return new Date(value.replace(' ', 'T'));
}

/** แปลง Date เป็นข้อความรูปแบบที่ MySQL รับ */
export function toMysqlDate(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** บวกนาทีเข้ากับเวลาที่เป็นข้อความของ MySQL */
export function addMinutes(mysqlDateTime: string, minutes: number): string {
  const date = parseMysqlDate(mysqlDateTime);
  date.setMinutes(date.getMinutes() + minutes);
  return toMysqlDate(date);
}

/** เวลานี้เลยไปแล้วหรือยัง */
export function isPast(mysqlDateTime: string): boolean {
  return parseMysqlDate(mysqlDateTime).getTime() < Date.now();
}
