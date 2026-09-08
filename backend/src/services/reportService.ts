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
import type { CreateReportRequest, Report, ReportMessage, ReportStatus } from '@shared/index';

import ApiError from '../utils/ApiError';
import { query } from '../config/db';
import notificationService from './notificationService';
import behaviorScoreService from './behaviorScoreService';
import reportModel from '../models/reportModel';
import reportMessageModel from '../models/reportMessageModel';
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
    { targetType, targetId, reason }: CreateReportRequest,
    /** ชื่อไฟล์หรือ URL ของรูปหลักฐาน มาจาก uploadedFilename() ที่ controller */
    imageUrl: string | null = null
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
      imageUrl,
    });

    const created = await reportModel.findById(reportId);
    if (!created) throw ApiError.notFound('บันทึกเรื่องร้องเรียนไม่สำเร็จ');
    return created;
  },

  /**
   * เรื่องที่ผู้ใช้คนนี้เคยแจ้งไว้
   *
   * *** ห้ามใช้ SELECT * ที่นี่เด็ดขาด ***
   * ตาราง reports มีคอลัมน์ admin_note ซึ่งเป็นบันทึกภายในของผู้ดูแล
   * ผู้ดูแลจดอะไรก็ได้ลงไป รวมถึงข้อมูลที่ไม่ควรให้ใครเห็น
   * จึงต้องไล่ระบุคอลัมน์ที่ปลอดภัยเองทีละตัว
   *
   * ถ้าวันหนึ่งเพิ่มคอลัมน์ใหม่ในตาราง reports ให้คิดก่อนเสมอว่า
   * "ผู้ใช้ทั่วไปควรเห็นไหม" ค่อยตัดสินใจว่าจะเพิ่มในรายการข้างล่างนี้หรือไม่
   */
  async listMine(reporterId: number): Promise<Report[]> {
    const rows = await query<Report>(
      `SELECT r.report_id, r.reporter_id, r.target_type, r.target_id, r.reason,
              r.image_url, r.status, r.resolution_message, r.created_at, r.updated_at,
              (SELECT COUNT(*) FROM report_messages m WHERE m.report_id = r.report_id)
                AS message_count
         FROM reports r
        WHERE r.reporter_id = ?
        ORDER BY r.created_at DESC
        LIMIT 50`,
      [reporterId]
    );

    /*
     * เติมชื่อของสิ่งที่ถูกแจ้งให้ทีหลัง
     *
     * *** ทำไมไม่ JOIN เอาใน SQL ข้างบนเลย ***
     * target_id ชี้ไปได้ 5 ตาราง จะ JOIN ได้ต้องเขียน LEFT JOIN ครบทั้ง 5
     * แล้วใช้ CASE เลือกคอลัมน์ กลายเป็น SQL ยาวที่อ่านยากและแก้ยากมาก
     * ทั้งที่รายการนี้จำกัดไว้แค่ 50 แถว การไปตามชื่อทีหลังจึงคุ้มกว่ามาก
     */
    return attachTargetNames(rows);
  },

  /**
   * ข้อความในเรื่องที่ตัวเองแจ้ง
   *
   * *** ต้องเช็คความเป็นเจ้าของทุกครั้ง ***
   * ถ้าไม่เช็ค ใครก็เดาเลข report_id แล้วอ่านเรื่องของคนอื่นได้หมด
   * ซึ่งในนั้นมีทั้งเรื่องส่วนตัวและชื่อร้านที่ถูกร้องเรียน
   */
  async listMyMessages(reporterId: number, reportId: number): Promise<ReportMessage[]> {
    await assertOwnReport(reporterId, reportId);
    const messages = await reportMessageModel.listByReport(reportId);

    /*
     * ตัดชื่อจริงของผู้ดูแลออกก่อนส่งให้ผู้ใช้
     *
     * *** ทำไมต้องตัด ***
     * ผู้ใช้ควรเห็นว่ากำลังคุยกับ "ผู้ดูแลระบบ" ไม่ใช่กับพนักงานชื่อนั้นชื่อนี้
     * เพราะเรื่องร้องเรียนเป็นงานที่กระทบผลประโยชน์ของคนอื่น
     * การให้ชื่อพนักงานติดไปด้วยเปิดช่องให้ตามไปกดดันเป็นรายบุคคลได้
     * ชื่อของผู้แจ้งเองไม่ต้องตัด เพราะเป็นชื่อตัวเขาเอง
     */
    return messages.map((m) =>
      m.sender_role === 'admin' ? { ...m, sender_name: 'ผู้ดูแลระบบ' } : m
    );
  },

  /**
   * ผู้แจ้งส่งข้อความเพิ่มเข้าไปในเรื่องของตัวเอง
   *
   * *** ทำไมปิดเรื่องแล้วพิมพ์ไม่ได้ ***
   * ถ้าเรื่องปิดไปแล้วยังพิมพ์ต่อได้ ข้อความจะไปกองอยู่ในเรื่องที่ไม่มีใครดูแล้ว
   * ผู้ใช้จะเข้าใจว่ามีคนอ่านอยู่ทั้งที่ไม่มี ซึ่งแย่กว่าการบอกตรง ๆ ว่าเรื่องปิดแล้ว
   * ถ้ายังมีปัญหาอยู่ ให้แจ้งเรื่องใหม่ ซึ่งจะเข้าคิวให้ผู้ดูแลเห็นจริง ๆ
   */
  async addMyMessage(reporterId: number, reportId: number, message: string): Promise<ReportMessage> {
    const report = await assertOwnReport(reporterId, reportId);

    if (report.status === 'resolved' || report.status === 'rejected') {
      throw ApiError.badRequest(
        'เรื่องนี้ปิดไปแล้ว ถ้ายังมีปัญหาอยู่ กรุณาแจ้งเป็นเรื่องใหม่'
      );
    }

    return saveMessage(reportId, reporterId, 'reporter', message);
  },

  /** ผู้ดูแลอ่านข้อความในเรื่อง (ไม่ต้องเช็คความเป็นเจ้าของ เพราะดูแลทุกเรื่องอยู่แล้ว) */
  async listMessagesForAdmin(reportId: number): Promise<ReportMessage[]> {
    const report = await reportModel.findById(reportId);
    if (!report) throw ApiError.notFound('ไม่พบเรื่องร้องเรียนนี้');
    return reportMessageModel.listByReport(reportId);
  },

  /**
   * ผู้ดูแลตอบกลับในเรื่อง
   *
   * *** ข้อความนี้ต่างจาก admin_note และ resolution_message อย่างไร ***
   *   admin_note         บันทึกภายใน  ผู้แจ้งไม่เห็น
   *   resolution_message ผลการตรวจสอบ ส่งถึง "ผู้ถูกแจ้ง"
   *   ข้อความในห้องนี้    ส่งถึง "ผู้แจ้ง" ใช้ถามข้อมูลเพิ่มระหว่างตรวจสอบ
   * สามอย่างนี้ไปคนละทางกัน ห้ามเอามารวมกันเด็ดขาด
   */
  async addAdminMessage(adminId: number, reportId: number, message: string): Promise<ReportMessage> {
    const report = await reportModel.findById(reportId);
    if (!report) throw ApiError.notFound('ไม่พบเรื่องร้องเรียนนี้');

    const saved = await saveMessage(reportId, adminId, 'admin', message);

    // ผู้แจ้งต้องรู้ทันทีว่าผู้ดูแลถามอะไรมา ไม่งั้นเรื่องจะค้างเพราะรอกันไปมา
    await notificationService.notify({
      userId: report.reporter_id,
      title: 'ผู้ดูแลระบบส่งข้อความถึงคุณ',
      message: saved.message,
      type: 'report',
      refId: report.report_id,
    });

    return saved;
  },

  /**
   * ผู้ดูแลเปลี่ยนสถานะเรื่องร้องเรียน
   *
   * *** ทำไม logic ก้อนนี้อยู่ที่ service ไม่ใช่ controller ***
   * มันไม่ใช่แค่ UPDATE แถวเดียวจบ แต่ต้องตัดสินใจว่า "ใครควรได้รู้บ้าง"
   * ซึ่งเป็นกฎทางธุรกิจ ตามกฎเหล็กข้อ 2 จึงต้องอยู่ที่นี่
   *
   * ใครได้แจ้งเตือนบ้าง
   *   1. คนแจ้ง  ได้ทุกครั้งที่สถานะเปลี่ยน จะได้ไม่ต้องเดาว่ามีคนอ่านหรือยัง
   *   2. เจ้าของสิ่งที่ถูกแจ้ง  ได้เฉพาะตอนปิดเรื่องแบบ resolved
   *      และเฉพาะเมื่อผู้ดูแลเขียนข้อความถึงเขามาจริง ๆ
   *
   * *** ทำไม rejected ไม่แจ้งร้าน ***
   * rejected แปลว่าตรวจแล้วไม่พบความผิด การไปบอกร้านว่า "มีคนแจ้งคุณนะ
   * แต่ไม่ผิด" มีแต่ทำให้ร้านเสียความรู้สึกโดยเปล่าประโยชน์
   *
   * *** ปิดเรื่องแล้วต้องเกิดผลจริง ไม่ใช่แค่เปลี่ยนคำในตาราง ***
   * เดิมการกด "จบเรื่อง" เปลี่ยนแค่สถานะกับส่งแจ้งเตือน ร้านที่ถูกแจ้งซ้ำ ๆ
   * กับร้านที่ไม่เคยถูกแจ้งเลยจึงไม่ต่างกันในสายตาระบบ
   * ตอนนี้ผู้ดูแลติ๊ก penalizeStore มาได้ ระบบจะไปตัดคะแนนความประพฤติของร้าน
   * ผ่าน behaviorScoreService ซึ่งมีกติกาเตือน/ระงับร้านอัตโนมัติอยู่แล้ว
   * เรื่องร้องเรียนกับคะแนนความประพฤติจึงกลายเป็นระบบเดียวกัน
   *
   * @param penalizeStore ตัดคะแนนร้านด้วยหรือไม่ มีผลเฉพาะตอน status = resolved
   */
  async updateByAdmin(
    reportId: number,
    status: ReportStatus,
    adminNote: string | null,
    resolutionMessage: string | null,
    penalizeStore = false
  ): Promise<Report> {
    const before = await reportModel.findById(reportId);
    if (!before) throw ApiError.notFound('ไม่พบเรื่องร้องเรียนนี้');

    const cleanNote = trimOrNull(adminNote);
    const cleanMessage = trimOrNull(resolutionMessage);

    const updated = await reportModel.updateStatus(reportId, status, cleanNote, cleanMessage);
    if (!updated) throw ApiError.notFound('อัปเดตสถานะไม่สำเร็จ');

    // ---- 1) แจ้งคนแจ้งเสมอ ----
    await notificationService.notify({
      userId: updated.reporter_id,
      title: 'อัปเดตเรื่องที่คุณแจ้ง',
      message: REPORTER_MESSAGE[status],
      type: 'report',
      refId: updated.report_id,
    });

    // ---- 2) แจ้งเจ้าของสิ่งที่ถูกแจ้ง เฉพาะตอนปิดเรื่องและมีข้อความถึงเขา ----
    if (status === 'resolved' && cleanMessage !== null) {
      const ownerId = await findTargetOwnerId(updated.target_type, updated.target_id);

      /*
       * เช็คว่าไม่ใช่คนเดียวกับคนแจ้ง
       * ปกติ create() กันไว้แล้วว่าแจ้งของตัวเองไม่ได้ แต่ข้อมูลอาจเปลี่ยนมือภายหลัง
       * เช่นร้านถูกโอนให้เจ้าของใหม่ ถ้าไม่เช็คซ้ำ คน ๆ เดียวจะได้แจ้งเตือน 2 ใบ
       */
      if (ownerId !== null && ownerId !== updated.reporter_id) {
        await notificationService.notify({
          userId: ownerId,
          title: 'ผู้ดูแลระบบแจ้งผลการตรวจสอบ',
          /*
           * *** ส่งเฉพาะ resolution_message เท่านั้น ***
           * ห้ามพ่วง admin_note หรือชื่อคนแจ้งเข้าไปเด็ดขาด
           * เพราะฝั่งนี้คือคนที่ถูกแจ้ง เขาไม่ควรรู้ว่าใครเป็นคนแจ้ง
           */
          message: cleanMessage,
          type: 'report',
          refId: updated.report_id,
        });
      }
    }

    // ---- 3) ตัดคะแนนร้าน เมื่อผู้ดูแลยืนยันว่าร้านผิดจริง ----
    if (status === 'resolved' && penalizeStore) {
      await penalizeStoreForReport(updated.target_type, updated.target_id, updated.report_id);
    }

    return updated;
  },
};

