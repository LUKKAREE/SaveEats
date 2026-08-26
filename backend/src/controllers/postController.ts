/**
 * postController - โพสต์ประกาศขายลง Feed
 */
import type { Request, Response } from 'express';
import type { CreatePostRequest, UpdatePostRequest, FeedSort, FeedItem, PostStatus } from '@shared/index';

import ApiError from '../utils/ApiError';
import { ok, created, paginated } from '../utils/response';
import { requireAuth } from '../utils/auth';
import { qStr, qNum, paramId, pageParams } from '../utils/query';
import { uploadedFilename } from '../middleware/uploadMiddleware';

import postModel from '../models/postModel';
import foodModel from '../models/foodModel';
import reservationModel from '../models/reservationModel';
import locationService from '../services/locationService';
import { requireOwnStore } from './foodController';

/** ตัวเลือกเรียงลำดับที่ยอมรับ (กันคนส่งค่าแปลก ๆ เข้ามา) */
const VALID_SORTS: readonly FeedSort[] = ['newest', 'price_asc', 'price_desc', 'rating', 'pickup'];

function parseSort(value: unknown): FeedSort {
  const text = qStr(value, 'newest');
  return (VALID_SORTS as readonly string[]).includes(text) ? (text as FeedSort) : 'newest';
}

