/**
 * favoriteModel - คุยกับตาราง favorites (ร้านโปรดของลูกค้า)
 *
 * 1 แถว = ลูกค้า 1 คน ชอบร้าน 1 ร้าน
 * ตาราง UNIQUE (user_id, store_id) ไว้แล้ว กดหัวใจซ้ำจึงไม่เกิดแถวซ้ำ
 */
import type { StoreSummary } from '@shared/index';
import { query, execute, countOf } from '../config/db';

/** คอลัมน์ของร้านที่ส่งกลับไปให้แอป (ชุดเดียวกับที่หน้าร้านใกล้เคียงใช้) */
const STORE_FIELDS = `
  s.store_id, s.store_name, s.description, s.image, s.address,
  s.latitude, s.longitude, s.rating, s.review_count,
  s.open_time, s.close_time
`;

export const favoriteModel = {
  /**
   * เพิ่มร้านโปรด
   *
   * ใช้ INSERT IGNORE เพราะถ้ากดหัวใจรัว ๆ สองครั้งติดกัน
   * คำสั่งที่สองจะชนกับ UNIQUE แล้วโยน error ออกมา
   * ซึ่งไม่ใช่ความผิดของผู้ใช้ ผลลัพธ์ที่เขาต้องการก็คือ "ร้านนี้อยู่ในรายการโปรด" อยู่ดี
   */
  async add(userId: number, storeId: number): Promise<void> {
    await execute(
      'INSERT IGNORE INTO favorites (user_id, store_id) VALUES (?, ?)',
      [userId, storeId]
    );
  },

  /** เอาร้านออกจากรายการโปรด (ถ้าไม่มีอยู่แล้วก็ไม่เป็นไร) */
  async remove(userId: number, storeId: number): Promise<void> {
    await execute(
      'DELETE FROM favorites WHERE user_id = ? AND store_id = ?',
      [userId, storeId]
    );
  },

  /** ร้านนี้อยู่ในรายการโปรดของคนนี้หรือยัง */
  async exists(userId: number, storeId: number): Promise<boolean> {
    const total = await countOf(
      'SELECT COUNT(*) AS total FROM favorites WHERE user_id = ? AND store_id = ?',
      [userId, storeId]
    );
    return total > 0;
  },

  /**
   * รายการร้านโปรดทั้งหมดของลูกค้าคนหนึ่ง
   *
   * เรียงจากที่กดหัวใจล่าสุดขึ้นก่อน เพราะร้านที่เพิ่งกดมักคือร้านที่กำลังสนใจ
   * กรองเฉพาะร้านที่ยัง approved อยู่ ร้านที่ถูกระงับไม่ควรโผล่ให้กดเข้าไปเจอหน้าเปล่า
   */
  async listByUser(userId: number): Promise<StoreSummary[]> {
    return query<StoreSummary>(
      `SELECT ${STORE_FIELDS}
         FROM favorites f
         JOIN stores s ON s.store_id = f.store_id
        WHERE f.user_id = ? AND s.status = 'approved'
        ORDER BY f.created_at DESC`,
      [userId]
    );
  },

  /**
   * คืนเฉพาะเลขร้านที่ลูกค้ากดหัวใจไว้
   *
   * ใช้ตอนแอปโหลดรายการร้านหลายร้านพร้อมกัน แล้วอยากรู้ว่าอันไหนควรเป็นหัวใจแดง
   * ดึงทีเดียวจบ ดีกว่ายิงถามทีละร้าน
   */
  async listStoreIds(userId: number): Promise<number[]> {
    const rows = await query<{ store_id: number }>(
      'SELECT store_id FROM favorites WHERE user_id = ?',
      [userId]
    );
    return rows.map((r) => r.store_id);
  },
};

export default favoriteModel;
