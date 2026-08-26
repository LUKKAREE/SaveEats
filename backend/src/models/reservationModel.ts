/**
 * reservationModel - การจองอาหาร (หัวใจของระบบ)
 */
import type { PoolConnection, ResultSetHeader } from 'mysql2/promise';
import type { Reservation, ReservationStatus } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

/**
 * ข้อมูลการจองแบบ JOIN แล้ว (ยังไม่มี qr_payload)
 * service จะเติม qr_payload ให้ทีหลัง แล้วได้เป็น ReservationDetail ใน shared
 */
export interface ReservationRow extends Reservation {
  food_name: string;
  image: string | null;
  normal_price: number;
  store_name: string;
  store_image: string | null;
  store_address: string | null;
  store_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  customer_name: string;
  customer_phone: string | null;
  has_review: number;
}

const DETAIL_SELECT = `
  SELECT r.*,
         f.name AS food_name, COALESCE(p.image, f.image) AS image,
         f.normal_price,
         s.store_name,
         -- ต้องตั้งชื่อใหม่เป็น store_image เพราะชื่อ image ถูก COALESCE ด้านบนใช้ไปแล้ว
         -- (อันนั้นคือรูปอาหาร อยู่คนละโฟลเดอร์กับรูปหน้าร้าน)
         s.image AS store_image,
         s.address AS store_address, s.phone AS store_phone,
         s.latitude, s.longitude,
         u.name AS customer_name, u.phone AS customer_phone,
         (SELECT COUNT(*) FROM reviews rv WHERE rv.reservation_id = r.reservation_id) AS has_review
    FROM reservations r
    JOIN posts  p ON p.post_id  = r.post_id
    JOIN foods  f ON f.food_id  = r.food_id
    JOIN stores s ON s.store_id = r.store_id
    JOIN users  u ON u.user_id  = r.customer_id
`;

export interface CreateReservationInput {
  customerId: number;
  storeId: number;
  postId: number;
  foodId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  qrToken: string;
  reservationCode: string;
  pickupStart: string;
  pickupEnd: string;
  expiresAt: string;
}

export interface ListReservationOptions {
  status?: ReservationStatus | '';
  page?: number;
  limit?: number;
}

/** แถวที่ใช้ตอนไล่ปิดการจองที่หมดอายุ */
export interface ExpiredReservationRow {
  reservation_id: number;
  post_id: number;
  quantity: number;
  customer_id: number;
}

