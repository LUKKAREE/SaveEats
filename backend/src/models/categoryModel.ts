/**
 * categoryModel - หมวดหมู่อาหาร (5 หมวด ตามข้อค้าง 7)
 */
import type { Category } from '@shared/index';
import { query } from '../config/db';

export const categoryModel = {
  async listAll(): Promise<Category[]> {
    return query<Category>(
      `SELECT category_id, name, slug, icon, sort_order
         FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC`
    );
  },

  async findById(categoryId: number): Promise<Category | null> {
    const rows = await query<Category>(
      'SELECT * FROM categories WHERE category_id = ? LIMIT 1',
      [categoryId]
    );
    return rows[0] ?? null;
  },
};

export default categoryModel;
