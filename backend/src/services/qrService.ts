/**
 * qrService - จัดการ QR Code ของการจอง
 *
 * *** กฎเหล็กข้อ 4 : QR ต้องผ่าน Backend ทุกครั้ง ***
 *
 * แนวคิดที่ใช้
 *   - Backend สร้าง qr_token (ข้อความสุ่ม 32 ตัว) เก็บลงฐานข้อมูล
 *   - ส่ง token กลับไปให้แอปลูกค้าเอาไป "วาด" เป็นรูป QR เอง
 *     (แอปใช้ react-native-qrcode-svg วาด ไม่ต้องให้ Backend ส่งรูปมา)
 *   - ตอนร้านสแกน จะอ่านได้ token กลับมา แล้วยิงมาถาม Backend ว่าใช้ได้ไหม
 *
 * ทำไมต้องเป็นแบบนี้
 *   ถ้าฝัง reservation_id ตรง ๆ (1, 2, 3, ...) ใครก็สร้าง QR ปลอมได้
 *   และถ้าให้แอปตัดสินเองว่า QR ถูกต้อง จะโดนใช้ QR ซ้ำได้
 */
import { generateQrToken, generateReservationCode } from '../utils/generator';

const QR_PREFIX = 'SAVEEATS:';

export interface ReservationSecrets {
  qrToken: string;
  reservationCode: string;
}

export const qrService = {
  /** สร้างข้อมูลลับของการจอง 1 รายการ */
  createSecrets(): ReservationSecrets {
    return {
      qrToken: generateQrToken(),
      reservationCode: generateReservationCode(),
    };
  },

  /**
   * ข้อความที่จะให้แอปเอาไปวาดเป็น QR
   * ใส่ prefix ไว้เพื่อกันการสแกน QR อื่นที่ไม่ใช่ของ SaveEats
   */
  buildQrPayload(qrToken: string): string {
    return `${QR_PREFIX}${qrToken}`;
  },

  /**
   * แกะ token ออกจากข้อความที่สแกนได้
   * รองรับทั้งแบบมี prefix และไม่มี (เผื่อร้านกรอกมือ)
   * @returns token หรือ null ถ้าไม่ใช่รูปแบบของ SaveEats
   */
  parseQrPayload(scanned: string | undefined): string | null {
    if (!scanned) return null;
    const value = scanned.trim();
    if (value.startsWith(QR_PREFIX)) return value.slice(QR_PREFIX.length);
    if (/^[a-f0-9]{32}$/i.test(value)) return value;
    return null;
  },
};

export default qrService;
