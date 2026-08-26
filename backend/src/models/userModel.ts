/**
 * userModel - คุยกับตาราง users
 *
 * *** models = ที่เดียวที่เขียน SQL ได้ ***
 * controller และ service ห้ามเขียน SQL เอง ให้เรียกผ่านไฟล์แบบนี้เท่านั้น
 *
 * ชนิดข้อมูล User / UserWithPassword มาจาก shared/src/entities.ts
 * ซึ่งมีชื่อ field ตรงกับคอลัมน์ใน database/schema.sql เป๊ะ (กฎเหล็กข้อ 5)
 */
import type { User, UserWithPassword, UserRole } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

/** คอลัมน์ที่ปลอดภัยส่งออกไปให้ client (ไม่มี password) */
export const PUBLIC_FIELDS =
  'user_id, name, email, phone, role, avatar, is_active, created_at, updated_at';

export interface CreateUserInput {
  name: string;
  email: string;
  phone?: string | undefined;
  passwordHash: string;
  role: UserRole;
}

export interface UpdateProfileInput {
  name?: string | undefined;
  phone?: string | undefined;
  avatar?: string | undefined;
}

export interface ListUsersOptions {
  search?: string;
  page?: number;
  limit?: number;
}

export const userModel = {
  /** ค้นหาผู้ใช้จากอีเมล (มี password ติดมาด้วย ใช้เฉพาะตอน login) */
  async findByEmail(email: string): Promise<UserWithPassword | null> {
    const rows = await query<UserWithPassword>(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    return rows[0] ?? null;
  },

  /** ค้นหาผู้ใช้จาก id (ไม่มี password) */
  async findById(userId: number): Promise<User | null> {
    const rows = await query<User>(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE user_id = ? LIMIT 1`,
      [userId]
    );
    return rows[0] ?? null;
  },

  /** สร้างผู้ใช้ใหม่ คืน user_id ที่เพิ่งสร้าง */
  async create({ name, email, phone, passwordHash, role }: CreateUserInput): Promise<number> {
    const result = await execute(
      'INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone ?? null, passwordHash, role]
    );
    return result.insertId;
  },

  /**
   * ค้นหาผู้ใช้จาก "อีเมลหรือเบอร์โทร"
   *
   * หน้า Login ให้กรอกช่องเดียวได้ทั้งสองแบบ จึงต้องหาทีเดียวทั้งสองคอลัมน์
   * เบอร์โทรตั้ง UNIQUE ไว้ในฐานข้อมูลแล้ว จึงไม่มีทางเจอมากกว่า 1 คน
   */
  async findByEmailOrPhone(identifier: string): Promise<UserWithPassword | null> {
    const rows = await query<UserWithPassword>(
      'SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1',
      [identifier, identifier]
    );
    return rows[0] ?? null;
  },

  /** แก้ไขข้อมูลส่วนตัว (COALESCE = ถ้าส่ง null มาให้คงค่าเดิมไว้) */
  async updateProfile(userId: number, fields: UpdateProfileInput): Promise<User | null> {
    await execute(
      `UPDATE users
          SET name   = COALESCE(?, name),
              phone  = COALESCE(?, phone),
              avatar = COALESCE(?, avatar)
        WHERE user_id = ?`,
      [fields.name ?? null, fields.phone ?? null, fields.avatar ?? null, userId]
    );
    return userModel.findById(userId);
  },

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await execute('UPDATE users SET password = ? WHERE user_id = ?', [passwordHash, userId]);
  },

  /** รายชื่อผู้ใช้ตาม role สำหรับหน้า Admin (มีค้นหาและแบ่งหน้า) */
  async listByRole(
    role: UserRole,
    { search = '', page = 1, limit = 20 }: ListUsersOptions = {}
  ): Promise<{ items: User[]; total: number }> {
    const pg = paginate(page, limit);
    const like = `%${search}%`;

    const items = await query<User>(
      `SELECT ${PUBLIC_FIELDS}
         FROM users
        WHERE role = ? AND (? = '' OR name LIKE ? OR email LIKE ?)
        ORDER BY created_at DESC
        ${pg.sql}`,
      [role, search, like, like]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total
         FROM users
        WHERE role = ? AND (? = '' OR name LIKE ? OR email LIKE ?)`,
      [role, search, like, like]
    );
    return { items, total };
  },

  async setActive(userId: number, isActive: boolean): Promise<void> {
    await execute('UPDATE users SET is_active = ? WHERE user_id = ?', [isActive ? 1 : 0, userId]);
  },

  async countByRole(role: UserRole): Promise<number> {
    return countOf('SELECT COUNT(*) AS total FROM users WHERE role = ?', [role]);
  },
};

export default userModel;