/**
 * ตัดคะแนนความประพฤติของร้านที่ถูกแจ้ง
 *
 * *** ทำไมหาเจอบ้างไม่เจอบ้างแล้วไม่ throw ***
 * เรื่องร้องเรียนบางประเภทไม่ได้ผูกกับร้านเลย (แจ้งรีวิว = ของลูกค้า, แจ้งผู้ใช้)
 * และของที่ถูกแจ้งอาจถูกลบไปแล้วระหว่างรอตรวจสอบ
 * ถ้าโยน error ออกไป ผู้ดูแลจะปิดเรื่องไม่ได้เลยทั้งที่ตรวจเสร็จแล้ว
 * จึงเลือกข้ามการตัดคะแนนแล้วเขียน log ไว้แทน เรื่องยังปิดได้ตามปกติ
 */
async function penalizeStoreForReport(
  targetType: CreateReportRequest['targetType'],
  targetId: number,
  reportId: number
): Promise<void> {
  const storeId = await findTargetStoreId(targetType, targetId);
  if (storeId === null) {
    console.warn(`!! เรื่องร้องเรียน #${String(reportId)} ไม่ได้ผูกกับร้าน จึงข้ามการตัดคะแนน`);
    return;
  }

  await behaviorScoreService.applyRule(
    storeId,
    'CONFIRMED_REPORT',
    `ผู้ดูแลระบบตรวจสอบเรื่องร้องเรียน #${String(reportId)} แล้วพบความผิดจริง`
  );
}

