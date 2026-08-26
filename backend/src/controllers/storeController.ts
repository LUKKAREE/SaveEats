import type { Request, Response } from 'express';
import type { UpdateStoreRequest } from '@shared/index';

import ApiError from '../utils/ApiError';
import { ok, paginated } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { qStr, qNum, qNumOr, paramId, pageParams } from '../utils/query';
import { uploadedFilename } from '../middleware/uploadMiddleware';
import env from '../config/env';

import storeModel from '../models/storeModel';
import foodModel from '../models/foodModel';
import postModel from '../models/postModel';
import locationService from '../services/locationService';
import behaviorScoreService from '../services/behaviorScoreService';

export const storeController = {
  /** GET /api/stores - รายการร้านที่อนุมัติแล้ว */
  async list(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const search = qStr(req.query['search']);
    const { items, total } = await storeModel.listApproved({ search, page, limit });
    paginated(res, items, { page, limit, total });
  },

  /** GET /api/stores/nearby?lat=..&lng=..&radius=.. */
  async nearby(req: Request, res: Response): Promise<void> {
    const lat = qNum(req.query['lat']);
    const lng = qNum(req.query['lng']);
    const radius = qNumOr(req.query['radius'], env.DEFAULT_SEARCH_RADIUS_KM);

    if (lat === null || lng === null) {
      throw ApiError.badRequest('กรุณาส่งพิกัด lat และ lng มาด้วย');
    }
    const items = await locationService.findNearbyStores(lat, lng, radius);
    ok(res, items, `พบร้านใกล้เคียง ${items.length} ร้าน`);
  },

  /** GET /api/stores/:id - รายละเอียดร้าน พร้อมโพสต์ที่กำลังขาย */
  async detail(req: Request, res: Response): Promise<void> {
    const storeId = paramId(req);
    const store = await storeModel.findById(storeId);
    if (!store || store.status !== 'approved') {
      throw ApiError.notFound('ไม่พบร้านนี้');
    }
    const posts = await postModel.listByStore(store.store_id, { status: 'active' });
    ok(res, { store, posts });
  },

  /** GET /api/stores/me - ร้านของ seller ที่ login อยู่ */
  async myStore(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const store = await storeModel.findByUserId(user.userId);
    if (!store) throw ApiError.notFound('คุณยังไม่มีร้านในระบบ');

    const foods = await foodModel.listByStore(store.store_id, { includeInactive: true });
    const behavior = await behaviorScoreService.getScore(store.store_id);
    ok(res, { store, foods, behavior });
  },

  /** PUT /api/stores/me - ร้านแก้ไขข้อมูลตัวเอง */
  async updateMyStore(req: Request, res: Response): Promise<void> {
    const user = requireAuth(req);
    const store = await storeModel.findByUserId(user.userId);
    if (!store) throw ApiError.notFound('คุณยังไม่มีร้านในระบบ');

    const body = req.body as UpdateStoreRequest;
    const updated = await storeModel.update(store.store_id, {
      ...body,
      latitude: body.latitude === undefined ? undefined : Number(body.latitude),
      longitude: body.longitude === undefined ? undefined : Number(body.longitude),
      image: uploadedFilename(req),
    });
    ok(res, updated, 'บันทึกข้อมูลร้านเรียบร้อยแล้ว');
  },
};

export default storeController;
