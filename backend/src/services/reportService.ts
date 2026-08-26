/**
 * reportService - Logic ของระบบแจ้งปัญหา
 *
 * *** กฎเหล็กข้อ 2 : Business Logic ต้องอยู่ที่ services เท่านั้น ***
 *
 * สิ่งที่ service นี้ตรวจก่อนรับเรื่อง
 *   1. สิ่งที่แจ้งมีอยู่จริงไหม (ไม่ให้แจ้งร้านที่ไม่มีในระบบ)
 *   2. แจ้งตัวเองหรือเปล่า
 *   3. เคยแจ้งเรื่องเดิมที่ยังไม่ปิดอยู่แล้วหรือยัง (กันสแปม)
 *
 * ทั้ง 3 ข้อนี้ต้องเช็คที่ Backend เท่านั้น
 * เพราะถ้าเช็คแค่ในแอป ใครยิง API ตรงก็ข้ามได้หมด (กฎเหล็กข้อ 3)
 */
import type { CreateReportRequest, Report } from '@shared/index';

import ApiError from '../utils/ApiError';
import { query } from '../config/db';
import reportModel from '../models/reportModel';
import storeModel from '../models/storeModel';
import postModel from '../models/postModel';
import userModel from '../models/userModel';
import reviewModel from '../models/reviewModel';
import reservationModel from '../models/reservationModel';

/** จำนวนเรื่องที่ยังไม่ปิด ที่ผู้ใช้ 1 คนเปิดค้างไว้พร้อมกันได้ */
const MAX_OPEN_REPORTS_PER_USER = 5;

interface CountRow { total: number }

export const reportService = {
  /**
   * ผู้ใช้แจ้งปัญหาเข้ามา
   *
   * @param reporterId  user_id ของคนแจ้ง (มาจาก token ไม่ได้มาจาก body)
   *                    *** สำคัญ : ห้ามให้ client ส่ง reporterId มาเอง ***
   *                    ไม่งั้นจะแจ้งในนามคนอื่นได้
   */
  async create(
    reporterId: number,
    { targetType, targetId, reason }: CreateReportRequest
  ): Promise<Report> {
    // ---- 1) สิ่งที่แจ้งมีอยู่จริงไหม ----
    await assertTargetExists(targetType, targetId, reporterId);

    // ---- 2) เปิดเรื่องค้างไว้เยอะเกินไปหรือยัง ----
    const openRows = await query<CountRow>(
      `SELECT COUNT(*) AS total
         FROM reports
        WHERE reporter_id = ? AND status IN ('open', 'reviewing')`,
      [reporterId]
    );
    const openCount = openRows[0]?.total ?? 0;
    if (openCount >= MAX_OPEN_REPORTS_PER_USER) {
      throw ApiError.badRequest(
        `คุณมีเรื่องที่ยังไม่ได้รับการตรวจสอบอยู่ ${openCount} เรื่อง ` +
          'กรุณารอผู้ดูแลระบบตรวจสอบเรื่องเดิมก่อน'
      );
    }

    // ---- 3) เคยแจ้งเรื่องเดิมที่ยังไม่ปิดไปแล้วหรือยัง ----
    const dupRows = await query<CountRow>(
      `SELECT COUNT(*) AS total
         FROM reports
        WHERE reporter_id = ? AND target_type = ? AND target_id = ?
          AND status IN ('open', 'reviewing')`,
      [reporterId, targetType, targetId]
    );
    if ((dupRows[0]?.total ?? 0) > 0) {
      throw ApiError.conflict('คุณเคยแจ้งเรื่องนี้ไว้แล้ว และผู้ดูแลระบบกำลังตรวจสอบอยู่');
    }

    // ---- ผ่านหมดแล้วค่อยบันทึก ----
    const reportId = await reportModel.create({
      reporterId,
      targetType,
      targetId,
      reason: reason.trim(),
    });

    const created = await reportModel.findById(reportId);
    if (!created) throw ApiError.notFound('บันทึกเรื่องร้องเรียนไม่สำเร็จ');
    return created;
  },

  /** เรื่องที่ผู้ใช้คนนี้เคยแจ้งไว้ */
  async listMine(reporterId: number): Promise<Report[]> {
    return query<Report>(
      `SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC LIMIT 50`,
      [reporterId]
    );
  },
};

