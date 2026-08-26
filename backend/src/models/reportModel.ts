/**
 * reportModel - การแจ้งปัญหา
 * target_id ชี้ไปได้หลายตาราง จึงไม่ใส่ Foreign Key
 */
import type { Report, ReportStatus, ReportTargetType } from '@shared/index';
import { query, execute, paginate, countOf } from '../config/db';

export interface CreateReportInput {
  reporterId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: string;
}

export const reportModel = {
  async create(input: CreateReportInput): Promise<number> {
    const result = await execute(
      'INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)',
      [input.reporterId, input.targetType, input.targetId, input.reason]
    );
    return result.insertId;
  },

  async listForAdmin({
    status = '', page = 1, limit = 20,
  }: {
    status?: ReportStatus | '';
    page?: number;
    limit?: number;
  }): Promise<{ items: Report[]; total: number }> {
    const pg = paginate(page, limit);
    const items = await query<Report>(
      `SELECT r.*, u.name AS reporter_name, u.email AS reporter_email
         FROM reports r JOIN users u ON u.user_id = r.reporter_id
        WHERE (? = '' OR r.status = ?)
        ORDER BY r.created_at DESC ${pg.sql}`,
      [status, status]
    );
    const total = await countOf(
      `SELECT COUNT(*) AS total FROM reports WHERE (? = '' OR status = ?)`,
      [status, status]
    );
    return { items, total };
  },

  async findById(reportId: number): Promise<Report | null> {
    const rows = await query<Report>('SELECT * FROM reports WHERE report_id = ? LIMIT 1', [reportId]);
    return rows[0] ?? null;
  },

  async updateStatus(
    reportId: number,
    status: ReportStatus,
    adminNote: string | null = null
  ): Promise<Report | null> {
    await execute(
      'UPDATE reports SET status = ?, admin_note = COALESCE(?, admin_note) WHERE report_id = ?',
      [status, adminNote, reportId]
    );
    return reportModel.findById(reportId);
  },

  async countOpen(): Promise<number> {
    return countOf(`SELECT COUNT(*) AS total FROM reports WHERE status = 'open'`);
  },
};

export default reportModel;
