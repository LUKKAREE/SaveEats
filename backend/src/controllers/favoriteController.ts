/**
 * favoriteController - ร้านโปรดของลูกค้า
 *
 * ทุกเส้นทางในไฟล์นี้ต้อง login แล้ว เพราะรายการโปรดเป็นของแต่ละคน
 */
import type { Request, Response } from 'express';

import ApiError from '../utils/ApiError';
import { ok } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { qNum, paramId } from '../utils/query';

import favoriteModel from '../models/favoriteModel';
import storeModel from '../models/storeModel';
import locationService from '../services/locationService';

export const favoriteController = {
  /**
   * GET /api/favorites?lat=&lng=
   *
   * ส่งพิกัดมาด้วยก็ได้ จะได้ระยะทางติดกลับไปให้แสดงบนการ์ด ("120 ม.")
   * ไม่ส่งมาก็ยังใช้งานได้ แค่ไม่มีระยะทาง
   */
  async list(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const stores = await favoriteModel.listByUser(user.userId);

    const lat = qNum(req.query['lat']);
    const lng = qNum(req.query['lng']);

    const items = lat !== null && lng !== null
      ? locationService.attachDistance(stores, lat, lng)
      : stores;

    ok(res, items, `ร้านโปรด ${items.length} ร้าน`);
  },

  /** GET /api/favorites/ids - เลขร้านที่กดหัวใจไว้ (ใช้ตอนวาดหัวใจในรายการร้าน) */
  async listIds(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    ok(res, await favoriteModel.listStoreIds(user.userId));
  },

  /**
   * POST /api/favorites/:id - เพิ่มร้านเข้ารายการโปรด
   *
   * เช็คก่อนว่าร้านมีอยู่จริง ไม่งั้นจะเกิดแถวที่ชี้ไปหาร้านที่ไม่มีตัวตน
   */
  async add(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const storeId = paramId(req);

    const store = await storeModel.findById(storeId);
    if (!store) throw ApiError.notFound('ไม่พบร้านนี้');

    await favoriteModel.add(user.userId, storeId);
    ok(res, { store_id: storeId, is_favorite: true }, 'เพิ่มเข้ารายการโปรดแล้ว');
  },

  /** DELETE /api/favorites/:id - เอาร้านออกจากรายการโปรด */
  async remove(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const storeId = paramId(req);

    await favoriteModel.remove(user.userId, storeId);
    ok(res, { store_id: storeId, is_favorite: false }, 'เอาออกจากรายการโปรดแล้ว');
  },
};

export default favoriteController;