/**
 * ตรวจว่าสิ่งที่แจ้งมีอยู่จริง และไม่ใช่ของตัวเอง
 *
 * *** ทำไมต้องเช็คว่ามีอยู่จริง ***
 * ถ้าไม่เช็ค คนร้ายยิง targetId มั่ว ๆ เข้ามาได้เป็นพัน ๆ เรื่อง
 * แล้ว Admin จะเสียเวลาไล่ดูเรื่องที่ไม่มีอยู่จริง
 *
 * *** ทำไมต้องเช็คว่าไม่ใช่ของตัวเอง ***
 * ร้านแจ้งร้านตัวเอง หรือคนเขียนรีวิวแจ้งรีวิวตัวเอง ไม่มีประโยชน์
 * และมักเป็นการลองระบบเล่นมากกว่าการแจ้งปัญหาจริง
 */
async function assertTargetExists(
  targetType: CreateReportRequest['targetType'],
  targetId: number,
  reporterId: number
): Promise<void> {
  switch (targetType) {
    case 'store': {
      const store = await storeModel.findById(targetId);
      if (!store) throw ApiError.notFound('ไม่พบร้านที่ต้องการแจ้ง');
      if (store.user_id === reporterId) {
        throw ApiError.badRequest('ไม่สามารถแจ้งปัญหาร้านของตัวเองได้');
      }
      return;
    }

    case 'post': {
      const post = await postModel.findById(targetId);
      if (!post) throw ApiError.notFound('ไม่พบโพสต์ที่ต้องการแจ้ง');
      const owner = await storeModel.findById(post.store_id);
      if (owner && owner.user_id === reporterId) {
        throw ApiError.badRequest('ไม่สามารถแจ้งปัญหาโพสต์ของตัวเองได้');
      }
      return;
    }

    case 'review': {
      const review = await reviewModel.findById(targetId);
      if (!review) throw ApiError.notFound('ไม่พบรีวิวที่ต้องการแจ้ง');
      if (review.customer_id === reporterId) {
        throw ApiError.badRequest('ไม่สามารถแจ้งปัญหารีวิวของตัวเองได้');
      }
      return;
    }

    case 'reservation': {
      const reservation = await reservationModel.findById(targetId);
      if (!reservation) throw ApiError.notFound('ไม่พบการจองที่ต้องการแจ้ง');

      // การจองต้องเกี่ยวข้องกับคนแจ้ง จะเป็นลูกค้าที่จอง หรือเจ้าของร้านก็ได้
      const store = await storeModel.findById(reservation.store_id);
      const isCustomer = reservation.customer_id === reporterId;
      const isSeller = store !== null && store.user_id === reporterId;
      if (!isCustomer && !isSeller) {
        throw ApiError.forbidden('คุณไม่มีสิทธิ์แจ้งปัญหาการจองนี้');
      }
      return;
    }

    case 'user': {
      const user = await userModel.findById(targetId);
      if (!user) throw ApiError.notFound('ไม่พบผู้ใช้ที่ต้องการแจ้ง');
      if (user.user_id === reporterId) {
        throw ApiError.badRequest('ไม่สามารถแจ้งปัญหาบัญชีของตัวเองได้');
      }
      return;
    }

    default: {
      // *** จุดนี้ TypeScript ช่วยเราไว้ ***
      // ถ้าวันหนึ่งเพิ่มประเภทใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มที่นี่
      // บรรทัดข้างล่างจะขึ้น error ทันทีตอน typecheck เพราะ never รับค่าอื่นไม่ได้
      const exhaustive: never = targetType;
      throw ApiError.badRequest(`ประเภทของสิ่งที่แจ้งไม่ถูกต้อง: ${String(exhaustive)}`);
    }
  }
}

export default reportService;
