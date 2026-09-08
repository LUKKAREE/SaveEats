/**
 * reportMessageModel - ข้อความโต้ตอบภายในเรื่องที่แจ้งปัญหา
 *
 * *** ห้องสนทนานี้มีแค่ 2 คน : ผู้แจ้ง กับ ผู้ดูแล ***
 * ผู้ถูกแจ้งไม่อยู่ในนี้เด็ดขาด เพราะทั้งระบบออกแบบมาให้ผู้ถูกแจ้ง
 * ไม่รู้ว่าใครเป็นคนแจ้ง ถ้าดึงเขาเข้ามาคุยด้วย ตัวตนคนแจ้งจะหลุดทันที
 * ผู้ถูกแจ้งยังได้รับผลการตรวจสอบผ่าน resolution_message เหมือนเดิม
 *
 * กติกาว่าใครอ่านหรือพิมพ์ได้ ไม่ได้อยู่ที่นี่ แต่อยู่ที่ reportService
 * ตามกฎเหล็กข้อ 2 (Business Logic อยู่ที่ services เท่านั้น)
 */
import type { ReportMessage } from '@shared/index';
import { query, execute } from '../config/db';

export interface CreateReportMessageInput {
  reportId: number;
  senderId: number;
  senderRole: ReportMessage['sender_role'];
  message: string;
}

export const reportMessageModel = {
  /**
   * ข้อความทั้งหมดของเรื่องหนึ่ง เรียงจากเก่าไปใหม่
   *
   * เรียงเก่าไปใหม่เพราะเป็นบทสนทนา คนอ่านจากบนลงล่างเหมือนแชตทั่วไป
   * (ต่างจากรายการเรื่องร้องเรียนที่เรียงใหม่ไปเก่า เพราะเป็นรายการงาน)
   */
  async listByReport(reportId: number): Promise<ReportMessage[]> {
    return query<ReportMessage>(
      `SELECT m.message_id, m.report_id, m.sender_id, m.sender_role,
              m.message, m.created_at, u.name AS sender_name
         FROM report_messages m
         JOIN users u ON u.user_id = m.sender_id
        WHERE m.report_id = ?
        ORDER BY m.created_at ASC, m.message_id ASC`,
      [reportId]
    );
  },

  async create(input: CreateReportMessageInput): Promise<number> {
    const result = await execute(
      `INSERT INTO report_messages (report_id, sender_id, sender_role, message)
       VALUES (?, ?, ?, ?)`,
      [input.reportId, input.senderId, input.senderRole, input.message]
    );
    return result.insertId;
  },

  async findById(messageId: number): Promise<ReportMessage | null> {
    const rows = await query<ReportMessage>(
      `SELECT m.message_id, m.report_id, m.sender_id, m.sender_role,
              m.message, m.created_at, u.name AS sender_name
         FROM report_messages m
         JOIN users u ON u.user_id = m.sender_id
        WHERE m.message_id = ?
        LIMIT 1`,
      [messageId]
    );
    return rows[0] ?? null;
  },
};

export default reportMessageModel;