/**
 * แปลง target_type + target_id เป็น store_id ของร้านที่ต้องรับผิดชอบ
 *
 * คืน null เมื่อเรื่องนั้นไม่ได้ผูกกับร้าน หรือหาของไม่เจอแล้ว
 *   - review  รีวิวเป็นของลูกค้า ไม่ใช่ของร้าน จึงตัดคะแนนร้านไม่ได้
 *   - user    แจ้งตัวบุคคล ไม่เกี่ยวกับร้าน
 */
async function findTargetStoreId(
  targetType: CreateReportRequest['targetType'],
  targetId: number
): Promise<number | null> {
  switch (targetType) {
    case 'store': {
      const store = await storeModel.findById(targetId);
      return store?.store_id ?? null;
    }

    case 'post': {
      const post = await postModel.findById(targetId);
      return post?.store_id ?? null;
    }

    case 'reservation': {
      const reservation = await reservationModel.findById(targetId);
      return reservation?.store_id ?? null;
    }

    case 'review':
    case 'user':
      return null;

    default: {
      const exhaustive: never = targetType;
      throw ApiError.badRequest(`ประเภทของสิ่งที่แจ้งไม่ถูกต้อง: ${String(exhaustive)}`);
    }
  }
}

/**
 * เช็คว่าเรื่องนี้เป็นของคนที่กำลังเรียกจริง แล้วคืนตัวเรื่องกลับไปให้ใช้ต่อ
 *
 * คืน 404 ทั้งกรณีไม่มีเรื่องนี้ และกรณีเป็นเรื่องของคนอื่นโดยตั้งใจ
 * ถ้าตอบ 403 เมื่อเป็นของคนอื่น เท่ากับบอกว่า "เลขนี้มีอยู่จริงนะ แค่ไม่ใช่ของคุณ"
 * ซึ่งทำให้ไล่เดาเลขจนรู้ได้ว่าระบบมีเรื่องร้องเรียนทั้งหมดกี่เรื่อง
 */
