/**
 * ตัวช่วยจัดรูปแบบข้อความสำหรับ Admin Web
 *
 * *** ทำไมต้องมีไฟล์นี้ ***
 * เดิมแต่ละหน้าเขียน new Date(...).toLocaleDateString('th-TH') เอง
 * พอมีหลายหน้าจะเริ่มไม่เหมือนกัน บางหน้าโชว์เวลา บางหน้าไม่โชว์
 * รวมไว้ที่เดียวแล้วเรียกใช้ จะได้หน้าตาเหมือนกันทั้งเว็บ
 *
 * *** เรื่องสำคัญ : ทำไมต้อง replace(' ', 'T') ***
 * MySQL ส่งวันเวลามาเป็น '2026-08-11 17:00:00' (มีช่องว่างคั่น)
 * Safari กับ Firefox อ่านรูปแบบนี้ไม่ออก จะได้ Invalid Date
 * ต้องเปลี่ยนเป็น '2026-08-11T17:00:00' ก่อนถึงจะใช้ได้ทุกเบราว์เซอร์
 */

/** แปลงข้อความวันเวลาจาก MySQL ให้เป็น Date object */
export function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 11 ส.ค. 2569 */
export function formatDate(value: string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** 17:00 */
export function formatTime(value: string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '-';
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

/** 11 ส.ค. 2569 17:00 */
export function formatDateTime(value: string | null | undefined): string {
  const d = toDate(value);
  if (!d) return '-';
  return `${formatDate(value)} ${formatTime(value)}`;
}

/**
 * ช่วงเวลารับอาหาร
 * ถ้าเป็นวันเดียวกันจะย่อเหลือ  11 ส.ค. 2569 17:00 - 20:00
 */
export function formatPickupRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return '-';
  if (s.toDateString() === e.toDateString()) {
    return `${formatDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
  }
  return `${formatDateTime(start)} - ${formatDateTime(end)}`;
}

/**
 * 35 บาท
 *
 * รับ number หรือ string ก็ได้ เพราะคอลัมน์ DECIMAL ของ MySQL
 * บางครั้งถูกส่งกลับมาเป็นข้อความ
 */
export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return '-';
  return `${n.toLocaleString('th-TH', { maximumFractionDigits: 2 })} บาท`;
}

/** ดาว 5 ดวง เช่น ★★★★☆ */
export function formatStars(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
