/**
 * foodModel - คลังเมนูอาหารของร้าน
 *
 * *** สำคัญ : foods คือ "เมนูตั้งต้น" ยังไม่ใช่ของที่ประกาศขาย ***
 * ของที่ประกาศขายจริงอยู่ในตาราง posts (ทางเลือก A ตามที่ทีมตัดสินใจ)
 */
import type { Food } from '@shared/index';
import { query, execute } from '../config/db';

export interface CreateFoodInput {
  storeId: number;
  name: string;
  normalPrice: number;
  categoryId?: number | undefined;
  description?: string | undefined;
  image?: string | undefined;
}

export interface UpdateFoodInput {
  name?: string | undefined;
  normalPrice?: number | undefined;
  categoryId?: number | undefined;
  description?: string | undefined;
  image?: string | undefined;
  isActive?: boolean | undefined;
}

export const foodModel = {
  async create(input: CreateFoodInput): Promise<number> {
    const result = await execute(
      `INSERT INTO foods (store_id, category_id, name, description, normal_price, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.storeId, input.categoryId ?? null, input.name,
        input.description ?? null, input.normalPrice, input.image ?? null,
      ]
    );
    return result.insertId;
  },

  async findById(foodId: number): Promise<Food | null> {
    const rows = await query<Food>(
      `SELECT f.*, c.name AS category_name, c.slug AS category_slug
         FROM foods f
    LEFT JOIN categories c ON c.category_id = f.category_id
        WHERE f.food_id = ? LIMIT 1`,
      [foodId]
    );
    return rows[0] ?? null;
  },

  /** เมนูทั้งหมดของร้านหนึ่ง */
  async listByStore(storeId: number, { includeInactive = false } = {}): Promise<Food[]> {
    return query<Food>(
      `SELECT f.*, c.name AS category_name
         FROM foods f
    LEFT JOIN categories c ON c.category_id = f.category_id
        WHERE f.store_id = ? AND (? = 1 OR f.is_active = 1)
        ORDER BY f.created_at DESC`,
      [storeId, includeInactive ? 1 : 0]
    );
  },

  async update(foodId: number, fields: UpdateFoodInput): Promise<Food | null> {
    await execute(
      `UPDATE foods
          SET category_id  = COALESCE(?, category_id),
              name         = COALESCE(?, name),
              description  = COALESCE(?, description),
              normal_price = COALESCE(?, normal_price),
              image        = COALESCE(?, image),
              is_active    = COALESCE(?, is_active)
        WHERE food_id = ?`,
      [
        fields.categoryId ?? null, fields.name ?? null, fields.description ?? null,
        fields.normalPrice ?? null, fields.image ?? null,
        fields.isActive === undefined ? null : fields.isActive ? 1 : 0,
        foodId,
      ]
    );
    return foodModel.findById(foodId);
  },

  async remove(foodId: number): Promise<void> {
    await execute('DELETE FROM foods WHERE food_id = ?', [foodId]);
  },
};

export default foodModel;
