/**
 * reservationController - การจองอาหาร
 * Logic จริงทั้งหมดอยู่ที่ services/reservationService.ts
 */
import type { Request, Response } from 'express';
import type { CreateReservationRequest, VerifyReservationRequest, ReservationStatus } from '@shared/index';

import { ok, created, paginated } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { qStr, paramId, pageParams } from '../utils/query';
import reservationService from '../services/reservationService';
import { requireOwnStore } from './foodController';

function parseStatus(value: unknown): ReservationStatus | '' {
  const text = qStr(value);
  const valid: readonly string[] = ['confirmed', 'waiting', 'completed', 'expired', 'cancelled'];
  return valid.includes(text) ? (text as ReservationStatus) : '';
}

export const reservationController = {
  /** POST /api/reservations - ลูกค้าจองอาหาร */
  async create(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const body = req.body as CreateReservationRequest;
    const result = await reservationService.create(user.userId, body);
    created(res, result, 'จองสำเร็จ อย่าลืมไปรับตามเวลานะ');
  },

  /** GET /api/reservations/my - ประวัติการจองของลูกค้า */
  async listMine(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const { page, limit } = pageParams(req);
    const { items, total } = await reservationService.listMine(user.userId, {
      status: parseStatus(req.query['status']), page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/reservations/:id */
  async detail(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const result = await reservationService.getById(paramId(req), user);
    ok(res, result);
  },

  /** GET /api/store/reservations - ร้านดูรายการจองที่เข้ามา */
  async listForStore(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const { page, limit } = pageParams(req);
    const { items, total } = await reservationService.listForStore(store.store_id, {
      status: parseStatus(req.query['status']), page, limit,
    });
    paginated(res, items, { page, limit, total });
  },

  /**
   * POST /api/reservations/verify - ร้านยืนยัน QR หรือรหัส 4 หลัก
   * *** กฎเหล็กข้อ 4 : ทุกครั้งที่สแกน ต้องมาผ่านตรงนี้เสมอ ***
   */
  async verify(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const body = req.body as VerifyReservationRequest;
    const result = await reservationService.verify(user.userId, body);
    ok(res, result, 'ยืนยันการรับอาหารเรียบร้อยแล้ว');
  },

  /** PUT /api/reservations/:id/cancel */
  async cancel(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const result = await reservationService.cancel(paramId(req), user);
    ok(res, result, 'ยกเลิกการจองเรียบร้อยแล้ว');
  },
};

export default reservationController;
