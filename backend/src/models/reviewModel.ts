/**
 * reviewModel - รีวิวและให้ดาว
 * 1 การจอง เขียนรีวิวได้ครั้งเดียว (บังคับด้วย UNIQUE ที่ระดับฐานข้อมูล)
 */
import type { Review, RatingBreakdown } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

export interface CreateReviewInput {
  customerId: number;
  storeId: number;
  reservationId: number;
  rating: number;
  comment?: string | undefined;
}

interface RatingCountRow {
  rating: number;
  count: number;
}

export const reviewModel = {
  async create(input: CreateReviewInput): Promise<number> {
    const result = await execute(
      `INSERT INTO reviews (customer_id, store_id, reservation_id, rating, comment)
       VALUES (?, ?, ?, ?, ?)`,
      [input.customerId, input.storeId, input.reservationId, input.rating, input.comment ?? null]
    );
    return result.insertId;
  },

  async findById(reviewId: number): Promise<Review | null> {
    const rows = await query<Review>(
      `SELECT rv.*, u.name AS customer_name, u.avatar AS customer_avatar, s.store_name
         FROM reviews rv
         JOIN users u ON u.user_id = rv.customer_id
         JOIN stores s ON s.store_id = rv.store_id
        WHERE rv.review_id = ? LIMIT 1`,
      [reviewId]
    );
    return rows[0] ?? null;
  },

  async findByReservation(reservationId: number): Promise<Review | null> {
    const rows = await query<Review>(
      'SELECT * FROM reviews WHERE reservation_id = ? LIMIT 1',
      [reservationId]
    );
    return rows[0] ?? null;
  },

  async listByStore(
    storeId: number,
    { page = 1, limit = 20 }: { page?: number; limit?: number }
  ): Promise<{ items: Review[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<Review>(
      `SELECT rv.review_id, rv.customer_id, rv.store_id, rv.reservation_id,
              rv.rating, rv.comment, rv.created_at,
              u.name AS customer_name, u.avatar AS customer_avatar
         FROM reviews rv
         JOIN users u ON u.user_id = rv.customer_id
        WHERE rv.store_id = ?
        ORDER BY rv.created_at DESC ${pg.sql}`,
      [storeId]
    );
    const total = await countOf('SELECT COUNT(*) AS total FROM reviews WHERE store_id = ?', [storeId]);
    return { items, total };
  },

  async listByCustomer(customerId: number): Promise<Review[]> {
    return query<Review>(
      `SELECT rv.*, s.store_name, s.image AS store_image
         FROM reviews rv JOIN stores s ON s.store_id = rv.store_id
        WHERE rv.customer_id = ? ORDER BY rv.created_at DESC`,
      [customerId]
    );
  },

  /** สรุปจำนวนรีวิวแยกตามจำนวนดาว (ใช้ทำกราฟในหน้าร้าน) */
  async ratingBreakdown(storeId: number): Promise<RatingBreakdown> {
    const rows = await query<RatingCountRow>(
      'SELECT rating, COUNT(*) AS count FROM reviews WHERE store_id = ? GROUP BY rating',
      [storeId]
    );
    const result: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const row of rows) {
      const star = row.rating as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) result[star] = Number(row.count);
    }
    return result;
  },

  async listAllForAdmin({
    page = 1, limit = 20,
  }: { page?: number; limit?: number }): Promise<{ items: Review[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<Review>(
      `SELECT rv.*, u.name AS customer_name, s.store_name
         FROM reviews rv
         JOIN users u ON u.user_id = rv.customer_id
         JOIN stores s ON s.store_id = rv.store_id
        ORDER BY rv.created_at DESC ${pg.sql}`
    );
    const total = await countOf('SELECT COUNT(*) AS total FROM reviews');
    return { items, total };
  },

  async remove(reviewId: number): Promise<void> {
    await execute('DELETE FROM reviews WHERE review_id = ?', [reviewId]);
  },
};

export default reviewModel;
