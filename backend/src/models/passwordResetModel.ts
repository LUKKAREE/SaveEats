/**
 * passwordResetModel - คุยกับตาราง password_resets
 *
 * เก็บคำขอ "ลืมรหัสผ่าน" ที่ผู้ใช้กดมาจากแอป
 *
 * *** ในฐานข้อมูลเก็บแค่ค่า hash ***
 * ทั้ง token และรหัส 6 หลัก ตัวจริงมีอยู่ที่เดียวคือในมือผู้ใช้
 * หลักการเดียวกับรหัสผ่าน ถ้าฐานข้อมูลหลุด คนที่ได้ไฟล์ไปก็ตั้งรหัสใหม่ไม่ได้
 *
 * 1 คำขอ = 1 แถว มีกุญแจ 2 ดอกที่เปิดได้เหมือนกัน
 *   token_hash - ลิงก์ยาวในอีเมล เปิดในเบราว์เซอร์
 *   code_hash  - รหัส 6 หลัก กรอกในแอปได้เลย
 * ใช้ดอกไหนไปแล้ว แถวถูกปั๊ม used_at อีกดอกจึงใช้ไม่ได้ตามไปด้วย
 */
import { query, execute } from '../config/db';

/** กรอกรหัสผิดได้กี่ครั้งต่อ 1 คำขอ ก่อนต้องขอรหัสใหม่ */
export const MAX_CODE_ATTEMPTS = 5;

export interface PasswordResetRow {
  reset_id: number;
  user_id: number;
  token_hash: string;
  code_hash: string | null;
  attempts: number;
  expires_at: string;
  used_at: string | null;
  created_at: string;
}

export const passwordResetModel = {
  /**
   * สร้างคำขอใหม่
   * @param minutes อายุของคำขอ นับเป็นนาที
   */
  async create(
    userId: number,
    tokenHash: string,
    codeHash: string,
    minutes: number
  ): Promise<void> {
    await execute(
      `INSERT INTO password_resets (user_id, token_hash, code_hash, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [userId, tokenHash, codeHash, minutes]
    );
  },

  /**
   * หาคำขอที่ยังใช้ได้อยู่ จาก token ในลิงก์อีเมล
   * เงื่อนไข : ยังไม่เคยถูกใช้ และยังไม่หมดอายุ
   */
  async findUsable(tokenHash: string): Promise<PasswordResetRow | null> {
    const rows = await query<PasswordResetRow>(
      `SELECT * FROM password_resets
        WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
        LIMIT 1`,
      [tokenHash]
    );
    return rows[0] ?? null;
  },

  /**
   * คำขอล่าสุดของผู้ใช้คนนี้ที่ยังใช้ได้อยู่
   *
   * *** ดึงทั้งแถวมาก่อน แล้วค่อยเทียบรหัสในโค้ด ***
   * ไม่ใส่ code_hash ลงใน WHERE เพราะถ้าใส่แล้วรหัสผิด จะได้ผลลัพธ์ว่าง
   * แยกไม่ออกว่า "รหัสผิด" หรือ "ไม่เคยขอไว้เลย" ทำให้นับจำนวนครั้งที่ผิดไม่ได้
   */
  async findLatestUsableFor(userId: number): Promise<PasswordResetRow | null> {
    const rows = await query<PasswordResetRow>(
      `SELECT * FROM password_resets
        WHERE user_id = ? AND used_at IS NULL AND expires_at > NOW()
        ORDER BY reset_id DESC
        LIMIT 1`,
      [userId]
    );
    return rows[0] ?? null;
  },

  /** บวกจำนวนครั้งที่กรอกรหัสผิด */
  async bumpAttempts(resetId: number): Promise<void> {
    await execute(
      'UPDATE password_resets SET attempts = attempts + 1 WHERE reset_id = ?',
      [resetId]
    );
  },

  /** ปั๊มว่าใช้แล้ว เพื่อไม่ให้คำขอเดิมใช้ซ้ำได้ */
  async markUsed(resetId: number): Promise<void> {
    await execute('UPDATE password_resets SET used_at = NOW() WHERE reset_id = ?', [resetId]);
  },

  /**
   * ยกเลิกคำขอเก่าทั้งหมดของผู้ใช้คนนี้
   *
   * เรียกก่อนสร้างคำขอใหม่เสมอ เพื่อให้เหลือใบที่ใช้ได้แค่ใบล่าสุดใบเดียว
   * ถ้าผู้ใช้กดขอหลายรอบ รหัสเก่าจะใช้ไม่ได้ทันที
   */
  async invalidateAllFor(userId: number): Promise<void> {
    await execute(
      'UPDATE password_resets SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [userId]
    );
  },
};

export default passwordResetModel;
