/**
 * foodController - คลังเมนูอาหารของร้าน (ทางเลือก A)
 * ทุก endpoint ในไฟล์นี้ใช้ได้เฉพาะ seller ที่เป็นเจ้าของร้านนั้นเท่านั้น
 */
import type { Request, Response } from 'express';
import type { Store, CreateFoodRequest, UpdateFoodRequest } from '@shared/index';

import ApiError from '../utils/ApiError';
import { ok, created } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { paramId } from '../utils/query';
import { uploadedFilename } from '../middleware/uploadMiddleware';

import foodModel from '../models/foodModel';
import storeModel from '../models/storeModel';

/**
 * ตัวช่วย: ดึงร้านของ seller ที่ login อยู่ ถ้าไม่มีหรือยังไม่อนุมัติให้ error
 * export ไว้ให้ postController และ reservationController ใช้ร่วมกัน
 */
export async function requireOwnStore(userId: number): Promise<Store> {
  const store = await storeModel.findByUserId(userId);
  if (!store) throw ApiError.notFound('คุณยังไม่มีร้านในระบบ');
  if (store.status !== 'approved') {
    throw ApiError.forbidden('ร้านของคุณยังไม่ได้รับการอนุมัติ จึงยังจัดการเมนูไม่ได้');
  }
  return store;
}

export const foodController = {
  /** GET /api/foods/my - เมนูทั้งหมดของร้านตัวเอง */
  async listMine(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const items = await foodModel.listByStore(store.store_id, { includeInactive: true });
    ok(res, items);
  },

  /** GET /api/foods/:id */
  async detail(req: Request, res: Response): Promise<void> {
    const food = await foodModel.findById(paramId(req));
    if (!food) throw ApiError.notFound('ไม่พบเมนูนี้');
    ok(res, food);
  },

  /** POST /api/foods - เพิ่มเมนูเข้าคลัง */
  async create(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const body = req.body as CreateFoodRequest;

    const foodId = await foodModel.create({
      storeId: store.store_id,
      name: body.name,
      normalPrice: Number(body.normalPrice),
      categoryId: body.categoryId === undefined ? undefined : Number(body.categoryId),
      description: body.description,
      image: uploadedFilename(req),
    });
    created(res, await foodModel.findById(foodId), 'เพิ่มเมนูเรียบร้อยแล้ว');
  },

  /** PUT /api/foods/:id */
  async update(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const foodId = paramId(req);

    const food = await foodModel.findById(foodId);
    if (!food) throw ApiError.notFound('ไม่พบเมนูนี้');
    if (food.store_id !== store.store_id) {
      throw ApiError.forbidden('คุณแก้ไขได้เฉพาะเมนูของร้านตัวเองเท่านั้น');
    }

    const body = req.body as UpdateFoodRequest;
    const updated = await foodModel.update(foodId, {
      name: body.name,
      description: body.description,
      normalPrice: body.normalPrice === undefined ? undefined : Number(body.normalPrice),
      categoryId: body.categoryId === undefined ? undefined : Number(body.categoryId),
      isActive: body.isActive,
      image: uploadedFilename(req),
    });
    ok(res, updated, 'แก้ไขเมนูเรียบร้อยแล้ว');
  },

  /** DELETE /api/foods/:id */
  async remove(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const foodId = paramId(req);

    const food = await foodModel.findById(foodId);
    if (!food) throw ApiError.notFound('ไม่พบเมนูนี้');
    if (food.store_id !== store.store_id) {
      throw ApiError.forbidden('คุณลบได้เฉพาะเมนูของร้านตัวเองเท่านั้น');
    }
    await foodModel.remove(foodId);
    ok(res, null, 'ลบเมนูเรียบร้อยแล้ว');
  },
};

export default foodController;
