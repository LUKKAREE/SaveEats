/**
 * adminController - งานฝั่งผู้ดูแลระบบ
 * ทุก endpoint ในไฟล์นี้ผ่าน requireAdmin มาแล้วจาก adminRoutes.ts
 */
import type { Request, Response } from 'express';
import type {
  StoreStatus, ReportStatus, DashboardStats, DailyCount,
  RejectStoreRequest, SetUserActiveRequest, AdjustBehaviorRequest, UpdateReportRequest,
} from '@shared/index';

import ApiError from '../utils/ApiError';
import { ok, paginated } from '../utils/response';
import { qStr, qNum, qBool, paramId, pageParams } from '../utils/query';

import userModel from '../models/userModel';
import storeModel from '../models/storeModel';
import postModel from '../models/postModel';
import reservationModel from '../models/reservationModel';
import reviewModel from '../models/reviewModel';
import reportModel from '../models/reportModel';
import reportService from '../services/reportService';
import behaviorScoreService from '../services/behaviorScoreService';
import notificationService from '../services/notificationService';
import reservationService from '../services/reservationService';

/** กราฟยอดจองในแดชบอร์ดย้อนหลังกี่วัน */
const DAILY_DAYS = 7;

/**
 * เติมวันที่ที่ไม่มีการจองให้เป็น 0
 *
 * *** ทำไมต้องเติม ***
 * SQL คืนเฉพาะวันที่มีข้อมูล วันไหนไม่มีใครจองเลยจะหายไปทั้งแถว
 * ถ้าเอาไปวาดกราฟตรง ๆ แกนวันจะกระโดดข้าม เช่นจาก จ. ไป พ. เลย
 * คนดูจะเข้าใจผิดว่ายอดคงที่ ทั้งที่ความจริงมีวันที่ยอดเป็นศูนย์คั่นอยู่
 *
 * เราจึงไล่สร้างวันครบทุกวันก่อน แล้วค่อยเอายอดจริงไปเติมทับ
 */
function fillMissingDays(
  rows: { day: string | Date; total: number }[],
  days: number
): DailyCount[] {
  // แปลงผลจาก SQL เป็นตารางค้นหา วันไหนมียอดเท่าไหร่
  const found = new Map<string, number>();
  for (const row of rows) {
    const key = row.day instanceof Date
      ? row.day.toISOString().slice(0, 10)
      : String(row.day).slice(0, 10);
    found.set(key, Number(row.total));
  }

  const result: DailyCount[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    // ใช้เวลาท้องถิ่น ไม่ใช่ UTC ไม่งั้นช่วงหัวค่ำของไทยจะถูกนับเป็นวันถัดไป
    const key = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');
    result.push({ date: key, count: found.get(key) ?? 0 });
  }
  return result;
}

const VALID_STORE_STATUS: readonly string[] = ['pending', 'approved', 'rejected', 'suspended'];
const VALID_REPORT_STATUS: readonly string[] = ['open', 'reviewing', 'resolved', 'rejected'];

function parseStoreStatus(value: unknown): StoreStatus | '' {
  const text = qStr(value);
  return VALID_STORE_STATUS.includes(text) ? (text as StoreStatus) : '';
}

function parseReportStatus(value: unknown): ReportStatus | '' {
  const text = qStr(value);
  return VALID_REPORT_STATUS.includes(text) ? (text as ReportStatus) : '';
}