async function assertOwnReport(reporterId: number, reportId: number): Promise<Report> {
  const report = await reportModel.findById(reportId);
  if (!report || report.reporter_id !== reporterId) {
    throw ApiError.notFound('ไม่พบเรื่องร้องเรียนนี้');
  }
  return report;
}

/** บันทึกข้อความแล้วอ่านกลับมาให้ครบฟิลด์ (จะได้มีชื่อคนพิมพ์ติดมาด้วย) */
async function saveMessage(
  reportId: number,
  senderId: number,
  senderRole: ReportMessage['sender_role'],
  message: string
): Promise<ReportMessage> {
  const messageId = await reportMessageModel.create({
    reportId,
    senderId,
    senderRole,
    message: message.trim(),
  });

  const saved = await reportMessageModel.findById(messageId);
  if (!saved) throw ApiError.notFound('บันทึกข้อความไม่สำเร็จ');
  return saved;
}

/**
 * เติมชื่อของสิ่งที่ถูกแจ้งเข้าไปในแต่ละเรื่อง
 *
 * *** ทำไมต้องมีตัวจำ (cache) ***
 * ผู้ใช้คนหนึ่งมักแจ้งร้านเดิมหรือการจองเดิมหลายรอบ ถ้าไม่จำไว้
 * จะยิงคำถามเดิมไปที่ฐานข้อมูลซ้ำ ๆ โดยได้คำตอบเหมือนเดิมทุกครั้ง
 *
 * ของที่ถูกลบไปแล้วจะได้ null ฝั่งแอปต้องเผื่อกรณีนี้เสมอ
 */
