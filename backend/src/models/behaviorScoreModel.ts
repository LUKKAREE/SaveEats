/**
 * behaviorScoreModel - คะแนนความประพฤติของร้าน
 * กติกาการเพิ่ม/ลด อยู่ที่ services/behaviorScoreService.ts (ข้อค้าง 3)
 */
import type { BehaviorScore, BehaviorLog, BehaviorScoreForAdmin, BehaviorStatus } from '@shared/index';
import { query, execute, limitOnly } from '../config/db';

export const behaviorScoreModel = {
  async findByStore(storeId: number): Promise<BehaviorScore | null> {
    const rows = await query<BehaviorScore>(
      'SELECT * FROM behavior_scores WHERE store_id = ? LIMIT 1',
      [storeId]
    );
    return rows[0] ?? null;
  },

  /** สร้างแถวคะแนนถ้ายังไม่มี (กันกรณีร้านเก่าที่สร้างก่อนมีระบบนี้) */
  async ensureExists(storeId: number): Promise<void> {
    await execute('INSERT IGNORE INTO behavior_scores (store_id, score) VALUES (?, 100)', [storeId]);
  },

  /** ปรับคะแนน (บวกหรือลบ) แล้วบันทึกประวัติไว้ด้วยเสมอ */
  async applyChange(
    storeId: number,
    change: number,
    reason: string,
    newStatus?: BehaviorStatus
  ): Promise<BehaviorScore> {
    await behaviorScoreModel.ensureExists(storeId);
    await execute(
      `UPDATE behavior_scores
          SET score = GREATEST(0, LEAST(100, score + ?)),
              reason = ?,
              status = COALESCE(?, status)
        WHERE store_id = ?`,
      [change, reason, newStatus ?? null, storeId]
    );

    const row = await behaviorScoreModel.findByStore(storeId);
    const scoreAfter = row?.score ?? 100;

    await execute(
      'INSERT INTO behavior_logs (store_id, score_change, score_after, reason) VALUES (?, ?, ?, ?)',
      [storeId, change, scoreAfter, reason]
    );

    return row ?? { store_id: storeId, score: scoreAfter, status: 'good', reason, updated_at: '' };
  },

  async listLogs(storeId: number, { limit = 50 } = {}): Promise<BehaviorLog[]> {
    return query<BehaviorLog>(
      `SELECT * FROM behavior_logs WHERE store_id = ? ORDER BY created_at DESC ${limitOnly(limit)}`,
      [storeId]
    );
  },

  async listAllForAdmin(): Promise<BehaviorScoreForAdmin[]> {
    return query<BehaviorScoreForAdmin>(
      `SELECT b.*, s.store_name, s.status AS store_status
         FROM behavior_scores b
         JOIN stores s ON s.store_id = b.store_id
        ORDER BY b.score ASC`
    );
  },
};

export default behaviorScoreModel;
