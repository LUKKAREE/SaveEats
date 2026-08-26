/**
 * อ่านค่าตัวกรองจาก query string ของ URL
 *
 * *** ใช้ทำอะไร ***
 * การ์ดในหน้าแดชบอร์ดกดแล้วพาไปหน้ารายการ เช่น
 *     การ์ด "โพสต์ที่กำลังขาย 5"  ->  /posts?status=active
 *
 * ถ้าพาไปเฉย ๆ โดยไม่ส่งตัวกรองไปด้วย ผู้ใช้จะเจอรายการทั้งหมด
 * แล้วต้องมานั่งหาเองว่า 5 อันที่เห็นบนการ์ดคืออันไหน ซึ่งเสียเวลาโดยไม่จำเป็น
 * ส่ง status ไปกับ URL แล้วให้หน้าปลายทางตั้งตัวกรองให้เลย จะตรงกับที่กดมา
 *
 * ผลพลอยได้อีกอย่างคือ ก๊อป URL ส่งให้คนอื่นได้ แล้วเขาเห็นหน้าเดียวกันเป๊ะ
 *
 * *** ทำไมต้องตรวจค่าก่อน ไม่เอามาใช้ตรง ๆ ***
 * query string เป็นสิ่งที่ใครก็พิมพ์อะไรใส่มาก็ได้ เช่น /posts?status=abc
 * ถ้าเอาไปตั้งเป็นตัวกรองเลย ตารางจะว่างเปล่าโดยไม่มีปุ่มไหนถูกไฮไลต์
 * ผู้ใช้จะงงว่าข้อมูลหายไปไหน จึงต้องเช็คก่อนว่าเป็นค่าที่ระบบรู้จักจริง
 * ถ้าไม่ใช่ก็ถือว่าไม่ได้กรอง (คืนค่าว่าง) ซึ่งปลอดภัยกว่า
 */

/**
 * @param params   ค่าที่ได้จาก useSearchParams()
 * @param allowed  อ็อบเจกต์ที่มี "ค่าที่อนุญาต" เป็น key เช่น POST_STATUS_LABEL
 * @param key      ชื่อ parameter ใน URL (ปกติคือ 'status')
 * @returns        ค่าที่ตรวจแล้ว หรือ '' ถ้าไม่มี/ไม่ถูกต้อง
 */
export function readStatusParam<T extends string>(
  params: URLSearchParams,
  allowed: Record<T, unknown>,
  key = 'status'
): T | '' {
  const value = params.get(key);
  if (value === null) return '';
  // hasOwnProperty ผ่าน Object.prototype กัน key แปลก ๆ อย่าง 'constructor'
  return Object.prototype.hasOwnProperty.call(allowed, value) ? (value as T) : '';
}

/** วันที่ของสองเวลานี้ตรงกันไหม (เทียบตามปฏิทินเครื่อง ไม่ใช่เวลา) */
export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

/**
 * ค่าเวลาที่ได้จาก MySQL ('2026-08-24 09:30:00') เป็นของวันนี้หรือเปล่า
 *
 * ต้องแปลง ' ' เป็น 'T' ก่อน เพราะ new Date() ของบางเบราว์เซอร์
 * อ่านรูปแบบที่มีเว้นวรรคไม่ออก แล้วคืน Invalid Date ออกมาเงียบ ๆ
 */
export function isToday(value: string | Date | null | undefined): boolean {
  if (value === null || value === undefined) return false;
  const date = value instanceof Date ? value : new Date(value.replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return false;
  return isSameDay(date, new Date());
}
