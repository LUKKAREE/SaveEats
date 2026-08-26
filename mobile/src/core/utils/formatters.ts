/**
 * แปลงข้อมูลดิบให้เป็นข้อความที่คนอ่านเข้าใจ
 * เช่น 100 -> "100 บาท" , "2026-08-09" -> "9 ส.ค. 2026"
 */

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
] as const;

/** ค่าที่รับได้ทั้งข้อความจาก MySQL และ Date */
export type DateLike = string | Date | null | undefined;

/** แปลงข้อความเวลาจาก MySQL ('2026-08-10 17:00:00') เป็น Date */
function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * แปลง Date เป็นข้อความรูปแบบที่ Backend ต้องการ ('YYYY-MM-DD HH:mm:ss')
 * ใช้ตอนส่งเวลารับอาหารไปสร้างโพสต์
 *
 * *** ห้ามใช้ toISOString() ***
 * เพราะ toISOString() แปลงเป็นเวลา UTC ซึ่งของไทยจะเพี้ยนไป 7 ชั่วโมง
 */
export function toApiDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

/** บวกชั่วโมงเข้ากับเวลาปัจจุบัน */
export function hoursFromNow(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  d.setSeconds(0, 0);
  return d;
}

/** 35 -> "35 บาท" */
export function formatPrice(value: number | string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  const text = num % 1 === 0 ? num.toLocaleString('th-TH') : num.toFixed(2);
  return `${text} บาท`;
}

/** 35 -> "฿35" (ใช้ในที่แคบ ๆ) */
export function formatPriceShort(value: number | string): string {
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  return `฿${num % 1 === 0 ? num.toLocaleString('th-TH') : num.toFixed(2)}`;
}

/** คำนวณเปอร์เซ็นต์ส่วนลด : (60, 35) -> "ลด 42%" คืน null ถ้าไม่ได้ลด */
export function formatDiscount(normalPrice: number | string, discountPrice: number | string): string | null {
  const normal = Number(normalPrice);
  const discount = Number(discountPrice);
  if (!Number.isFinite(normal) || normal <= discount) return null;
  const percent = Math.round(((normal - discount) / normal) * 100);
  return `ลด ${percent}%`;
}

/** '2026-08-09' -> "9 ส.ค. 2026" */
export function formatDate(value: DateLike): string {
  const d = toDate(value);
  if (d === null) return '-';
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()] ?? ''} ${d.getFullYear()}`;
}

/** '2026-08-09 17:00:00' -> "17:00" */
export function formatTime(value: DateLike): string {
  const d = toDate(value);
  if (d === null) return '-';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** '2026-08-09 17:00:00' -> "9 ส.ค. 2026 17:00" */
export function formatDateTime(value: DateLike): string {
  const d = toDate(value);
  if (d === null) return '-';
  return `${formatDate(d)} ${formatTime(d)}`;
}

/** ช่วงเวลารับอาหาร : "รับได้ 17:00 - 20:00" */
export function formatPickupRange(start: DateLike, end: DateLike): string {
  return `รับได้ ${formatTime(start)} - ${formatTime(end)}`;
}

/** "อีก 2 ชม. 15 นาที" หรือ "หมดเวลาแล้ว" */
export function formatTimeLeft(endTime: DateLike): string {
  const end = toDate(endTime);
  if (end === null) return '-';

  const diffMs = end.getTime() - Date.now();
  if (diffMs <= 0) return 'หมดเวลาแล้ว';

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `อีก ${days} วัน`;
  if (hours > 0) return `อีก ${hours} ชม. ${minutes % 60} นาที`;
  return `อีก ${minutes} นาที`;
}

/** "2 นาทีที่แล้ว" ใช้กับรายการแจ้งเตือน */
export function formatRelativeTime(value: DateLike): string {
  const d = toDate(value);
  if (d === null) return '-';

  const minutes = Math.floor((Date.now() - d.getTime()) / 60000);
  if (minutes < 1) return 'เมื่อสักครู่';
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;
  return formatDate(d);
}

/** 1.5 -> "1.5 กม." , 0.4 -> "400 ม." */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '';
  const num = Number(km);
  if (Number.isNaN(num)) return '';
  if (num < 1) return `${Math.round(num * 1000)} ม.`;
  return `${num.toFixed(1)} กม.`;
}

/** 4.5 -> "4.5" , 0 -> "ยังไม่มีรีวิว" */
export function formatRating(rating: number | string, reviewCount?: number): string {
  const num = Number(rating);
  if (!num) return 'ยังไม่มีรีวิว';
  const text = num.toFixed(1);
  return reviewCount !== undefined && reviewCount > 0 ? `${text} (${reviewCount})` : text;
}

/** ตัดข้อความยาวให้สั้นลง */
export function truncate(text: string | null | undefined, maxLength = 60): string {
  if (!text) return '';
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}