async function attachTargetNames(reports: Report[]): Promise<Report[]> {
  const cache = new Map<string, string | null>();

  const result: Report[] = [];
  for (const report of reports) {
    const key = `${report.target_type}:${String(report.target_id)}`;

    let name = cache.get(key);
    if (name === undefined) {
      name = await findTargetName(report.target_type, report.target_id);
      cache.set(key, name);
    }

    result.push({ ...report, target_name: name });
  }
  return result;
}

/** หาชื่อที่คนอ่านแล้วรู้ว่าหมายถึงอะไร ไม่ใช่เลข id */
async function findTargetName(
  targetType: CreateReportRequest['targetType'],
  targetId: number
): Promise<string | null> {
  switch (targetType) {
    case 'store': {
      const store = await storeModel.findById(targetId);
      return store?.store_name ?? null;
    }

    case 'post': {
      const post = await postModel.findById(targetId);
      return post === null ? null : `${post.food_name} จาก ${post.store_name}`;
    }

    case 'reservation': {
      const reservation = await reservationModel.findById(targetId);
      return reservation === null
        ? null
        : `${reservation.food_name} จาก ${reservation.store_name}`;
    }

    case 'review': {
      const review = await reviewModel.findById(targetId);
      if (review === null) return null;
      return `รีวิว ${String(review.rating)} ดาว จาก ${review.customer_name ?? 'ลูกค้า'}`;
    }

    case 'user': {
      const user = await userModel.findById(targetId);
      return user?.name ?? null;
    }

    default: {
      const exhaustive: never = targetType;
      throw ApiError.badRequest(`ประเภทของสิ่งที่แจ้งไม่ถูกต้อง: ${String(exhaustive)}`);
    }
  }
}