export const postController = {
  /**
   * GET /api/posts - Feed หลัก
   * ตัวกรองที่รองรับ (ข้อค้าง 2)
   *   search / categoryId / maxPrice / storeId / sort / lat,lng / radius
   */
  async feed(req: Request, res: Response): Promise<void> {
    const { page, limit } = pageParams(req);
    const lat = qNum(req.query['lat']);
    const lng = qNum(req.query['lng']);
    const radius = qNum(req.query['radius']);

    const { items, total } = await postModel.listFeed({
      search: qStr(req.query['search']),
      categoryId: qNum(req.query['categoryId']),
      maxPrice: qNum(req.query['maxPrice']),
      storeId: qNum(req.query['storeId']),
      sort: parseSort(req.query['sort']),
      page,
      limit,
    });

    let result: Array<FeedItem & { distance_km?: number | null }> = items;
    if (lat !== null && lng !== null) {
      const withDistance = locationService.attachDistance(items, lat, lng);
      if (radius === null) {
        // ไม่ได้ส่ง radius มา = ผู้ใช้ปิดตัวกรอง "เฉพาะร้านใกล้ฉัน" ไว้
        // แนบระยะทางไปให้แสดงบนการ์ดเฉย ๆ ไม่กรองทิ้ง และไม่เรียงใหม่
        // (ต้องเคารพลำดับที่ผู้ใช้เลือกไว้ในช่อง "เรียงลำดับ")
        result = withDistance;
      } else {
        // ส่ง radius มา = กรองเฉพาะร้านในรัศมี แล้วเรียงจากใกล้ไปไกล
        result = withDistance.filter((p) => p.distance_km !== null && p.distance_km <= radius);
        result.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
      }
    }

    paginated(res, result, { page, limit, total });
  },

  /** GET /api/posts/:id */
  async detail(req: Request, res: Response): Promise<void> {
    const post = await postModel.findById(paramId(req));
    if (!post) throw ApiError.notFound('ไม่พบโพสต์นี้');
    ok(res, post);
  },

  /** GET /api/posts/my - โพสต์ทั้งหมดของร้านตัวเอง */
  async listMine(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const status = qStr(req.query['status']) as PostStatus | '';
    const items = await postModel.listByStore(store.store_id, { status });
    ok(res, items);
  },

  /** POST /api/posts - ร้านสร้างโพสต์ขาย */
  async create(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const body = req.body as CreatePostRequest;

    // เมนูที่เลือกต้องเป็นของร้านตัวเองเท่านั้น
    const food = await foodModel.findById(Number(body.foodId));
    if (!food) throw ApiError.notFound('ไม่พบเมนูที่เลือก');
    if (food.store_id !== store.store_id) {
      throw ApiError.forbidden('คุณโพสต์ได้เฉพาะเมนูของร้านตัวเองเท่านั้น');
    }
    if (Number(body.discountPrice) > Number(food.normal_price)) {
      throw ApiError.badRequest('ราคาที่ลดต้องไม่สูงกว่าราคาปกติ');
    }

    const postId = await postModel.create({
      storeId: store.store_id,
      foodId: food.food_id,
      caption: body.caption,
      image: uploadedFilename(req),
      discountPrice: Number(body.discountPrice),
      quantity: Number(body.quantity),
      pickupStart: body.pickupStart,
      pickupEnd: body.pickupEnd,
      holdMinutes: body.holdMinutes === undefined ? undefined : Number(body.holdMinutes),
    });
    created(res, await postModel.findById(postId), 'สร้างโพสต์เรียบร้อยแล้ว');
  },

  /** PUT /api/posts/:id */
  async update(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const postId = paramId(req);

    const post = await postModel.findById(postId);
    if (!post) throw ApiError.notFound('ไม่พบโพสต์นี้');
    if (post.store_id !== store.store_id) {
      throw ApiError.forbidden('คุณแก้ไขได้เฉพาะโพสต์ของร้านตัวเองเท่านั้น');
    }

    const body = req.body as UpdatePostRequest;
    const updated = await postModel.update(postId, {
      caption: body.caption,
      discountPrice: body.discountPrice === undefined ? undefined : Number(body.discountPrice),
      quantity: body.quantity === undefined ? undefined : Number(body.quantity),
      pickupStart: body.pickupStart,
      pickupEnd: body.pickupEnd,
      holdMinutes: body.holdMinutes === undefined ? undefined : Number(body.holdMinutes),
      status: body.status,
      image: uploadedFilename(req),
    });
    ok(res, updated, 'แก้ไขโพสต์เรียบร้อยแล้ว');
  },

  /**
   * DELETE /api/posts/:id
   *
   * *** ลบได้เฉพาะโพสต์ที่ยังไม่มีใครจองเท่านั้น ***
   *
   * ใน schema.sql ความสัมพันธ์เป็นแบบนี้ และเป็น ON DELETE CASCADE ทุกเส้น
   *     posts  ->  reservations  ->  reviews
   *
   * แปลว่าถ้าลบโพสต์ 1 โพสต์ ฐานข้อมูลจะลบการจองทั้งหมดของโพสต์นั้นตามไปด้วย
   * แล้วลากรีวิวที่ผูกกับการจองเหล่านั้นหายตามไปอีกทอด
   * ประวัติการขายของร้าน ประวัติการจองของลูกค้า และรีวิว หายพร้อมกันในคลิกเดียว
   * โดยที่ไม่มีอะไรเตือน และกู้กลับไม่ได้
   *
   * *** ทำไมการห้ามลบไม่ได้ทำให้ร้านเสียอะไร ***
   * โพสต์ที่หมดเวลาหายจากฝั่งลูกค้าไปเองอยู่แล้ว (listFeed กรอง pickup_end > NOW())
   * ร้านจึงไม่มีเหตุผลต้องลบเพื่อ "เอาออกจากสายตาลูกค้า"
   * เหลือแค่เหตุผลเรื่องความรกในหน้าจอตัวเอง ซึ่งแก้ด้วยแถบกรองในแอปแล้ว
   */
  async remove(req: Request, res: Response): Promise<void> {
    const store = await requireOwnStore(requireAuth(req).userId);
    const postId = paramId(req);

    const post = await postModel.findById(postId);
    if (!post) throw ApiError.notFound('ไม่พบโพสต์นี้');
    if (post.store_id !== store.store_id) {
      throw ApiError.forbidden('คุณลบได้เฉพาะโพสต์ของร้านตัวเองเท่านั้น');
    }

    const reservationCount = await reservationModel.countByPost(postId);
    if (reservationCount > 0) {
      throw ApiError.badRequest(
        `โพสต์นี้มีการจองอยู่ ${reservationCount} รายการ จึงลบไม่ได้ `
        + 'เพราะประวัติการจองและรีวิวของลูกค้าจะหายไปด้วย\n\n'
        + 'โพสต์ที่หมดเวลาจะไม่แสดงให้ลูกค้าเห็นอยู่แล้ว ปล่อยไว้ได้เลย'
      );
    }

    await postModel.remove(postId);
    ok(res, null, 'ลบโพสต์เรียบร้อยแล้ว');
  },
};

export default postController;
