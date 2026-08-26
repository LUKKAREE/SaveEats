/**
 * storeModel - คุยกับตาราง stores
 */
import type { Store, StoreForAdmin, StoreStatus, StoreSummary } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';
import type { BoundingBox } from '../utils/geo';

export interface CreateStoreInput {
  userId: number;
  storeName: string;
  description?: string | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  latitude?: number | undefined;
  longitude?: number | undefined;
  openTime?: string | undefined;
  closeTime?: string | undefined;
}

export type UpdateStoreInput = Partial<Omit<CreateStoreInput, 'userId'>> & {
  image?: string | undefined;
};

/**
 * ร้านแบบย่อ
 *
 * *** ย้ายไปประกาศที่ shared/src/entities.ts แล้ว (กฎเหล็กข้อ 5) ***
 * ที่นี่แค่ re-export ต่อ เพื่อให้โค้ดเดิมที่ import จากไฟล์นี้ยังใช้ได้เหมือนเดิม
 * และเพื่อให้ Backend กับแอปมือถือมองเห็นหน้าตาข้อมูลชุดเดียวกันเป๊ะ ๆ
 */
export type { StoreSummary } from '@shared/index';

export const storeModel = {
  async create(input: CreateStoreInput): Promise<number> {
    const result = await execute(
      `INSERT INTO stores
         (user_id, store_name, description, address, phone, latitude, longitude,
          open_time, close_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        input.userId, input.storeName, input.description ?? null, input.address ?? null,
        input.phone ?? null, input.latitude ?? null, input.longitude ?? null,
        input.openTime ?? null, input.closeTime ?? null,
      ]
    );
    // ทุกร้านต้องมีแถวคะแนนความประพฤติเสมอ เริ่มที่ 100
    await execute('INSERT INTO behavior_scores (store_id, score) VALUES (?, 100)', [result.insertId]);
    return result.insertId;
  },

  async findById(storeId: number): Promise<Store | null> {
    const rows = await query<Store>('SELECT * FROM stores WHERE store_id = ? LIMIT 1', [storeId]);
    return rows[0] ?? null;
  },

  /** หาร้านจาก user_id ของเจ้าของ (ใช้ตอน seller เปิดแอป) */
  async findByUserId(userId: number): Promise<Store | null> {
    const rows = await query<Store>('SELECT * FROM stores WHERE user_id = ? LIMIT 1', [userId]);
    return rows[0] ?? null;
  },

  async update(storeId: number, fields: UpdateStoreInput): Promise<Store | null> {
    await execute(
      `UPDATE stores
          SET store_name  = COALESCE(?, store_name),
              description = COALESCE(?, description),
              address     = COALESCE(?, address),
              phone       = COALESCE(?, phone),
              latitude    = COALESCE(?, latitude),
              longitude   = COALESCE(?, longitude),
              open_time   = COALESCE(?, open_time),
              close_time  = COALESCE(?, close_time),
              image       = COALESCE(?, image)
        WHERE store_id = ?`,
      [
        fields.storeName ?? null, fields.description ?? null, fields.address ?? null,
        fields.phone ?? null, fields.latitude ?? null, fields.longitude ?? null,
        fields.openTime ?? null, fields.closeTime ?? null, fields.image ?? null,
        storeId,
      ]
    );
    return storeModel.findById(storeId);
  },

  /** รายการร้านที่อนุมัติแล้ว (สำหรับลูกค้า) */
  async listApproved({
    search = '', page = 1, limit = 20,
  }: { search?: string; page?: number; limit?: number }): Promise<{ items: StoreSummary[]; total: number }> {
    const pg = paginate(page, limit);
    const like = `%${search}%`;

    const items = await query<StoreSummary>(
      `SELECT store_id, store_name, description, image, address, latitude, longitude,
              open_time, close_time, rating, review_count
         FROM stores
        WHERE status = 'approved' AND (? = '' OR store_name LIKE ?)
        ORDER BY rating DESC, review_count DESC
        ${pg.sql}`,
      [search, like]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total FROM stores
        WHERE status = 'approved' AND (? = '' OR store_name LIKE ?)`,
      [search, like]
    );
    return { items, total };
  },

  /**
   * ร้านที่อยู่ในกรอบสี่เหลี่ยมรอบตำแหน่งลูกค้า
   * เป็นการกรองหยาบ ๆ ด้วย SQL ก่อน (เร็วเพราะใช้ index)
   * แล้ว service จะเอาไปกรองละเอียดด้วยสูตร Haversine อีกที
   */
  async findInBoundingBox(box: BoundingBox): Promise<StoreSummary[]> {
    return query<StoreSummary>(
      `SELECT store_id, store_name, description, image, address,
              latitude, longitude, rating, review_count
         FROM stores
        WHERE status = 'approved'
          AND latitude  BETWEEN ? AND ?
          AND longitude BETWEEN ? AND ?`,
      [box.minLat, box.maxLat, box.minLng, box.maxLng]
    );
  },

  /** รายการร้านสำหรับ Admin (กรองตามสถานะได้) */
  async listForAdmin({
    status = '', search = '', page = 1, limit = 20,
  }: {
    status?: StoreStatus | '';
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StoreForAdmin[]; total: number }> {
    const pg = paginate(page, limit);
    const like = `%${search}%`;

    const items = await query<StoreForAdmin>(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.phone AS owner_phone,
              b.score AS behavior_score, b.status AS behavior_status
         FROM stores s
         JOIN users u ON u.user_id = s.user_id
    LEFT JOIN behavior_scores b ON b.store_id = s.store_id
        WHERE (? = '' OR s.status = ?)
          AND (? = '' OR s.store_name LIKE ? OR u.email LIKE ?)
        ORDER BY s.created_at DESC
        ${pg.sql}`,
      [status, status, search, like, like]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total
         FROM stores s JOIN users u ON u.user_id = s.user_id
        WHERE (? = '' OR s.status = ?)
          AND (? = '' OR s.store_name LIKE ? OR u.email LIKE ?)`,
      [status, status, search, like, like]
    );
    return { items, total };
  },

  async setStatus(
    storeId: number,
    status: StoreStatus,
    rejectReason: string | null = null
  ): Promise<Store | null> {
    await execute(
      `UPDATE stores
          SET status = ?,
              reject_reason = ?,
              approved_at = IF(? = 'approved', NOW(), approved_at)
        WHERE store_id = ?`,
      [status, rejectReason, status, storeId]
    );
    return storeModel.findById(storeId);
  },

  /** คำนวณคะแนนเฉลี่ยใหม่หลังมีรีวิวเข้ามา */
  async refreshRating(storeId: number): Promise<void> {
    await execute(
      `UPDATE stores s
          SET s.rating = IFNULL((SELECT AVG(rating) FROM reviews WHERE store_id = ?), 0),
              s.review_count = (SELECT COUNT(*) FROM reviews WHERE store_id = ?)
        WHERE s.store_id = ?`,
      [storeId, storeId, storeId]
    );
  },

  async countByStatus(status: StoreStatus): Promise<number> {
    return countOf('SELECT COUNT(*) AS total FROM stores WHERE status = ?', [status]);
  },
};

export default storeModel;