export const adminController = {
  /** GET /api/admin/dashboard - ตัวเลขสรุปหน้าแรก */
  async dashboard(_req: Request, res: Response): Promise<void> {
    /*
     * ยิงทุก query พร้อมกันด้วย Promise.all
     *
     * แต่ละอันไม่ต้องรอผลของอันอื่น ถ้าเขียน await ทีละบรรทัด
     * เวลารวมจะเท่ากับผลบวกของทุก query แต่แบบนี้เท่ากับอันที่ช้าที่สุดอันเดียว
     */
    const [
      customers, sellers, pendingStores, approvedStores,
      activePosts, totalReservations, todayReservations, openReports,
      dailyRaw, statusRaw,
    ] = await Promise.all([
      userModel.countByRole('customer'),
      userModel.countByRole('seller'),
      storeModel.countByStatus('pending'),
      storeModel.countByStatus('approved'),
      postModel.countActive(),
      reservationModel.countAll(),
      reservationModel.countToday(),
      reportModel.countOpen(),
      reservationModel.countByDay(DAILY_DAYS),
      reservationModel.countByStatus(),
    ]);

    const stats: DashboardStats = {
      customers, sellers, pendingStores, approvedStores,
      activePosts, totalReservations, todayReservations, openReports,

      daily: fillMissingDays(dailyRaw, DAILY_DAYS),

      statusBreakdown: statusRaw.map((r) => ({ status: r.status, count: Number(r.total) })),
    };
    ok(res, stats);
  },

  /** GET /api/admin/stores?status=pending */
  async listStores(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total } = await storeModel.listForAdmin({
      status: parseStoreStatus(req.query['status']),
      search: qStr(req.query['search']),
      page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/admin/stores/pending - ร้านรออนุมัติ (งานหลักของ Admin) */
  async listPendingStores(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total } = await storeModel.listForAdmin({ status: 'pending', page, limit });
    paginated(res, items, { page, limit, total });
  },

  /** PUT /api/admin/stores/:id/approve */
  async approveStore(req: Request, res: Response): Promise<void> {
    const storeId = paramId(req);
    const store = await storeModel.findById(storeId);
    if (!store) throw ApiError.notFound('ไม่พบร้านนี้');

    const updated = await storeModel.setStatus(storeId, 'approved', null);
    await notificationService.notifyFromTemplate(
      store.user_id, 'STORE_APPROVED', [], { type: 'store', refId: storeId }
    );
    ok(res, updated, 'อนุมัติร้านเรียบร้อยแล้ว');
  },

  /** PUT /api/admin/stores/:id/reject */
  async rejectStore(req: Request, res: Response): Promise<void> {
    const storeId = paramId(req);
    const store = await storeModel.findById(storeId);
    if (!store) throw ApiError.notFound('ไม่พบร้านนี้');

    const { reason } = req.body as RejectStoreRequest;
    const updated = await storeModel.setStatus(storeId, 'rejected', reason);
    await notificationService.notifyFromTemplate(
      store.user_id, 'STORE_REJECTED', [reason], { type: 'store', refId: storeId }
    );
    ok(res, updated, 'บันทึกผลไม่อนุมัติเรียบร้อยแล้ว');
  },

  /** PUT /api/admin/stores/:id/suspend */
  async suspendStore(req: Request, res: Response): Promise<void> {
    const body = req.body as { reason?: string };
    const updated = await storeModel.setStatus(paramId(req), 'suspended', body.reason ?? null);
    ok(res, updated, 'ระงับร้านเรียบร้อยแล้ว');
  },

  /** GET /api/admin/customers */
  async listCustomers(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total } = await userModel.listByRole('customer', {
      search: qStr(req.query['search']), page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /** PUT /api/admin/users/:id/active */
  async setUserActive(req: Request, res: Response): Promise<void> {
    const body = req.body as SetUserActiveRequest;
    const isActive = qBool(body.isActive);
    await userModel.setActive(paramId(req), isActive);
    ok(res, null, isActive ? 'เปิดใช้งานบัญชีแล้ว' : 'ระงับบัญชีแล้ว');
  },

  /** GET /api/admin/posts */
  async listPosts(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const status = qStr(req.query['status']);
    const valid: readonly string[] = ['active', 'sold_out', 'expired', 'hidden'];

    // ใช้ listAllForAdmin ไม่ใช่ listFeed - Admin ต้องเห็นโพสต์ที่ซ่อนไว้ด้วย
    const { items, total } = await postModel.listAllForAdmin({
      status: valid.includes(status) ? (status as never) : '',
      page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/admin/reservations */
  async listReservations(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const status = qStr(req.query['status']);
    const valid: readonly string[] = ['confirmed', 'waiting', 'completed', 'expired', 'cancelled'];

    const { items, total } = await reservationModel.listAllForAdmin({
      status: valid.includes(status) ? (status as never) : '',
      storeId: qNum(req.query['storeId']),
      page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/admin/reviews */
  async listReviews(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total } = await reviewModel.listAllForAdmin({ page, limit });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/admin/reports */
  async listReports(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const { items, total } = await reportModel.listForAdmin({
      status: parseReportStatus(req.query['status']), page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /**
   * PUT /api/admin/reports/:id
   *
   * ตัวการเปลี่ยนสถานะจริงอยู่ที่ reportService.updateByAdmin
   * เพราะนอกจากอัปเดตแถวแล้ว ยังต้องตัดสินใจว่าจะแจ้งเตือนใครบ้าง
   * ซึ่งเป็น Business Logic ห้ามเขียนไว้ที่ controller (กฎเหล็กข้อ 2)
   */
  async updateReport(req: Request, res: Response): Promise<void> {
    const body = req.body as UpdateReportRequest;
    if (!VALID_REPORT_STATUS.includes(body.status)) {
      throw ApiError.badRequest('สถานะการแจ้งปัญหาไม่ถูกต้อง');
    }
    const updated = await reportService.updateByAdmin(
      paramId(req),
      body.status,
      body.adminNote ?? null,
      body.resolutionMessage ?? null
    );
    ok(res, updated, 'อัปเดตสถานะการแจ้งปัญหาแล้ว');
  },

  /** GET /api/admin/behavior */
  async listBehavior(_req: Request, res: Response): Promise<void> {
    const items = await behaviorScoreService.listAll();
    ok(res, items);
  },

  /** PUT /api/admin/behavior/:storeId */
  async adjustBehavior(req: Request, res: Response): Promise<void> {
    const body = req.body as AdjustBehaviorRequest;
    const change = Number(body.change);
    if (!Number.isFinite(change)) {
      throw ApiError.badRequest('คะแนนที่ปรับต้องเป็นตัวเลข');
    }
    const updated = await behaviorScoreService.adminAdjust(
      paramId(req, 'storeId'), change, body.reason
    );
    ok(res, updated, 'ปรับคะแนนความประพฤติเรียบร้อยแล้ว');
  },

  /**
   * PUT /api/admin/posts/:id/hide
   * ซ่อนโพสต์ที่ไม่เหมาะสม (เช่น ตั้งราคาหลอก หรือรูปไม่เหมาะสม)
   *
   * *** ซ่อน ไม่ใช่ลบ ***
   * ถ้าลบทิ้ง การจองที่ผูกกับโพสต์นี้จะหายตามไปด้วย (FK ตั้ง ON DELETE CASCADE)
   * เปลี่ยนสถานะเป็น hidden แทน โพสต์จะหายจาก Feed แต่ประวัติการจองยังอยู่ครบ
   *
   * ส่ง unhide=true มาใน body เพื่อเอากลับมาขายใหม่
   */
  async hidePost(req: Request, res: Response): Promise<void> {
    const postId = paramId(req);
    const post = await postModel.findById(postId);
    if (!post) throw ApiError.notFound('ไม่พบโพสต์นี้');

    const unhide = qBool((req.body as { unhide?: unknown }).unhide) === true;

    if (!unhide && post.status !== 'active') {
      throw ApiError.badRequest('ซ่อนได้เฉพาะโพสต์ที่กำลังขายอยู่เท่านั้น');
    }
    if (unhide && post.status !== 'hidden') {
      throw ApiError.badRequest('โพสต์นี้ไม่ได้ถูกซ่อนอยู่');
    }

    const updated = await postModel.update(postId, { status: unhide ? 'active' : 'hidden' });

    // แจ้งให้เจ้าของร้านรู้ตัว จะได้ไม่งงว่าโพสต์หายไปไหน
    const store = await storeModel.findById(post.store_id);
    if (store) {
      await notificationService.notify({
        userId: store.user_id,
        title: unhide ? 'โพสต์กลับมาแสดงแล้ว' : 'โพสต์ถูกซ่อนโดยผู้ดูแลระบบ',
        message: unhide
          ? `โพสต์ "${post.food_name}" กลับมาแสดงใน Feed แล้ว`
          : `โพสต์ "${post.food_name}" ถูกซ่อนจาก Feed กรุณาติดต่อผู้ดูแลระบบ`,
        type: 'system',
        refId: postId,
      });
    }

    ok(res, updated, unhide ? 'เอาโพสต์กลับมาแสดงแล้ว' : 'ซ่อนโพสต์เรียบร้อยแล้ว');
  },

  /**
   * DELETE /api/admin/reviews/:id
   * ลบรีวิวที่ไม่เหมาะสม (คำหยาบ / สแปม / กลั่นแกล้งร้าน)
   *
   * *** ต้องคำนวณคะแนนร้านใหม่หลังลบเสมอ ***
   * ไม่งั้นคะแนนเฉลี่ยกับจำนวนรีวิวในตาราง stores จะค้างอยู่ค่าเดิม
   */
  async deleteReview(req: Request, res: Response): Promise<void> {
    const reviewId = paramId(req);
    const review = await reviewModel.findById(reviewId);
    if (!review) throw ApiError.notFound('ไม่พบรีวิวนี้');

    await reviewModel.remove(reviewId);
    await storeModel.refreshRating(review.store_id);

    ok(res, null, 'ลบรีวิวเรียบร้อยแล้ว');
  },

  /**
   * POST /api/admin/maintenance/expire-reservations
   * ปิดการจองที่หมดอายุแล้วคืนของกลับเข้าระบบ (ข้อค้าง 6)
   *
   * ปกติมี job ทำให้อัตโนมัติทุก 5 นาทีอยู่แล้ว (src/jobs/expireReservationsJob.ts)
   * endpoint นี้มีไว้ให้กดเร่งตอนทดสอบ จะได้ไม่ต้องนั่งรอ
   */
  async expireReservations(_req: Request, res: Response): Promise<void> {
    const count = await reservationService.expireOverdue();
    ok(res, { count }, `ปิดการจองที่หมดอายุแล้ว ${count} รายการ`);
  },
};

export default adminController;
