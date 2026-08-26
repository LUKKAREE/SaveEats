/**
 * behaviorScoreService - กติกาคะแนนความประพฤติของร้าน (ข้อค้าง 3)
 *
 * *** ค่าทั้งหมดในไฟล์นี้เป็นค่าเริ่มต้นที่ตั้งไว้ให้ก่อน ***
 * ทีมยังไม่ได้สรุปตัวเลขจริง ถ้าจะเปลี่ยน แก้ที่ RULES ข้างล่างที่เดียวพอ
 *
 * กติกาที่ตั้งไว้
 *   - ร้านเริ่มต้นที่ 100 คะแนน (สูงสุด 100 ต่ำสุด 0)
 *   - ร้านยกเลิกการจองของลูกค้า           -5
 *   - ลูกค้ามาถึงแล้วร้านไม่มีของให้      -10
 *   - ได้รีวิว 1-2 ดาว                    -2
 *   - ทำรายการสำเร็จ 1 ครั้ง               +1
 *   - ได้รีวิว 5 ดาว                       +1
 *
 * เกณฑ์สถานะ
 *   score >= 70  -> good       ขายได้ปกติ
 *   40 - 69      -> warning    ขายได้ แต่ Admin เห็นเป็นสีเหลืองในหน้าจัดการ
 *   < 40         -> suspended  ระงับร้านอัตโนมัติ ต้องให้ Admin ปลดล็อกเอง
 */
import type { BehaviorScore, BehaviorScoreWithLogs, BehaviorScoreForAdmin, BehaviorStatus } from '@shared/index';
import behaviorScoreModel from '../models/behaviorScoreModel';
import storeModel from '../models/storeModel';
import notificationService from './notificationService';

export const RULES = {
  START_SCORE: 100,
  SELLER_CANCEL: -5,
  NO_FOOD_ON_ARRIVAL: -10,
  BAD_REVIEW: -2,
  COMPLETED_PICKUP: 1,
  GREAT_REVIEW: 1,
} as const;

/** ชื่อของกติกา ใช้เป็น key ตอนเรียก applyRule */
export type BehaviorRuleKey = Exclude<keyof typeof RULES, 'START_SCORE'>;

export const THRESHOLD = {
  WARNING: 70,
  SUSPEND: 40,
} as const;

/** แปลงคะแนนเป็นสถานะ */
export function statusFromScore(score: number): BehaviorStatus {
  if (score < THRESHOLD.SUSPEND) return 'suspended';
  if (score < THRESHOLD.WARNING) return 'warning';
  return 'good';
}

export const behaviorScoreService = {
  RULES,
  THRESHOLD,
  statusFromScore,

  async getScore(storeId: number): Promise<BehaviorScoreWithLogs> {
    await behaviorScoreModel.ensureExists(storeId);
    const score = await behaviorScoreModel.findByStore(storeId);
    const logs = await behaviorScoreModel.listLogs(storeId, { limit: 20 });
    const base: BehaviorScore = score ?? {
      store_id: storeId,
      score: RULES.START_SCORE,
      status: 'good',
      reason: null,
      updated_at: '',
    };
    return { ...base, logs };
  },

  /**
   * ปรับคะแนนตามเหตุการณ์
   * @param ruleKey ชื่อกติกา เช่น 'SELLER_CANCEL' (TypeScript จะเตือนถ้าพิมพ์ผิด)
   * @param reason ข้อความอธิบายให้คนอ่านเข้าใจ
   */
  async applyRule(storeId: number, ruleKey: BehaviorRuleKey, reason: string): Promise<BehaviorScore> {
    const change: number = RULES[ruleKey];

    const current = await behaviorScoreModel.findByStore(storeId);
    const nextScore = Math.max(0, Math.min(100, (current?.score ?? RULES.START_SCORE) + change));
    const nextStatus = statusFromScore(nextScore);

    const updated = await behaviorScoreModel.applyChange(storeId, change, reason, nextStatus);

    // ตกต่ำกว่าเกณฑ์ -> ระงับร้านอัตโนมัติ
    if (nextStatus === 'suspended') {
      const store = await storeModel.findById(storeId);
      if (store && store.status === 'approved') {
        await storeModel.setStatus(storeId, 'suspended', 'คะแนนความประพฤติต่ำกว่าเกณฑ์');
        await notificationService.notify({
          userId: store.user_id,
          title: 'ร้านของคุณถูกระงับชั่วคราว',
          message: 'คะแนนความประพฤติต่ำกว่าเกณฑ์ กรุณาติดต่อผู้ดูแลระบบ',
          type: 'store',
          refId: storeId,
        });
      }
    }
    return updated;
  },

  /** Admin ปรับคะแนนเอง */
  async adminAdjust(storeId: number, change: number, reason?: string): Promise<BehaviorScore> {
    const current = await behaviorScoreModel.findByStore(storeId);
    const nextScore = Math.max(0, Math.min(100, (current?.score ?? RULES.START_SCORE) + change));
    return behaviorScoreModel.applyChange(
      storeId,
      change,
      reason && reason.trim() !== '' ? reason : 'ผู้ดูแลระบบปรับคะแนน',
      statusFromScore(nextScore)
    );
  },

  async listAll(): Promise<BehaviorScoreForAdmin[]> {
    return behaviorScoreModel.listAllForAdmin();
  },
};

export default behaviorScoreService;