export const reservationModel = {
  DETAIL_SELECT,

  /** สร้างการจอง - ต้องเรียกภายใน transaction เท่านั้น */
  async createInTransaction(conn: PoolConnection, d: CreateReservationInput): Promise<number> {
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO reservations
         (customer_id, store_id, post_id, food_id, quantity, unit_price, total_price,
          qr_token, reservation_code, status, pickup_start, pickup_end, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)`,
      [
        d.customerId, d.storeId, d.postId, d.foodId, d.quantity,
        d.unitPrice, d.totalPrice, d.qrToken, d.reservationCode,
        d.pickupStart, d.pickupEnd, d.expiresAt,
      ]
    );
    return result.insertId;
  },

  async findById(reservationId: number): Promise<ReservationRow | null> {
    const rows = await query<ReservationRow>(
      `${DETAIL_SELECT} WHERE r.reservation_id = ? LIMIT 1`,
      [reservationId]
    );
    return rows[0] ?? null;
  },

  /** ค้นจาก token ที่อ่านได้จาก QR Code */
  async findByQrToken(qrToken: string): Promise<ReservationRow | null> {
    const rows = await query<ReservationRow>(
      `${DETAIL_SELECT} WHERE r.qr_token = ? LIMIT 1`,
      [qrToken]
    );
    return rows[0] ?? null;
  },

  /**
   * ค้นจากรหัส 4 หลัก - ต้องระบุ store_id ด้วยเสมอ
   * เพราะรหัส 4 หลักซ้ำกันได้ระหว่างร้าน และเอาเฉพาะที่ยังไม่ถูกรับ
   */
  async findByCode(storeId: number, code: string): Promise<ReservationRow | null> {
    const rows = await query<ReservationRow>(
      `${DETAIL_SELECT}
        WHERE r.store_id = ? AND r.reservation_code = ?
          AND r.status IN ('confirmed','waiting')
        ORDER BY r.created_at DESC LIMIT 1`,
      [storeId, code]
    );
    return rows[0] ?? null;
  },

  /** ประวัติการจองของลูกค้า */
  async listByCustomer(
    customerId: number,
    { status = '', page = 1, limit = 20 }: ListReservationOptions
  ): Promise<{ items: ReservationRow[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<ReservationRow>(
      `${DETAIL_SELECT}
        WHERE r.customer_id = ? AND (? = '' OR r.status = ?)
        ORDER BY r.created_at DESC ${pg.sql}`,
      [customerId, status, status]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total FROM reservations
        WHERE customer_id = ? AND (? = '' OR status = ?)`,
      [customerId, status, status]
    );
    return { items, total };
  },

  /** รายการจองที่เข้ามาที่ร้าน */
  async listByStore(
    storeId: number,
    { status = '', page = 1, limit = 20 }: ListReservationOptions
  ): Promise<{ items: ReservationRow[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<ReservationRow>(
      `${DETAIL_SELECT}
        WHERE r.store_id = ? AND (? = '' OR r.status = ?)
        ORDER BY r.created_at DESC ${pg.sql}`,
      [storeId, status, status]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total FROM reservations
        WHERE store_id = ? AND (? = '' OR status = ?)`,
      [storeId, status, status]
    );
    return { items, total };
  },

  /** รายการจองทั้งหมด สำหรับหน้า Admin */
  async listAllForAdmin({
    status = '', storeId = null, page = 1, limit = 20,
  }: ListReservationOptions & { storeId?: number | null }): Promise<{ items: ReservationRow[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<ReservationRow>(
      `${DETAIL_SELECT}
        WHERE (? = '' OR r.status = ?)
          AND (? IS NULL OR r.store_id = ?)
        ORDER BY r.created_at DESC ${pg.sql}`,
      [status, status, storeId, storeId]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total FROM reservations
        WHERE (? = '' OR status = ?) AND (? IS NULL OR store_id = ?)`,
      [status, status, storeId, storeId]
    );
    return { items, total };
  },

  /**
   * ปิดการจอง (expired / cancelled / completed) เฉพาะเมื่อมันยังเปิดอยู่จริง
   *
   * *** ทำไมต้องมีตัวนี้ ทั้งที่มี setStatus อยู่แล้ว ***
   * ทุกครั้งที่ปิดการจองด้วยเหตุ "หมดอายุ" หรือ "ยกเลิก" ต้องคืนของกลับเข้าโพสต์ด้วย
   * ปัญหาคือมีสองที่ที่ปิดได้พร้อมกัน คือร้านกดสแกน กับงานเบื้องหลังที่วิ่งทุก 5 นาที
   * ถ้าต่างคนต่างอ่านแล้วต่างคืน ของจะถูกคืนซ้ำสองรอบ ร้านจะเห็นของงอกเกินจริง
   *
   * ตัวนี้ยัดเงื่อนไขไว้ใน WHERE ให้ฐานข้อมูลเป็นคนตัดสินว่าใครได้ปิด
   * คนที่ได้ affectedRows = 1 เท่านั้นจึงมีสิทธิ์คืนของ อีกคนได้ 0 แล้วไม่ต้องทำอะไรต่อ
   *
   * @returns true = เราเป็นคนปิดสำเร็จ (ต้องคืนของต่อ) / false = มีคนปิดไปก่อนแล้ว
   */
  async closeIfOpen(reservationId: number, status: ReservationStatus): Promise<boolean> {
    const result = await execute(
      `UPDATE reservations
          SET status = ?,
              completed_at = IF(? = 'completed', NOW(), completed_at),
              cancelled_at = IF(? = 'cancelled', NOW(), cancelled_at)
        WHERE reservation_id = ? AND status IN ('confirmed','waiting')`,
      [status, status, status, reservationId]
    );
    return result.affectedRows === 1;
  },

  async setStatus(reservationId: number, status: ReservationStatus): Promise<ReservationRow | null> {
    await execute(
      `UPDATE reservations
          SET status = ?,
              completed_at = IF(? = 'completed', NOW(), completed_at),
              cancelled_at = IF(? = 'cancelled', NOW(), cancelled_at)
        WHERE reservation_id = ?`,
      [status, status, status, reservationId]
    );
    return reservationModel.findById(reservationId);
  },

  /** ลูกค้าคนนี้จองโพสต์นี้ไปแล้วกี่ชิ้น (ใช้จำกัดจำนวนต่อคน) */
  async countActiveByCustomerAndPost(customerId: number, postId: number): Promise<number> {
    return countOf(
      `SELECT IFNULL(SUM(quantity), 0) AS total
         FROM reservations
        WHERE customer_id = ? AND post_id = ? AND status IN ('confirmed','waiting')`,
      [customerId, postId]
    );
  },

  /**
   * โพสต์นี้มีการจองผูกอยู่กี่รายการ (นับทุกสถานะ)
   *
   * ใช้ก่อนลบโพสต์ ดูเหตุผลเต็ม ๆ ที่ postController.remove
   * ต้องนับ "ทุกสถานะ" ไม่ใช่เฉพาะที่ยังไม่จบ เพราะรายการที่จบไปแล้ว
   * คือประวัติการขายที่ต้องเก็บไว้ ไม่ใช่ของที่ทิ้งได้
   */
  async countByPost(postId: number): Promise<number> {
    return countOf('SELECT COUNT(*) AS total FROM reservations WHERE post_id = ?', [postId]);
  },

  /** หาการจองที่เลยเวลาแล้วแต่ยังไม่ถูกปิด (ข้อค้าง 6) */
  async findExpiredPending(): Promise<ExpiredReservationRow[]> {
    return query<ExpiredReservationRow>(
      `SELECT reservation_id, post_id, quantity, customer_id
         FROM reservations
        WHERE status IN ('confirmed','waiting') AND expires_at < NOW()`
    );
  },

  async countAll(): Promise<number> {
    return countOf('SELECT COUNT(*) AS total FROM reservations');
  },

  async countToday(): Promise<number> {
    return countOf('SELECT COUNT(*) AS total FROM reservations WHERE DATE(created_at) = CURDATE()');
  },

  /**
   * จำนวนการจองแยกตามสถานะ ใช้วาดกราฟวงกลมในหน้าแดชบอร์ด
   *
   * คืนเฉพาะสถานะที่มีข้อมูลจริง สถานะที่ยังไม่เคยเกิดจะไม่มีในผลลัพธ์
   * ฝั่งที่เรียกต้องเติม 0 ให้เองถ้าต้องการครบทุกสถานะ
   */
  async countByStatus(): Promise<{ status: ReservationStatus; total: number }[]> {
    return query<{ status: ReservationStatus; total: number }>(
      `SELECT status, COUNT(*) AS total
         FROM reservations
        GROUP BY status`
    );
  },

  /**
   * จำนวนการจองรายวันย้อนหลัง N วัน (รวมวันนี้)
   *
   * *** วันที่ไม่มีการจองเลย จะไม่มีแถวออกมาจาก SQL ***
   * ถ้าเอาผลลัพธ์ไปวาดกราฟตรง ๆ แกนวันจะกระโดดข้ามวันที่ยอดเป็น 0
   * ทำให้กราฟโกหกสายตา ฝั่งที่เรียกจึงต้องเติมวันที่ขาดหายให้ครบเอง
   */
  async countByDay(days: number): Promise<{ day: string; total: number }[]> {
    return query<{ day: string; total: number }>(
      `SELECT DATE(created_at) AS day, COUNT(*) AS total
         FROM reservations
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY day`,
      [days - 1]
    );
  },

};

export default reservationModel;