/** ตัดช่องว่างหัวท้าย ถ้าเหลือว่างเปล่าให้ถือว่าไม่ได้กรอกมา */
function trimOrNull(value: string | null): string | null {
  if (value === null) return null;
  const text = value.trim();
  return text === '' ? null : text;
}

/**
 * ข้อความที่ส่งถึงคนแจ้ง แยกตามสถานะ
 *
 * ประกาศเป็น Record<ReportStatus, string> เพื่อบังคับให้ครบทุกสถานะ
 * ถ้าวันหนึ่งเพิ่มสถานะใหม่ใน shared/src/enums.ts แล้วลืมมาเพิ่มที่นี่
 * TypeScript จะฟ้องตั้งแต่ตอน typecheck ไม่ปล่อยให้ส่งแจ้งเตือนเป็นค่าว่าง
 */
const REPORTER_MESSAGE: Record<ReportStatus, string> = {
  open: 'เรื่องที่คุณแจ้งกลับเข้าคิวรอตรวจสอบอีกครั้ง',
  reviewing: 'ผู้ดูแลระบบกำลังตรวจสอบเรื่องที่คุณแจ้งอยู่',
  resolved: 'เรื่องที่คุณแจ้งได้รับการจัดการเรียบร้อยแล้ว ขอบคุณที่ช่วยแจ้ง',
  rejected: 'ผู้ดูแลระบบตรวจสอบเรื่องที่คุณแจ้งแล้ว แต่ยังไม่พบความผิดปกติ',
};

/**
 * แปลง target_type + target_id เป็น user_id ของเจ้าของ
 *
 * *** ทำไมต้องมีฟังก์ชันนี้ ***
 * ตาราง reports เก็บแค่ "แจ้งอะไร เลขอะไร" ไม่ได้เก็บว่าของนั้นเป็นของใคร
 * เพราะ target_id ชี้ไปได้หลายตาราง จึงผูก Foreign Key ไม่ได้
 * เวลาจะส่งแจ้งเตือนถึงเจ้าของ ต้องไล่หาเองทีละกรณี
 *
 * คืน null เมื่อหาไม่เจอ (ของถูกลบไปแล้ว) ผู้เรียกต้องเช็คก่อนใช้เสมอ
 */
async function findTargetOwnerId(
  targetType: CreateReportRequest['targetType'],
  targetId: number
): Promise<number | null> {
  switch (targetType) {
    case 'store': {
      const store = await storeModel.findById(targetId);
      return store?.user_id ?? null;
    }

    case 'post': {
      const post = await postModel.findById(targetId);
      if (!post) return null;
      const store = await storeModel.findById(post.store_id);
      return store?.user_id ?? null;
    }

    case 'review': {
      const review = await reviewModel.findById(targetId);
      return review?.customer_id ?? null;
    }

    case 'reservation': {
      // การจองมี 2 ฝ่าย แต่เรื่องที่ผู้ดูแลตัดสินมักเป็นเรื่องของร้าน จึงแจ้งร้าน
      const reservation = await reservationModel.findById(targetId);
      if (!reservation) return null;
      const store = await storeModel.findById(reservation.store_id);
      return store?.user_id ?? null;
    }

    case 'user': {
      const user = await userModel.findById(targetId);
      return user?.user_id ?? null;
    }

    default: {
      // never ทำให้ลืมเพิ่มประเภทใหม่ไม่ได้ จะ error ตั้งแต่ typecheck
      const exhaustive: never = targetType;
      throw ApiError.badRequest(`ประเภทของสิ่งที่แจ้งไม่ถูกต้อง: ${String(exhaustive)}`);
    }
  }
}

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
