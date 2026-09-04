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
    await suspendIfBelowThreshold(storeId, nextStatus);
    return updated;
  },

  /**
   * Admin ปรับคะแนนเอง
   *
   * *** ต้องเรียก suspendIfBelowThreshold เหมือน applyRule ***
   * เดิมเมธอดนี้อัปเดตแค่ตัวเลขกับป้ายสถานะในตารางคะแนน แต่ไม่ได้แตะสถานะร้านจริง
   * ผลคือผู้ดูแลหักคะแนนจนต่ำกว่าเกณฑ์ หน้าเว็บขึ้นว่าร้านถูกระงับ
   * แต่ร้านยังขายได้ปกติ ลูกค้ายังจองได้ และเจ้าของร้านไม่รู้ตัวเลย
   * ระบบจึงอยู่ในสภาพขัดแย้งกันเอง ป้ายบอกอย่าง ของจริงเป็นอีกอย่าง
   */
  async adminAdjust(storeId: number, change: number, reason?: string): Promise<BehaviorScore> {
    const current = await behaviorScoreModel.findByStore(storeId);
    const nextScore = Math.max(0, Math.min(100, (current?.score ?? RULES.START_SCORE) + change));
    const nextStatus = statusFromScore(nextScore);

    const updated = await behaviorScoreModel.applyChange(
      storeId,
      change,
      reason && reason.trim() !== '' ? reason : 'ผู้ดูแลระบบปรับคะแนน',
      nextStatus
    );
    await suspendIfBelowThreshold(storeId, nextStatus);
    return updated;
  },

  async listAll(): Promise<BehaviorScoreForAdmin[]> {
    return behaviorScoreModel.listAllForAdmin();
  },
};

/**
 * คะแนนตกต่ำกว่าเกณฑ์ -> ระงับร้านอัตโนมัติ พร้อมแจ้งเจ้าของร้าน
 *
 * *** ทำไมต้องแยกเป็นฟังก์ชันกลาง ***
 * คะแนนเปลี่ยนได้ 2 ทาง คือระบบหักเองตามกติกา กับผู้ดูแลกดปรับในเว็บ
 * ถ้าเขียนตรรกะระงับร้านไว้แค่ทางเดียว อีกทางจะทำงานไม่เหมือนกันโดยไม่มีใครรู้
 * รวมไว้ที่เดียวแบบนี้ ต่อให้วันหน้ามีทางที่สามเพิ่มมา ก็แค่เรียกฟังก์ชันนี้
 *
 * *** ทำไมเช็ค status === 'approved' ก่อน ***
 * ร้านที่ถูกระงับอยู่แล้ว หรือยังไม่อนุมัติ ไม่ต้องระงับซ้ำ
 * ไม่งั้นเจ้าของร้านจะได้แจ้งเตือนซ้ำ ๆ ทุกครั้งที่คะแนนขยับ
 */
async function suspendIfBelowThreshold(storeId: number, nextStatus: BehaviorStatus): Promise<void> {
  if (nextStatus !== 'suspended') return;

  const store = await storeModel.findById(storeId);
  if (!store || store.status !== 'approved') return;

  await storeModel.setStatus(storeId, 'suspended', 'คะแนนความประพฤติต่ำกว่าเกณฑ์');
  await notificationService.notify({
    userId: store.user_id,
    title: 'ร้านของคุณถูกระงับชั่วคราว',
    message: 'คะแนนความประพฤติต่ำกว่าเกณฑ์ กรุณาติดต่อผู้ดูแลระบบ',
    type: 'store',
    refId: storeId,
  });
}

export default behaviorScoreService;
